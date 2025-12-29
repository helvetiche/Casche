import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { GoalRequest, Goal } from "@/lib/types/goals";
import {
  verifyFirebaseToken,
  addRateLimitHeaders,
} from "@/lib/auth-middleware";
import { validateUserId } from "@/lib/security-utils";
import { withRateLimit } from "@/lib/rate-limiter";
import { validateRequestSize } from "@/lib/request-size-middleware";
import { auditLog } from "@/lib/audit-logger";
import { validateCSRFToken } from "@/lib/csrf-middleware";

const db = admin.firestore();

// POST - Send sharing request to friend
export async function POST(
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

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { toUserId } = body;

    if (!toUserId) {
      return NextResponse.json(
        { error: "Friend user ID is required" },
        { status: 400 }
      );
    }

    // Validate user ID format
    try {
      validateUserId(toUserId);
    } catch (validationError) {
      return NextResponse.json(
        {
          error:
            validationError instanceof Error
              ? validationError.message
              : "Invalid user ID",
        },
        { status: 400 }
      );
    }

    // Check if goal exists and user is owner
    const goalDoc = await db.collection("goals").doc(goalId).get();

    if (!goalDoc.exists) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const goalData = goalDoc.data() as Goal;

    // Only owner can share
    if (goalData.userId !== user!.uid) {
      return NextResponse.json(
        { error: "Only goal owner can share the goal" },
        { status: 403 }
      );
    }

    // Check if already a member
    const existingMember = await db
      .collection("goalMembers")
      .where("goalId", "==", goalId)
      .where("userId", "==", toUserId)
      .limit(1)
      .get();

    if (!existingMember.empty) {
      return NextResponse.json(
        { error: "User is already a member of this goal" },
        { status: 400 }
      );
    }

    // Check if request already exists
    const existingRequest = await db
      .collection("goalRequests")
      .where("goalId", "==", goalId)
      .where("fromUserId", "==", user!.uid)
      .where("toUserId", "==", toUserId)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (!existingRequest.empty) {
      return NextResponse.json(
        { error: "Sharing request already sent" },
        { status: 400 }
      );
    }

    const now = admin.firestore.Timestamp.now();
    const requestRef = db.collection("goalRequests").doc();

    // Store Timestamp in Firestore (not Date)
    const requestDataForFirestore: any = {
      goalId,
      fromUserId: user!.uid,
      toUserId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    await requestRef.set(requestDataForFirestore);

    // Log goal sharing
    await auditLog.goal.share(request, user!.uid, goalId, toUserId, true);

    // Convert to Date for response
    const goalRequest: GoalRequest = {
      id: requestRef.id,
      goalId,
      fromUserId: user!.uid,
      toUserId,
      status: "pending",
      createdAt: now.toDate(),
      updatedAt: now.toDate(),
    };

    const response = NextResponse.json({ goalRequest }, { status: 201 });
    return await addRateLimitHeaders(response, request, user!.uid);
  } catch (error) {
    // Don't expose internal error details
    return NextResponse.json(
      { error: "Failed to send sharing request" },
      { status: 500 }
    );
  }
}

// GET - Get pending requests for a goal
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
        { error: "Unauthorized to view sharing requests" },
        { status: 403 }
      );
    }

    const requestsSnapshot = await db
      .collection("goalRequests")
      .where("goalId", "==", goalId)
      .where("status", "==", "pending")
      .orderBy("createdAt", "desc")
      .get();

    const requests: GoalRequest[] = requestsSnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate(),
          updatedAt: doc.data().updatedAt.toDate(),
        } as GoalRequest)
    );

    const response = NextResponse.json({ requests });
    return await addRateLimitHeaders(response, request, user!.uid);
  } catch (error) {
    // Don't expose internal error details
    return NextResponse.json(
      { error: "Failed to fetch sharing requests" },
      { status: 500 }
    );
  }
}
