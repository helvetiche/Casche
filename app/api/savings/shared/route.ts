import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { SharedSavingsGoal, SavingsGoal } from "@/lib/types/savings";
import {
  verifyFirebaseToken,
  verifyUserAuthorization,
} from "@/lib/auth-middleware";

const db = admin.firestore();

// GET - Fetch shared savings goals for a user
export async function GET(request: NextRequest) {
  try {
    // Verify Firebase authentication
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

    // Verify user authorization - users can only view their own shared goals
    const authorizationError = verifyUserAuthorization(user!.uid, userId);
    if (authorizationError) return authorizationError;

    // Get shared goals where user is the recipient
    const sharedSnapshot = await db
      .collection("sharedSavingsGoals")
      .where("sharedWithId", "==", userId)
      .where("status", "==", "active")
      .get();

    const sharedGoals = await Promise.all(
      sharedSnapshot.docs.map(async (doc) => {
        const data = doc.data();

        // Fetch the savings goal
        const goalDoc = await db
          .collection("savingsGoals")
          .doc(data.savingsGoalId)
          .get();
        const goalData = goalDoc.data();

        if (!goalData) {
          return null; // Goal might have been deleted
        }

        // Fetch owner profile
        const ownerUser = await admin.auth().getUser(data.ownerId);

        const savingsGoal: SavingsGoal = {
          id: goalDoc.id,
          userId: goalData.userId,
          title: goalData.title,
          description: goalData.description || "",
          targetAmount: goalData.targetAmount,
          currentAmount: goalData.currentAmount || 0,
          targetDate: goalData.targetDate
            ? new Date(goalData.targetDate.seconds * 1000)
            : undefined,
          category: goalData.category || "",
          isPublic: goalData.isPublic || false,
          createdAt: new Date(goalData.createdAt.seconds * 1000),
          updatedAt: new Date(goalData.updatedAt.seconds * 1000),
        };

        const sharedGoal: SharedSavingsGoal = {
          id: doc.id,
          savingsGoal,
          ownerProfile: {
            uid: ownerUser.uid,
            email: ownerUser.email || "",
            displayName: ownerUser.displayName || null,
            photoURL: ownerUser.photoURL || null,
            createdAt: ownerUser.metadata.creationTime
              ? new Date(ownerUser.metadata.creationTime)
              : new Date(),
          },
          sharedAt: new Date(data.sharedAt.seconds * 1000),
          status: data.status,
        };

        return sharedGoal;
      })
    );

    // Filter out null values (deleted goals)
    const validSharedGoals = sharedGoals.filter((goal) => goal !== null);

    return NextResponse.json({ sharedGoals: validSharedGoals });
  } catch (error) {
    console.error("Error fetching shared savings goals:", error);
    return NextResponse.json(
      { error: "Failed to fetch shared savings goals" },
      { status: 500 }
    );
  }
}

// DELETE - Stop sharing a savings goal (remove from shared list)
export async function DELETE(request: NextRequest) {
  try {
    // Verify Firebase authentication
    const { user, error: authError } = await verifyFirebaseToken(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const sharedGoalId = searchParams.get("sharedGoalId");
    const userId = searchParams.get("userId");

    if (!sharedGoalId || !userId) {
      return NextResponse.json(
        { error: "Missing required parameters: sharedGoalId, userId" },
        { status: 400 }
      );
    }

    // Verify user authorization - users can only remove their own shared goals
    const authorizationError = verifyUserAuthorization(user!.uid, userId);
    if (authorizationError) return authorizationError;

    const sharedGoalRef = db.collection("sharedSavingsGoals").doc(sharedGoalId);
    const sharedGoalDoc = await sharedGoalRef.get();

    if (!sharedGoalDoc.exists) {
      return NextResponse.json(
        { error: "Shared savings goal not found" },
        { status: 404 }
      );
    }

    const sharedGoalData = sharedGoalDoc.data();
    if (sharedGoalData?.sharedWithId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized to remove this shared goal" },
        { status: 403 }
      );
    }

    await sharedGoalRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing shared savings goal:", error);
    return NextResponse.json(
      { error: "Failed to remove shared savings goal" },
      { status: 500 }
    );
  }
}
