import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import {
  SavingsGoalRequest,
  SavingsGoalRequestWithProfiles,
  SavingsGoal,
} from "@/lib/types/savings";
import {
  verifyFirebaseToken,
  verifyUserAuthorization,
} from "@/lib/auth-middleware";

const db = admin.firestore();

// GET - Fetch savings goal sharing requests for a user
export async function GET(request: NextRequest) {
  try {
    // Verify Firebase authentication
    const { user, error: tokenError } = await verifyFirebaseToken(request);
    if (tokenError) return tokenError;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type"); // 'sent' | 'received'

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Verify user authorization - users can only view their own requests
    const authorizationError = verifyUserAuthorization(user!.uid, userId);
    if (authorizationError) return authorizationError;

    if (type === "sent" || type === "received") {
      // Get filtered requests
      let query: any = db.collection("savingsGoalRequests");

      if (type === "sent") {
        query = query.where("fromUserId", "==", userId);
      } else if (type === "received") {
        query = query.where("toUserId", "==", userId);
      }

      const snapshot = await query.get();
      const requestsWithProfiles = await Promise.all(
        snapshot.docs.map(async (doc: any) => {
          const data = doc.data() as any;
          const request = {
            id: doc.id,
            savingsGoalId: data.savingsGoalId,
            fromUserId: data.fromUserId,
            toUserId: data.toUserId,
            status: data.status,
            createdAt: data.createdAt
              ? new Date(data.createdAt.seconds * 1000)
              : new Date(),
            updatedAt: data.updatedAt
              ? new Date(data.updatedAt.seconds * 1000)
              : new Date(),
          };

          // Fetch user profiles
          const [fromUser, toUser] = await Promise.all([
            admin.auth().getUser(data.fromUserId),
            admin.auth().getUser(data.toUserId),
          ]);

          // Fetch savings goal
          const goalDoc = await db
            .collection("savingsGoals")
            .doc(data.savingsGoalId)
            .get();
          const goalData = goalDoc.data();

          if (!goalData) {
            throw new Error(`Savings goal ${data.savingsGoalId} not found`);
          }

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

          return {
            ...request,
            fromUserProfile: {
              uid: fromUser.uid,
              email: fromUser.email || "",
              displayName: fromUser.displayName || null,
              photoURL: fromUser.photoURL || null,
              createdAt: fromUser.metadata.creationTime
                ? new Date(fromUser.metadata.creationTime)
                : new Date(),
            },
            toUserProfile: {
              uid: toUser.uid,
              email: toUser.email || "",
              displayName: toUser.displayName || null,
              photoURL: toUser.photoURL || null,
              createdAt: toUser.metadata.creationTime
                ? new Date(toUser.metadata.creationTime)
                : new Date(),
            },
            savingsGoal,
          };
        })
      );

      return NextResponse.json({ requests: requestsWithProfiles });
    } else {
      // Get both sent and received
      const [sent, received] = await Promise.all([
        db
          .collection("savingsGoalRequests")
          .where("fromUserId", "==", userId)
          .get(),
        db
          .collection("savingsGoalRequests")
          .where("toUserId", "==", userId)
          .get(),
      ]);

      const allRequests = [...sent.docs, ...received.docs];
      const requestsWithProfiles = await Promise.all(
        allRequests.map(async (doc) => {
          const data = doc.data() as any;
          const request = {
            id: doc.id,
            savingsGoalId: data.savingsGoalId,
            fromUserId: data.fromUserId,
            toUserId: data.toUserId,
            status: data.status,
            createdAt: data.createdAt
              ? new Date(data.createdAt.seconds * 1000)
              : new Date(),
            updatedAt: data.updatedAt
              ? new Date(data.updatedAt.seconds * 1000)
              : new Date(),
          };

          // Fetch user profiles
          const [fromUser, toUser] = await Promise.all([
            admin.auth().getUser(data.fromUserId),
            admin.auth().getUser(data.toUserId),
          ]);

          // Fetch savings goal
          const goalDoc = await db
            .collection("savingsGoals")
            .doc(data.savingsGoalId)
            .get();
          const goalData = goalDoc.data();

          if (!goalData) {
            throw new Error(`Savings goal ${data.savingsGoalId} not found`);
          }

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

          return {
            ...request,
            fromUserProfile: {
              uid: fromUser.uid,
              email: fromUser.email || "",
              displayName: fromUser.displayName || null,
              photoURL: fromUser.photoURL || null,
              createdAt: fromUser.metadata.creationTime
                ? new Date(fromUser.metadata.creationTime)
                : new Date(),
            },
            toUserProfile: {
              uid: toUser.uid,
              email: toUser.email || "",
              displayName: toUser.displayName || null,
              photoURL: toUser.photoURL || null,
              createdAt: toUser.metadata.creationTime
                ? new Date(toUser.metadata.creationTime)
                : new Date(),
            },
            savingsGoal,
          };
        })
      );

      return NextResponse.json({ requests: requestsWithProfiles });
    }
  } catch (error) {
    console.error("Error fetching savings goal requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch savings goal requests" },
      { status: 500 }
    );
  }
}

