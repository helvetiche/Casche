import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { Goal, GoalMember } from "@/lib/types/goals";
import {
  verifyFirebaseToken,
  verifyUserAuthorization,
  addRateLimitHeaders,
} from "@/lib/auth-middleware";
import { auditLog } from "@/lib/audit-logger";
import {
  validateString,
  validateAmount,
  validateUrl,
  validateDate,
  validateIconType,
  validateUserId,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
} from "@/lib/security-utils";
import { withRateLimit } from "@/lib/rate-limiter";
import { validateRequestSize } from "@/lib/request-size-middleware";
import { validateCSRFToken } from "@/lib/csrf-middleware";

const db = admin.firestore();

// GET - Fetch user's goals (owned + shared)
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const { user, error: tokenError } = await verifyFirebaseToken(request);
    if (tokenError) return tokenError;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const authorizationError = await verifyUserAuthorization(
      user!.uid,
      userId,
      request
    );
    if (authorizationError) return authorizationError;

    // Get goals owned by user
    const ownedGoalsSnapshot = await db
      .collection("goals")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    // Get goals where user is a member
    const memberGoalsSnapshot = await db
      .collection("goalMembers")
      .where("userId", "==", userId)
      .get();

    const memberGoalIds = memberGoalsSnapshot.docs.map(
      (doc) => doc.data().goalId
    );

    const sharedGoalsSnapshot =
      memberGoalIds.length > 0
        ? await db
            .collection("goals")
            .where(admin.firestore.FieldPath.documentId(), "in", memberGoalIds)
            .get()
        : { docs: [] };

    // Combine and format goals
    const goals: Goal[] = [];

    ownedGoalsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      goals.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        targetDate: data.targetDate?.toDate(),
      } as Goal);
    });

    sharedGoalsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      goals.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        targetDate: data.targetDate?.toDate(),
      } as Goal);
    });

    // Remove duplicates
    const uniqueGoals = Array.from(
      new Map(goals.map((goal) => [goal.id, goal])).values()
    );

    // Fetch all members for all goals in a single query (more efficient)
    const goalIds = uniqueGoals.map((goal) => goal.id);

    if (goalIds.length === 0) {
      return NextResponse.json({ goals: [] });
    }

    // Batch fetch members - Firestore 'in' query supports up to 10 items
    // So we need to batch if there are more than 10 goals
    const batchSize = 10;
    const memberBatches: Promise<any[]>[] = [];

    for (let i = 0; i < goalIds.length; i += batchSize) {
      const batch = goalIds.slice(i, i + batchSize);
      const batchPromise = Promise.all(
        batch.map(async (goalId) => {
          const membersSnapshot = await db
            .collection("goalMembers")
            .where("goalId", "==", goalId)
            .get();

          const members = await Promise.all(
            membersSnapshot.docs.map(async (doc) => {
              const memberData = doc.data();
              const userRecord = await admin.auth().getUser(memberData.userId);
              return {
                id: doc.id,
                goalId: memberData.goalId,
                userId: memberData.userId,
                role: memberData.role,
                joinedAt: memberData.joinedAt?.toDate() || new Date(),
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
            })
          );
          return { goalId, members };
        })
      );
      memberBatches.push(batchPromise);
    }

    const allMembersResults = await Promise.all(memberBatches);
    const membersMap = new Map<string, any[]>();

    allMembersResults.flat().forEach(({ goalId, members }) => {
      membersMap.set(goalId, members);
    });

    // Attach members to goals
    const goalsWithMembers = uniqueGoals.map((goal) => ({
      ...goal,
      members: membersMap.get(goal.id) || [],
    }));

    const response = NextResponse.json({ goals: goalsWithMembers });
    return await addRateLimitHeaders(response, request, user!.uid);
  } catch (error) {
    // Don't expose internal error details
    return NextResponse.json(
      { error: "Failed to fetch goals" },
      { status: 500 }
    );
  }
}

