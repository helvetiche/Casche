import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { GoalTransaction, Goal } from "@/lib/types/goals";
import {
  verifyFirebaseToken,
  addRateLimitHeaders,
} from "@/lib/auth-middleware";
import {
  validateAmount,
  validateTransactionType,
  validateString,
  MAX_MESSAGE_LENGTH,
} from "@/lib/security-utils";
import { withRateLimit } from "@/lib/rate-limiter";
import { auditLog } from "@/lib/audit-logger";
import { validateRequestSize } from "@/lib/request-size-middleware";
import { validateCSRFToken } from "@/lib/csrf-middleware";

const db = admin.firestore();

// GET - Get all transactions for a goal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  let user: { uid: string; email?: string; displayName?: string } | null = null;
  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await verifyFirebaseToken(request);
    if (authResult.error) return authResult.error;
    user = authResult.user;

    const { goalId } = await params;

    if (!goalId) {
      return NextResponse.json(
        { error: "Goal ID is required" },
        { status: 400 }
      );
    }

    // Check if user is owner or member
    const goalDoc = await db.collection("goals").doc(goalId).get();

    if (!goalDoc.exists) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const goalData = goalDoc.data() as Goal;

    const memberDoc = await db
      .collection("goalMembers")
      .where("goalId", "==", goalId)
      .where("userId", "==", user!.uid)
      .limit(1)
      .get();

    if (memberDoc.empty && goalData.userId !== user!.uid) {
      return NextResponse.json(
        { error: "Unauthorized to view transactions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit") || "50";
    // Validate and cap limit parameter to prevent DoS
    const limit = Math.min(Math.max(1, parseInt(limitParam) || 50), 100);

    const transactionsSnapshot = await db
      .collection("goalTransactions")
      .where("goalId", "==", goalId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const transactions: GoalTransaction[] = transactionsSnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate(),
        } as GoalTransaction)
    );

    const response = NextResponse.json({ transactions });
    return await addRateLimitHeaders(response, request, user!.uid);
  } catch (error) {
    await auditLog.error.server(
      request,
      user?.uid,
      "/api/goals/[goalId]/transactions",
      "Failed to fetch transactions"
    );
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

// POST - Add deposit/withdrawal transaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  let user: { uid: string; email?: string; displayName?: string } | null = null;
  try {
    // Apply rate limiting (stricter for transactions)
    const rateLimitResponse = await withRateLimit(request, undefined, {
      requests: 20,
      windowMs: 60 * 1000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await verifyFirebaseToken(request);
    if (authResult.error) return authResult.error;
    user = authResult.user;

    const { goalId } = await params;

    // Validate CSRF token
    const csrfCheck = validateCSRFToken(request);
    if (csrfCheck) return csrfCheck;

    // Validate request body size
    const sizeCheck = validateRequestSize(request);
    if (sizeCheck) return sizeCheck;

    const body = await request.json();
    const { type, amount, description } = body;

    // Validate input
    let validatedType: "deposit" | "withdrawal";
    let validatedAmount: number;
    let validatedDescription: string;

    try {
      if (!type || amount === undefined || amount === null) {
        return NextResponse.json(
          { error: "Type and amount are required" },
          { status: 400 }
        );
      }

      validatedType = validateTransactionType(type);
      validatedAmount = validateAmount(amount);
      validatedDescription = description
        ? validateString(description, "Description", MAX_MESSAGE_LENGTH, false)
        : "";
    } catch (validationError) {
      return NextResponse.json(
        {
          error:
            validationError instanceof Error
              ? validationError.message
              : "Invalid input",
        },
        { status: 400 }
      );
    }

    // Check if user is owner or member
    const goalRef = db.collection("goals").doc(goalId);
    const goalDoc = await goalRef.get();

    if (!goalDoc.exists) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const goalData = goalDoc.data() as Goal;

    const memberDoc = await db
      .collection("goalMembers")
      .where("goalId", "==", goalId)
      .where("userId", "==", user!.uid)
      .limit(1)
      .get();

    if (memberDoc.empty && goalData.userId !== user!.uid) {
      return NextResponse.json(
        { error: "Unauthorized to add transactions" },
        { status: 403 }
      );
    }

    const now = admin.firestore.Timestamp.now();

    // Calculate new current amount
    let newCurrentAmount = goalData.currentAmount || 0;
    if (validatedType === "deposit") {
      newCurrentAmount += validatedAmount;
    } else {
      // withdrawal
      newCurrentAmount = Math.max(0, newCurrentAmount - validatedAmount);
    }

    // Create transaction
    const transactionRef = db.collection("goalTransactions").doc();
    const transactionDataForFirestore = {
      goalId,
      userId: user!.uid,
      type: validatedType,
      amount: validatedAmount,
      description: validatedDescription,
      createdAt: now,
    };

    await transactionRef.set(transactionDataForFirestore);

    // Update goal current amount
    await goalRef.update({
      currentAmount: newCurrentAmount,
      updatedAt: now,
      lastUpdatedBy: user!.uid,
    });

    // Fetch updated goal
    const updatedGoalDoc = await goalRef.get();
    const updatedGoalDataRaw = updatedGoalDoc.data() as any;

    const transaction: GoalTransaction = {
      id: transactionRef.id,
      goalId,
      userId: user!.uid,
      type: validatedType,
      amount: validatedAmount,
      description: validatedDescription,
      createdAt: now.toDate(),
    };

    const goal: Goal = {
      ...updatedGoalDataRaw,
      id: updatedGoalDoc.id,
      createdAt: updatedGoalDataRaw.createdAt?.toDate() || new Date(),
      updatedAt: updatedGoalDataRaw.updatedAt?.toDate() || new Date(),
      targetDate: updatedGoalDataRaw.targetDate?.toDate(),
    };

    // Log transaction creation
    await auditLog.transaction.create(
      request,
      user!.uid,
      transactionRef.id,
      goalId,
      validatedAmount,
      validatedType,
      true
    );

    const response = NextResponse.json({ transaction, goal }, { status: 201 });
    return await addRateLimitHeaders(response, request, user!.uid);
  } catch (error) {
    // Don't expose internal error details
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}
