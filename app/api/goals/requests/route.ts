import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { GoalRequest, Goal } from "@/lib/types/goals";
import { verifyFirebaseToken } from "@/lib/auth-middleware";
import { validateRequestSize } from "@/lib/request-size-middleware";
import { withRateLimit } from "@/lib/rate-limiter";
import { auditLog } from "@/lib/audit-logger";
import { validateCSRFToken } from "@/lib/csrf-middleware";

const db = admin.firestore();

// GET - Get user's pending goal requests
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

    if (user!.uid !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get pending requests where user is the recipient
    const requestsSnapshot = await db
      .collection("goalRequests")
      .where("toUserId", "==", userId)
      .where("status", "==", "pending")
      .orderBy("createdAt", "desc")
      .get();

    const requestsWithDetails = await Promise.all(
      requestsSnapshot.docs.map(async (doc) => {
        const requestData = doc.data() as GoalRequest;

        // Get goal details
        const goalDoc = await db
          .collection("goals")
          .doc(requestData.goalId)
          .get();
        const goalData = goalDoc.data() as Goal;

        // Get from user profile
        const fromUserRecord = await admin
          .auth()
          .getUser(requestData.fromUserId);

        // Get to user profile
        const toUserRecord = await admin.auth().getUser(requestData.toUserId);

        const requestDataRaw = doc.data() as any;
        const goalDataRaw = goalDoc.data() as any;
        return {
          ...requestDataRaw,
          id: doc.id,
          createdAt: requestDataRaw.createdAt?.toDate() || new Date(),
          updatedAt: requestDataRaw.updatedAt?.toDate() || new Date(),
          goal: {
            ...goalDataRaw,
            id: goalDoc.id,
            createdAt: goalDataRaw.createdAt?.toDate() || new Date(),
            updatedAt: goalDataRaw.updatedAt?.toDate() || new Date(),
            targetDate: goalDataRaw.targetDate?.toDate(),
          },
          fromUserProfile: {
            uid: fromUserRecord.uid,
            email: fromUserRecord.email || "",
            displayName: fromUserRecord.displayName || null,
            photoURL: fromUserRecord.photoURL || null,
            createdAt: fromUserRecord.metadata.creationTime
              ? new Date(fromUserRecord.metadata.creationTime)
              : new Date(),
          },
          toUserProfile: {
            uid: toUserRecord.uid,
            email: toUserRecord.email || "",
            displayName: toUserRecord.displayName || null,
            photoURL: toUserRecord.photoURL || null,
            createdAt: toUserRecord.metadata.creationTime
              ? new Date(toUserRecord.metadata.creationTime)
              : new Date(),
          },
        };
      })
    );

    return NextResponse.json({ requests: requestsWithDetails });
  } catch (error) {
    await auditLog.error.server(
      request,
      user?.uid,
      "/api/goals/requests",
      "Failed to fetch goal requests"
    );
    return NextResponse.json(
      { error: "Failed to fetch goal requests" },
      { status: 500 }
    );
  }
}

// PUT - Accept/decline sharing request
export async function PUT(request: NextRequest) {
  let user: { uid: string; email?: string; displayName?: string } | null = null;
  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

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
    const { requestId, action } = body;

    if (!requestId || !action) {
      return NextResponse.json(
        { error: "Request ID and action are required" },
        { status: 400 }
      );
    }

    if (action !== "accept" && action !== "decline") {
      return NextResponse.json(
        { error: "Action must be 'accept' or 'decline'" },
        { status: 400 }
      );
    }

    const requestRef = db.collection("goalRequests").doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const requestData = requestDoc.data() as GoalRequest;

    // Verify user is the recipient
    if (requestData.toUserId !== user!.uid) {
      return NextResponse.json(
        { error: "Unauthorized to respond to this request" },
        { status: 403 }
      );
    }

    if (requestData.status !== "pending") {
      return NextResponse.json(
        { error: "Request has already been processed" },
        { status: 400 }
      );
    }

    const now = admin.firestore.Timestamp.now();

    if (action === "accept") {
      // Update request status
      await requestRef.update({
        status: "accepted",
        updatedAt: now,
      });

      // Add user as member
      const existingMember = await db
        .collection("goalMembers")
        .where("goalId", "==", requestData.goalId)
        .where("userId", "==", user!.uid)
        .limit(1)
        .get();

      if (existingMember.empty) {
        await db.collection("goalMembers").add({
          goalId: requestData.goalId,
          userId: user!.uid,
          role: "member",
          joinedAt: now,
        });
      }
      // Log goal share acceptance
      await auditLog.goal.share(
        request,
        requestData.fromUserId,
        requestData.goalId,
        user!.uid,
        true
      );
    } else {
      // Decline
      await requestRef.update({
        status: "declined",
        updatedAt: now,
      });
    }

    const updatedRequestDoc = await requestRef.get();
    const updatedRequestData = updatedRequestDoc.data() as GoalRequest;

    const updatedRequestDataRaw = updatedRequestDoc.data() as any;
    const goalRequest: GoalRequest = {
      ...updatedRequestDataRaw,
      id: updatedRequestDoc.id,
      createdAt: updatedRequestDataRaw.createdAt?.toDate() || new Date(),
      updatedAt: updatedRequestDataRaw.updatedAt?.toDate() || new Date(),
    };

    return NextResponse.json({ goalRequest });
  } catch (error) {
    await auditLog.error.server(
      request,
      user?.uid,
      "/api/goals/requests",
      "Failed to process goal request"
    );
    return NextResponse.json(
      { error: "Failed to process goal request" },
      { status: 500 }
    );
  }
}