// POST - Create new goal
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const { user, error: tokenError } = await verifyFirebaseToken(request);
    if (tokenError) return tokenError;

    // Validate CSRF token
    const csrfCheck = validateCSRFToken(request);
    if (csrfCheck) return csrfCheck;

    // Validate request body size
    const sizeCheck = validateRequestSize(request);
    if (sizeCheck) return sizeCheck;

    const body = await request.json();
    const {
      title,
      description,
      targetAmount,
      targetDate,
      iconType,
      iconName,
      iconUrl,
      friendIds,
    } = body;

    // Validate and sanitize inputs
    let validatedTitle: string;
    let validatedDescription: string;
    let validatedTargetAmount: number;
    let validatedTargetDate: Date | null = null;
    let validatedIconType: "phosphor" | "custom";
    let validatedIconName: string | undefined;
    let validatedIconUrl: string | undefined;

    try {
      validatedTitle = validateString(title, "Title", MAX_TITLE_LENGTH, true);
      validatedDescription = validateString(
        description,
        "Description",
        MAX_DESCRIPTION_LENGTH,
        false
      );
      validatedTargetAmount = validateAmount(targetAmount);
      validatedTargetDate = targetDate ? validateDate(targetDate) : null;
      validatedIconType = validateIconType(iconType);

      if (validatedIconType === "phosphor") {
        if (!iconName) {
          return NextResponse.json(
            { error: "Icon name is required for Phosphor icons" },
            { status: 400 }
          );
        }
        validatedIconName = validateString(iconName, "Icon name", 100, true);
      }

      if (validatedIconType === "custom") {
        if (!iconUrl) {
          return NextResponse.json(
            { error: "Icon URL is required for custom icons" },
            { status: 400 }
          );
        }
        validatedIconUrl = validateUrl(iconUrl, true);
      }

      // Validate friendIds if provided
      if (friendIds && Array.isArray(friendIds)) {
        if (friendIds.length > 50) {
          return NextResponse.json(
            { error: "Cannot share with more than 50 friends at once" },
            { status: 400 }
          );
        }
        // Validate each friend ID
        for (const friendId of friendIds) {
          validateUserId(friendId);
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

    const now = admin.firestore.Timestamp.now();
    const goalRef = db.collection("goals").doc();

    const goalDataForFirestore: any = {
      userId: user!.uid,
      title: validatedTitle,
      description: validatedDescription,
      targetAmount: validatedTargetAmount,
      currentAmount: 0,
      iconType: validatedIconType,
      createdAt: now,
      updatedAt: now,
      lastUpdatedBy: user!.uid,
    };

    // Only include optional fields if they have values
    if (validatedTargetDate) {
      goalDataForFirestore.targetDate =
        admin.firestore.Timestamp.fromDate(validatedTargetDate);
    }

    if (validatedIconType === "phosphor" && validatedIconName) {
      goalDataForFirestore.iconName = validatedIconName;
    }

    if (validatedIconType === "custom" && validatedIconUrl) {
      goalDataForFirestore.iconUrl = validatedIconUrl;
    }

    await goalRef.set(goalDataForFirestore);

    // Add owner as member
    await db.collection("goalMembers").add({
      goalId: goalRef.id,
      userId: user!.uid,
      role: "owner",
      joinedAt: now,
    });

    // Log goal creation
    await auditLog.goal.create(request, user!.uid, goalRef.id, true);

    // If friendIds provided, create sharing requests
    if (friendIds && Array.isArray(friendIds) && friendIds.length > 0) {
      const requestPromises = friendIds.map((friendId: string) =>
        db.collection("goalRequests").add({
          goalId: goalRef.id,
          fromUserId: user!.uid,
          toUserId: friendId,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        })
      );
      await Promise.all(requestPromises);
    }

    const goal: Goal = {
      ...goalDataForFirestore,
      id: goalRef.id,
      createdAt: goalDataForFirestore.createdAt.toDate(),
      updatedAt: goalDataForFirestore.updatedAt.toDate(),
      targetDate: goalDataForFirestore.targetDate?.toDate(),
    };

    const response = NextResponse.json({ goal }, { status: 201 });
    return await addRateLimitHeaders(response, request, user!.uid);
  } catch (error) {
    // Don't expose internal error details
    return NextResponse.json(
      { error: "Failed to create goal" },
      { status: 500 }
    );
  }
}

// PUT - Update goal
export async function PUT(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const { user, error: tokenError } = await verifyFirebaseToken(request);
    if (tokenError) return tokenError;

    // Validate CSRF token
    const csrfCheck = validateCSRFToken(request);
    if (csrfCheck) return csrfCheck;

    // Validate request body size
    const sizeCheck = validateRequestSize(request);
    if (sizeCheck) return sizeCheck;

    const body = await request.json();
    const { goalId, ...updates } = body;

    if (!goalId) {
      return NextResponse.json(
        { error: "Goal ID is required" },
        { status: 400 }
      );
    }

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

    const response = NextResponse.json({ goal });
    return await addRateLimitHeaders(response, request, user!.uid);
  } catch (error) {
    // Don't expose internal error details
    return NextResponse.json(
      { error: "Failed to update goal" },
      { status: 500 }
    );
  }
}

// DELETE - Delete goal
export async function DELETE(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const { user, error: tokenError } = await verifyFirebaseToken(request);
    if (tokenError) return tokenError;

    // Validate CSRF token
    const csrfCheck = validateCSRFToken(request);
    if (csrfCheck) return csrfCheck;

    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get("goalId");

    if (!goalId) {
      return NextResponse.json(
        { error: "Goal ID is required" },
        { status: 400 }
      );
    }

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

    const response = NextResponse.json({ success: true });
    return await addRateLimitHeaders(response, request, user!.uid);
  } catch (error) {
    // Don't expose internal error details
    return NextResponse.json(
      { error: "Failed to delete goal" },
      { status: 500 }
    );
  }
}
