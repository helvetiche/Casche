import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { GoalTransaction, Goal } from "@/lib/types/goals";
import {
  verifyFirebaseToken,
  verifyUserAuthorization,
} from "@/lib/auth-middleware";
import { withRateLimit } from "@/lib/rate-limiter";
import { auditLog } from "@/lib/audit-logger";

const db = admin.firestore();

// GET - Get all transactions for a user across all goals
export async function GET(request: NextRequest) {
  let user: { uid: string; email?: string; displayName?: string } | null = null;
  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await verifyFirebaseToken(request);
    if (authResult.error) return authResult.error;
    user = authResult.user;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authorizationError = await verifyUserAuthorization(
      user.uid,
      userId,
      request
    );
    if (authorizationError) return authorizationError;

    // Get all goals owned by user or where user is a member
    const ownedGoalsSnapshot = await db
      .collection("goals")
      .where("userId", "==", userId)
      .get();

    const memberGoalsSnapshot = await db
      .collection("goalMembers")
      .where("userId", "==", userId)
      .get();

    const memberGoalIds = memberGoalsSnapshot.docs.map(
      (doc) => doc.data().goalId
    );

    const ownedGoalIds = ownedGoalsSnapshot.docs.map((doc) => doc.id);
    const allGoalIds = [...new Set([...ownedGoalIds, ...memberGoalIds])];

    if (allGoalIds.length === 0) {
      return NextResponse.json({ transactions: [], goals: [] });
    }

    // Fetch all transactions for these goals
    // Firestore 'in' query supports up to 10 items, so we need to batch
    const batchSize = 10;
    const transactionBatches: Promise<any[]>[] = [];

    for (let i = 0; i < allGoalIds.length; i += batchSize) {
      const batch = allGoalIds.slice(i, i + batchSize);
      const batchPromise = Promise.all(
        batch.map(async (goalId) => {
          const transactionsSnapshot = await db
            .collection("goalTransactions")
            .where("goalId", "==", goalId)
            .get();

          return transactionsSnapshot.docs.map((doc) => {
            const data = doc.data();
            const createdAt = data.createdAt?.toDate
              ? data.createdAt.toDate()
              : data.createdAt instanceof Date
              ? data.createdAt
              : new Date();

            return {
              id: doc.id,
              ...data,
              createdAt,
            };
          });
        })
      );
      transactionBatches.push(batchPromise);
    }

    const allTransactionsResults = await Promise.all(transactionBatches);
    const allTransactionsFlat = allTransactionsResults.flat().flat();
    // Logging removed for security - don't expose internal data

    const transactions: GoalTransaction[] = allTransactionsFlat.map((tx) => {
      const createdAt =
        tx.createdAt instanceof Date
          ? tx.createdAt
          : tx.createdAt?.toDate
          ? tx.createdAt.toDate()
          : new Date(tx.createdAt);

      return {
        id: tx.id,
        goalId: tx.goalId,
        userId: tx.userId,
        type: tx.type,
        amount: tx.amount,
        description: tx.description || "",
        createdAt,
      } as GoalTransaction;
    });

    // Sort by date descending
    transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Fetch goal details for reference
    const goalsMap = new Map<string, Goal>();
    const allGoalsSnapshot = await Promise.all(
      allGoalIds.map((goalId) => db.collection("goals").doc(goalId).get())
    );

    allGoalsSnapshot.forEach((doc) => {
      if (doc.exists) {
        const data = doc.data() as any;
        const createdAt = data.createdAt?.toDate
          ? data.createdAt.toDate()
          : data.createdAt instanceof Date
          ? data.createdAt
          : new Date();
        const updatedAt = data.updatedAt?.toDate
          ? data.updatedAt.toDate()
          : data.updatedAt instanceof Date
          ? data.updatedAt
          : new Date();
        const targetDate = data.targetDate?.toDate
          ? data.targetDate.toDate()
          : data.targetDate instanceof Date
          ? data.targetDate
          : undefined;

        goalsMap.set(doc.id, {
          ...data,
          id: doc.id,
          createdAt,
          updatedAt,
          targetDate,
        } as Goal);
      }
    });

    return NextResponse.json({
      transactions,
      goals: Array.from(goalsMap.values()),
    });
  } catch (error) {
    await auditLog.error.server(
      request,
      user?.uid,
      "/api/analytics/transactions",
      "Failed to fetch transactions"
    );
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
