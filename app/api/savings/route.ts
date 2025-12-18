import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { SavingsGoal } from "@/lib/types/savings";
import {
  verifyFirebaseToken,
  verifyUserAuthorization,
} from "@/lib/auth-middleware";

const db = admin.firestore();

// GET - Fetch user's savings goals
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

    // Verify user authorization - users can only view their own goals
    const authorizationError = verifyUserAuthorization(user!.uid, userId);
    if (authorizationError) return authorizationError;

    const snapshot = await db
      .collection("savingsGoals")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const goals = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        title: data.title,
        description: data.description || "",
        targetAmount: data.targetAmount,
        currentAmount: data.currentAmount || 0,
        targetDate: data.targetDate
          ? new Date(data.targetDate.seconds * 1000)
          : null,
        category: data.category || "",
        isPublic: data.isPublic || false,
        createdAt: new Date(data.createdAt.seconds * 1000),
        updatedAt: new Date(data.updatedAt.seconds * 1000),
      };
    });

    return NextResponse.json({ goals });
  } catch (error) {
    console.error("Error fetching savings goals:", error);
    return NextResponse.json(
      { error: "Failed to fetch savings goals" },
      { status: 500 }
    );
  }
}

// POST - Create new savings goal
export async function POST(request: NextRequest) {
  try {
    // Verify Firebase authentication
    const { user, error: authError } = await verifyFirebaseToken(request);
    if (authError) return authError;

    const body = await request.json();
    const {
      userId,
      title,
      description,
      targetAmount,
      targetDate,
      category,
      isPublic,
    } = body;

    console.log("API received:", { userId, title, targetAmount, hasUserId: !!userId, hasTitle: !!title, hasTargetAmount: !!targetAmount, body });

    if (!userId || !title || !targetAmount) {
      console.log("Missing fields:", { userId: !!userId, title: !!title, targetAmount: !!targetAmount });
      return NextResponse.json(
        { error: "Missing required fields: userId, title, targetAmount" },
        { status: 400 }
      );
    }

    // Verify user authorization - users can only create goals for themselves
    const authorizationError = verifyUserAuthorization(user!.uid, userId);
    if (authorizationError) return authorizationError;

    const now = admin.firestore.FieldValue.serverTimestamp();

    const goalRef = db.collection("savingsGoals").doc();
    const goalData = {
      userId,
      title,
      description: description || "",
      targetAmount: Number(targetAmount),
      currentAmount: 0,
      targetDate: targetDate ? new Date(targetDate) : null,
      category: category || "",
      isPublic: isPublic || false,
      createdAt: now,
      updatedAt: now,
    };

    await goalRef.set(goalData);

    const goal = {
      id: goalRef.id,
      ...goalData,
      targetDate: targetDate ? new Date(targetDate) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    console.error("Error creating savings goal:", error);
    return NextResponse.json(
      { error: "Failed to create savings goal" },
      { status: 500 }
    );
  }
}

// PUT - Update savings goal
export async function PUT(request: NextRequest) {
  try {
    // Verify Firebase authentication
    const { user, error: authError } = await verifyFirebaseToken(request);
    if (authError) return authError;

    const body = await request.json();
    const {
      goalId,
      userId,
      title,
      description,
      targetAmount,
      targetDate,
      category,
      isPublic,
      currentAmount,
    } = body;

    if (!goalId || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: goalId, userId" },
        { status: 400 }
      );
    }

    // Verify user authorization - users can only update their own goals
    const authorizationError = verifyUserAuthorization(user!.uid, userId);
    if (authorizationError) return authorizationError;

    const goalRef = db.collection("savingsGoals").doc(goalId);
    const goalDoc = await goalRef.get();

    if (!goalDoc.exists) {
      return NextResponse.json(
        { error: "Savings goal not found" },
        { status: 404 }
      );
    }

    const goalData = goalDoc.data();
    if (goalData?.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized to update this goal" },
        { status: 403 }
      );
    }

    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (targetAmount !== undefined)
      updateData.targetAmount = Number(targetAmount);
    if (currentAmount !== undefined)
      updateData.currentAmount = Number(currentAmount);
    if (targetDate !== undefined)
      updateData.targetDate = targetDate ? new Date(targetDate) : null;
    if (category !== undefined) updateData.category = category;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    await goalRef.update(updateData);

    // Fetch updated goal
    const updatedDoc = await goalRef.get();
    const updatedData = updatedDoc.data();

    const updatedGoal = {
      id: goalId,
      userId: updatedData!.userId,
      title: updatedData!.title,
      description: updatedData!.description || "",
      targetAmount: updatedData!.targetAmount,
      currentAmount: updatedData!.currentAmount || 0,
      targetDate: updatedData!.targetDate
        ? new Date(updatedData!.targetDate.seconds * 1000)
        : null,
      category: updatedData!.category || "",
      isPublic: updatedData!.isPublic || false,
      createdAt: new Date(updatedData!.createdAt.seconds * 1000),
      updatedAt: new Date(updatedData!.updatedAt.seconds * 1000),
    };

    return NextResponse.json({ goal: updatedGoal });
  } catch (error) {
    console.error("Error updating savings goal:", error);
    return NextResponse.json(
      { error: "Failed to update savings goal" },
      { status: 500 }
    );
  }
}

// DELETE - Delete savings goal
export async function DELETE(request: NextRequest) {
  try {
    // Verify Firebase authentication
    const { user, error: authError } = await verifyFirebaseToken(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get("goalId");
    const userId = searchParams.get("userId");

    if (!goalId || !userId) {
      return NextResponse.json(
        { error: "Missing required parameters: goalId, userId" },
        { status: 400 }
      );
    }

    // Verify user authorization - users can only delete their own goals
    const authorizationError = verifyUserAuthorization(user!.uid, userId);
    if (authorizationError) return authorizationError;

    const goalRef = db.collection("savingsGoals").doc(goalId);
    const goalDoc = await goalRef.get();

    if (!goalDoc.exists) {
      return NextResponse.json(
        { error: "Savings goal not found" },
        { status: 404 }
      );
    }

    const goalData = goalDoc.data();
    if (goalData?.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized to delete this goal" },
        { status: 403 }
      );
    }

    // Delete associated sharing requests
    const sharingRequests = await db
      .collection("savingsGoalRequests")
      .where("savingsGoalId", "==", goalId)
      .get();

    const batch = db.batch();
    batch.delete(goalRef);
    sharingRequests.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting savings goal:", error);
    return NextResponse.json(
      { error: "Failed to delete savings goal" },
      { status: 500 }
    );
  }
}
