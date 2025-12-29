import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import {
  Goal,
  GoalMember,
  GoalTransaction,
  QuickSubmitButton,
} from "@/lib/types/goals";
import { verifyFirebaseToken } from "@/lib/auth-middleware";
import {
  validateString,
  validateAmount,
  validateDate,
  validateIconType,
  validateUrl,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
} from "@/lib/security-utils";
import { validateRequestSize } from "@/lib/request-size-middleware";
import { auditLog } from "@/lib/audit-logger";
import { validateCSRFToken } from "@/lib/csrf-middleware";
import { withRateLimit } from "@/lib/rate-limiter";

const db = admin.firestore();

// GET - Get single goal with members and recent transactions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const { user, error: tokenError } = await verifyFirebaseToken(request);
    if (tokenError) return tokenError;

    const { goalId } = await params;

    if (!goalId) {
      return NextResponse.json(
        { error: "Goal ID is required" },
        { status: 400 }
      );
    }

    // Get goal
    const goalDoc = await db.collection("goals").doc(goalId).get();

    if (!goalDoc.exists) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const goalData = goalDoc.data() as Goal;

    // Check if user is owner or member
    const memberDoc = await db
      .collection("goalMembers")
      .where("goalId", "==", goalId)
      .where("userId", "==", user!.uid)
      .limit(1)
      .get();

    if (memberDoc.empty && goalData.userId !== user!.uid) {
      return NextResponse.json(
        { error: "Unauthorized to view this goal" },
        { status: 403 }
      );
    }

    // Get members
    const membersSnapshot = await db
      .collection("goalMembers")
      .where("goalId", "==", goalId)
      .get();

    const memberPromises = membersSnapshot.docs.map(async (doc) => {
      const memberDataRaw = doc.data() as any;
      const userRecord = await admin.auth().getUser(memberDataRaw.userId);
      return {
        ...memberDataRaw,
        id: doc.id,
        joinedAt: memberDataRaw.joinedAt?.toDate() || new Date(),
        userProfile: {
          uid: userRecord.uid,
          email: userRecord.email || "",
          displayName: userRecord.displayName || null,
          photoURL: userRecord.photoURL || null,
          createdAt: userRecord.metadata.creationTime
            ? new Date(userRecord.metadata.creationTime)
            : new Date(),
        },
      };
    });

    const members = await Promise.all(memberPromises);

    // Get recent transactions (last 20)
    const transactionsSnapshot = await db
      .collection("goalTransactions")
      .where("goalId", "==", goalId)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const transactions: GoalTransaction[] = transactionsSnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate(),
        } as GoalTransaction)
    );

    // Get quick submit buttons
    const quickSubmitSnapshot = await db
      .collection("quickSubmitButtons")
      .where("goalId", "==", goalId)
      .orderBy("order", "asc")
      .get();

    const quickSubmitButtons: QuickSubmitButton[] =
      quickSubmitSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as QuickSubmitButton)
      );

    const goalDataRaw = goalDoc.data() as any;
    const goal: Goal = {
      ...goalDataRaw,
      id: goalDoc.id,
      createdAt: goalDataRaw.createdAt?.toDate() || new Date(),
      updatedAt: goalDataRaw.updatedAt?.toDate() || new Date(),
      targetDate: goalDataRaw.targetDate?.toDate(),
    };

    return NextResponse.json({
      goal,
      members,
      transactions,
      quickSubmitButtons,
    });
  } catch (error) {
    const { user: errorUser } = await verifyFirebaseToken(request).catch(
      () => ({ user: null, error: null })
    );
    await auditLog.error.server(
      request,
      errorUser?.uid,
      "/api/goals/[goalId]",
      "Failed to fetch goal details"
    );
    return NextResponse.json(
      { error: "Failed to fetch goal details" },
      { status: 500 }
    );
  }
}

