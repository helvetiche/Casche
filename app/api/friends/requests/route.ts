import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { FriendRequest } from "@/lib/types/friends";
import {
  verifyFirebaseToken,
  verifyUserAuthorization,
} from "@/lib/auth-middleware";
import { validateRequestSize } from "@/lib/request-size-middleware";
import { withRateLimit } from "@/lib/rate-limiter";
import { auditLog } from "@/lib/audit-logger";
import { validateCSRFToken } from "@/lib/csrf-middleware";

const db = admin.firestore();

// GET - Fetch friend requests for a user
export async function GET(request: NextRequest) {
  let user: { uid: string; email?: string; displayName?: string } | null = null;
  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    // Verify Firebase authentication
    const authResult = await verifyFirebaseToken(request);
    if (authResult.error) return authResult.error;
    user = authResult.user;

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
    const authorizationError = await verifyUserAuthorization(
      user!.uid,
      userId,
      request
    );
    if (authorizationError) return authorizationError;

    if (type === "sent" || type === "received") {
      // Get filtered requests - only pending requests
      let query: any = db.collection("friendRequests");

      if (type === "sent") {
        query = query
          .where("fromUserId", "==", userId)
          .where("status", "==", "pending");
      } else if (type === "received") {
        query = query
          .where("toUserId", "==", userId)
          .where("status", "==", "pending");
      }

      const snapshot = await query.get();
      const requestsWithProfiles = await Promise.all(
        snapshot.docs.map(async (doc: any) => {
          const data = doc.data() as any;
          const request = {
            id: doc.id,
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
          };
        })
      );

      return NextResponse.json({ requests: requestsWithProfiles });
    } else {
      // Get both sent and received
      const [sent, received] = await Promise.all([
        db.collection("friendRequests").where("fromUserId", "==", userId).get(),
        db.collection("friendRequests").where("toUserId", "==", userId).get(),
      ]);

      const allRequests = [...sent.docs, ...received.docs];
      const requestsWithProfiles = await Promise.all(
        allRequests.map(async (doc) => {
          const data = doc.data() as any;
          const request = {
            id: doc.id,
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
          };
        })
      );

      return NextResponse.json({ requests: requestsWithProfiles });
    }
  } catch (error) {
    await auditLog.error.server(
      request,
      user?.uid || undefined,
      "/api/friends/requests",
      "Failed to fetch friend requests"
    );
    return NextResponse.json(
      { error: "Failed to fetch friend requests" },
      { status: 500 }
    );
  }
}

// POST - Send or respond to friend request
export async function POST(request: NextRequest) {
  let user: { uid: string; email?: string; displayName?: string } | null = null;
  try {
    // Verify Firebase authentication
    const authResult = await verifyFirebaseToken(request);
    if (authResult.error) return authResult.error;
    user = authResult.user;

    // Validate CSRF token
    const csrfCheck = validateCSRFToken(request);
    if (csrfCheck) return csrfCheck;

    // Validate request body size
    const sizeCheck = validateRequestSize(request);
    if (sizeCheck) return sizeCheck;

    const body = await request.json();
    const { action, fromUserId, toUserId, requestId } = body;

    if (!action || !fromUserId || !toUserId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify user authorization based on action type
    if (action === "send") {
      // User can only send requests from themselves
      const sendAuthError = await verifyUserAuthorization(
        user!.uid,
        fromUserId,
        request
      );
      if (sendAuthError) return sendAuthError;
    } else if (action === "accept" || action === "decline") {
      // User can only respond to requests sent to them
      const respondAuthError = await verifyUserAuthorization(
        user!.uid,
        toUserId,
        request
      );
      if (respondAuthError) return respondAuthError;
    } else if (action === "cancel") {
      // User can only cancel requests they sent
      const cancelAuthError = await verifyUserAuthorization(
        user!.uid,
        fromUserId,
        request
      );
      if (cancelAuthError) return cancelAuthError;
    }

    const batch = db.batch();
    const now = admin.firestore.FieldValue.serverTimestamp();

    if (action === "send") {
      // Check if request already exists
      const existingRequest = await db
        .collection("friendRequests")
        .where("fromUserId", "==", fromUserId)
        .where("toUserId", "==", toUserId)
        .where("status", "==", "pending")
        .get();

      if (!existingRequest.empty) {
        return NextResponse.json(
          { error: "Friend request already exists" },
          { status: 400 }
        );
      }

      // Check if they're already friends
      const existingFriendship = await db
        .collection("friends")
        .where("userId", "in", [fromUserId, toUserId])
        .where("friendId", "in", [fromUserId, toUserId])
        .where("status", "==", "accepted")
        .get();

      if (!existingFriendship.empty) {
        return NextResponse.json(
          { error: "Users are already friends" },
          { status: 400 }
        );
      }

      const requestRef = db.collection("friendRequests").doc();
      batch.set(requestRef, {
        fromUserId,
        toUserId,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });

      // Log friend request
      await auditLog.authorization.failed(
        request,
        user!.uid,
        undefined,
        `Send friend request to ${toUserId}`
      );
    } else if (action === "accept" || action === "decline") {
      if (!requestId) {
        return NextResponse.json(
          { error: "Request ID is required for accept/decline actions" },
          { status: 400 }
        );
      }

      const requestRef = db.collection("friendRequests").doc(requestId);
      const requestDoc = await requestRef.get();

      if (!requestDoc.exists) {
        return NextResponse.json(
          { error: "Friend request not found" },
          { status: 404 }
        );
      }

      const requestData = requestDoc.data() as FriendRequest;

      // SECURITY FIX: Verify user is the recipient (toUserId), not fromUserId
      if (requestData.toUserId !== user!.uid) {
        return NextResponse.json(
          { error: "Unauthorized to respond to this request" },
          { status: 403 }
        );
      }

      if (action === "accept") {
        // Create friendship
        const friendshipRef = db.collection("friends").doc();
        batch.set(friendshipRef, {
          userId: requestData.fromUserId,
          friendId: requestData.toUserId,
          status: "accepted",
          createdAt: now,
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

      const requestRef = db.collection("friendRequests").doc(requestId);
      const requestDoc = await requestRef.get();

      if (!requestDoc.exists) {
        return NextResponse.json(
          { error: "Friend request not found" },
          { status: 404 }
        );
      }

      const requestData = requestDoc.data() as FriendRequest;

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
    await auditLog.error.server(
      request,
      user?.uid,
      "/api/friends/requests",
      "Failed to process friend request"
    );
    return NextResponse.json(
      { error: "Failed to process friend request" },
      { status: 500 }
    );
  }
}