// POST - Send or respond to savings goal sharing request
export async function POST(request: NextRequest) {
  try {
    // Verify Firebase authentication
    const { user, error: authError } = await verifyFirebaseToken(request);
    if (authError) return authError;

    const body = await request.json();
    const { action, fromUserId, toUserId, savingsGoalId, requestId } = body;

    console.log("Savings requests API received:", {
      action,
      fromUserId,
      toUserId,
      savingsGoalId,
      requestId,
      body,
    });

    if (!action || !fromUserId || !toUserId || !savingsGoalId) {
      console.log("Missing fields in savings request:", {
        action: !!action,
        fromUserId: !!fromUserId,
        toUserId: !!toUserId,
        savingsGoalId: !!savingsGoalId,
      });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify user authorization based on action type
    if (action === "send") {
      // User can only send requests from themselves
      const sendAuthError = verifyUserAuthorization(user!.uid, fromUserId);
      if (sendAuthError) return sendAuthError;
    } else if (action === "accept" || action === "decline") {
      // User can only respond to requests sent to them
      const respondAuthError = verifyUserAuthorization(user!.uid, toUserId);
      if (respondAuthError) return respondAuthError;
    } else if (action === "cancel") {
      // User can only cancel requests they sent
      const cancelAuthError = verifyUserAuthorization(user!.uid, fromUserId);
      if (cancelAuthError) return cancelAuthError;
    }

    const batch = db.batch();
    const now = admin.firestore.FieldValue.serverTimestamp();

    if (action === "send") {
      // Verify the savings goal exists and belongs to the sender
      const goalDoc = await db
        .collection("savingsGoals")
        .doc(savingsGoalId)
        .get();
      if (!goalDoc.exists) {
        return NextResponse.json(
          { error: "Savings goal not found" },
          { status: 404 }
        );
      }

      const goalData = goalDoc.data();
      if (goalData?.userId !== fromUserId) {
        return NextResponse.json(
          { error: "Unauthorized to share this savings goal" },
          { status: 403 }
        );
      }

      // Check if request already exists
      const existingRequest = await db
        .collection("savingsGoalRequests")
        .where("savingsGoalId", "==", savingsGoalId)
        .where("fromUserId", "==", fromUserId)
        .where("toUserId", "==", toUserId)
        .where("status", "==", "pending")
        .get();

      if (!existingRequest.empty) {
        return NextResponse.json(
          { error: "Sharing request already exists" },
          { status: 400 }
        );
      }

      // Check if users are friends
      const friendship = await db
        .collection("friends")
        .where("userId", "in", [fromUserId, toUserId])
        .where("friendId", "in", [fromUserId, toUserId])
        .where("status", "==", "accepted")
        .get();

      if (friendship.empty) {
        return NextResponse.json(
          { error: "You can only share savings goals with friends" },
          { status: 400 }
        );
      }

      const requestRef = db.collection("savingsGoalRequests").doc();
      batch.set(requestRef, {
        savingsGoalId,
        fromUserId,
        toUserId,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
    } else if (action === "accept" || action === "decline") {
      if (!requestId) {
        return NextResponse.json(
          { error: "Request ID is required for accept/decline actions" },
          { status: 400 }
        );
      }

      const requestRef = db.collection("savingsGoalRequests").doc(requestId);
      const requestDoc = await requestRef.get();

      if (!requestDoc.exists) {
        return NextResponse.json(
          { error: "Sharing request not found" },
          { status: 404 }
        );
      }

      const requestData = requestDoc.data() as SavingsGoalRequest;

      if (requestData.toUserId !== fromUserId) {
        return NextResponse.json(
          { error: "Unauthorized to respond to this request" },
          { status: 403 }
        );
      }

      if (action === "accept") {
        // Get the original savings goal
        const originalGoalDoc = await db
          .collection("savingsGoals")
          .doc(requestData.savingsGoalId)
          .get();

        if (!originalGoalDoc.exists) {
          return NextResponse.json(
            { error: "Original savings goal not found" },
            { status: 404 }
          );
        }

        const originalGoalData = originalGoalDoc.data();

        // Create a copy of the savings goal for the recipient
        const recipientGoalRef = db.collection("savingsGoals").doc();
        batch.set(recipientGoalRef, {
          userId: requestData.toUserId, // Recipient becomes the owner
          title: `${originalGoalData!.title} (shared)`, // Add "(shared)" to distinguish
          description: originalGoalData!.description || "",
          targetAmount: originalGoalData!.targetAmount,
          currentAmount: 0, // Start from 0 for the recipient
          targetDate: originalGoalData!.targetDate || null,
          category: originalGoalData!.category || "",
          isPublic: false, // Private by default for the recipient
          createdAt: now,
          updatedAt: now,
        });

        // Create shared savings goal entry
        const sharedGoalRef = db.collection("sharedSavingsGoals").doc();
        batch.set(sharedGoalRef, {
          savingsGoalId: requestData.savingsGoalId,
          recipientGoalId: recipientGoalRef.id, // Link to the recipient's copy
          ownerId: requestData.fromUserId,
          sharedWithId: requestData.toUserId,
          status: "active",
          sharedAt: now,
        });

        // Update request status
        batch.update(requestRef, {
          status: "accepted",
          updatedAt: now,
        });
      } else {
        // Update request status to declined
        batch.update(requestRef, {
          status: "declined",
          updatedAt: now,
        });
      }
    } else if (action === "cancel") {
      if (!requestId) {
        return NextResponse.json(
          { error: "Request ID is required for cancel action" },
          { status: 400 }
        );
      }

      const requestRef = db.collection("savingsGoalRequests").doc(requestId);
      const requestDoc = await requestRef.get();

      if (!requestDoc.exists) {
        return NextResponse.json(
          { error: "Sharing request not found" },
          { status: 404 }
        );
      }

      const requestData = requestDoc.data() as SavingsGoalRequest;

      if (requestData.fromUserId !== fromUserId) {
        return NextResponse.json(
          { error: "Unauthorized to cancel this request" },
          { status: 403 }
        );
      }

      batch.delete(requestRef);
    }

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing savings goal sharing request:", error);
    return NextResponse.json(
      { error: "Failed to process savings goal sharing request" },
      { status: 500 }
    );
  }
}