// PUT - Update goal details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const { user, error: tokenError } = await verifyFirebaseToken(request);
    if (tokenError) return tokenError;

    const { goalId } = await params;

    // Validate CSRF token
    const csrfCheck = validateCSRFToken(request);
    if (csrfCheck) return csrfCheck;

    // Validate request body size
    const sizeCheck = validateRequestSize(request);
    if (sizeCheck) return sizeCheck;

    const body = await request.json();
    const { ...updates } = body;

    const goalRef = db.collection("goals").doc(goalId);
    const goalDoc = await goalRef.get();

    if (!goalDoc.exists) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const goalData = goalDoc.data() as Goal;

    // Check if user is owner or member
    const memberDoc = await db
      .collection("goalMembers")
      .where("goalId", "==", goalId)
      .where("userId", "==", user!.uid)
      .limit(1)
      .get();

    if (memberDoc.empty && goalData.userId !== user!.uid) {
      return NextResponse.json(
        { error: "Unauthorized to update this goal" },
        { status: 403 }
      );
    }

    // Validate and sanitize inputs
    const updateData: any = {
      updatedAt: admin.firestore.Timestamp.now(),
      lastUpdatedBy: user!.uid,
    };

    try {
      if (updates.title !== undefined) {
        updateData.title = validateString(
          updates.title,
          "Title",
          MAX_TITLE_LENGTH,
          true
        );
      }
      if (updates.description !== undefined) {
        updateData.description = validateString(
          updates.description,
          "Description",
          MAX_DESCRIPTION_LENGTH,
          false
        );
      }
      if (updates.targetAmount !== undefined) {
        updateData.targetAmount = validateAmount(updates.targetAmount);
      }
      if (updates.currentAmount !== undefined) {
        updateData.currentAmount = validateAmount(updates.currentAmount);
      }
      if (updates.targetDate !== undefined) {
        updateData.targetDate = updates.targetDate
          ? admin.firestore.Timestamp.fromDate(
              validateDate(updates.targetDate)!
            )
          : admin.firestore.FieldValue.delete();
      }
      if (updates.iconType !== undefined) {
        updateData.iconType = validateIconType(updates.iconType);
        // If iconType is set, validate related fields
        if (
          updateData.iconType === "phosphor" &&
          updates.iconName !== undefined
        ) {
          updateData.iconName = validateString(
            updates.iconName,
            "Icon name",
            100,
            true
          );
        }
        if (updateData.iconType === "custom" && updates.iconUrl !== undefined) {
          updateData.iconUrl = validateUrl(updates.iconUrl, true);
        }
      } else {
        // If iconType not being updated, validate iconName/iconUrl if provided
        if (updates.iconName !== undefined) {
          updateData.iconName = validateString(
            updates.iconName,
            "Icon name",
            100,
            true
          );
        }
        if (updates.iconUrl !== undefined) {
          updateData.iconUrl = validateUrl(updates.iconUrl, true);
        }
      }
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

    await goalRef.update(updateData);

    // Log goal update
    await auditLog.goal.update(request, user!.uid, goalId, true);

    const updatedGoalDoc = await goalRef.get();
    const updatedGoalData = updatedGoalDoc.data() as Goal;

    const updatedGoalDataRaw = updatedGoalDoc.data() as any;
    const goal: Goal = {
      ...updatedGoalDataRaw,
      id: updatedGoalDoc.id,
      createdAt: updatedGoalDataRaw.createdAt?.toDate() || new Date(),
      updatedAt: updatedGoalDataRaw.updatedAt?.toDate() || new Date(),
      targetDate: updatedGoalDataRaw.targetDate?.toDate(),
    };

    return NextResponse.json({ goal });
  } catch (error) {
    const { user: errorUser } = await verifyFirebaseToken(request).catch(
      () => ({ user: null, error: null })
    );
    await auditLog.error.server(
      request,
      errorUser?.uid,
      "/api/goals/[goalId]",
      "Failed to update goal"
    );
    return NextResponse.json(
      { error: "Failed to update goal" },
      { status: 500 }
    );
  }
}

// DELETE - Delete goal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const { user, error: tokenError } = await verifyFirebaseToken(request);
    if (tokenError) return tokenError;

    // Validate CSRF token
    const csrfCheck = validateCSRFToken(request);
    if (csrfCheck) return csrfCheck;

    const { goalId } = await params;

    const goalRef = db.collection("goals").doc(goalId);
    const goalDoc = await goalRef.get();

    if (!goalDoc.exists) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const goalData = goalDoc.data() as Goal;

    // Only owner can delete
    if (goalData.userId !== user!.uid) {
      return NextResponse.json(
        { error: "Unauthorized to delete this goal" },
        { status: 403 }
      );
    }

    // Delete related data
    const batch = db.batch();

    // Delete goal
    batch.delete(goalRef);

    // Delete members
    const membersSnapshot = await db
      .collection("goalMembers")
      .where("goalId", "==", goalId)
      .get();
    membersSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

    // Delete requests
    const requestsSnapshot = await db
      .collection("goalRequests")
      .where("goalId", "==", goalId)
      .get();
    requestsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

    // Delete transactions
    const transactionsSnapshot = await db
      .collection("goalTransactions")
      .where("goalId", "==", goalId)
      .get();
    transactionsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

    // Delete quick submit buttons
    const quickSubmitSnapshot = await db
      .collection("quickSubmitButtons")
      .where("goalId", "==", goalId)
      .get();
    quickSubmitSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

    await batch.commit();

    // Log goal deletion
    await auditLog.goal.delete(request, user!.uid, goalId, true);

    return NextResponse.json({ success: true });
  } catch (error) {
    const { user: errorUser } = await verifyFirebaseToken(request).catch(
      () => ({ user: null, error: null })
    );
    await auditLog.error.server(
      request,
      errorUser?.uid,
      "/api/goals/[goalId]",
      "Failed to delete goal"
    );
    return NextResponse.json(
      { error: "Failed to delete goal" },
      { status: 500 }
    );
  }
}
