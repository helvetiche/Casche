import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { UserProfile } from "@/lib/types/friends";
import {
  verifyFirebaseToken,
  verifyUserAuthorization,
  addRateLimitHeaders,
} from "@/lib/auth-middleware";
import { withRateLimit } from "@/lib/rate-limiter";
import { auditLog } from "@/lib/audit-logger";

export async function GET(request: NextRequest) {
  let user: { uid: string; email?: string; displayName?: string } | null = null;
  try {
    // Apply rate limiting (stricter for search endpoints)
    const rateLimitResponse = await withRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    // Verify Firebase authentication
    const authResult = await verifyFirebaseToken(request);
    if (authResult.error) return authResult.error;
    user = authResult.user;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const currentUserId = searchParams.get("currentUserId");
    const limitParam = parseInt(searchParams.get("limit") || "20");
    const offsetParam = parseInt(searchParams.get("offset") || "0");

    // Validate and limit pagination parameters
    const limit = Math.min(Math.max(1, limitParam), 50); // Between 1 and 50
    const offset = Math.max(0, offsetParam); // Non-negative

    if (!query || !currentUserId) {
      return NextResponse.json(
        { error: "Query and current user ID are required" },
        { status: 400 }
      );
    }

    // Verify user authorization - users can only search on their own behalf
    const authorizationError = await verifyUserAuthorization(
      user!.uid,
      currentUserId,
      request
    );
    if (authorizationError) return authorizationError;

    if (query.length < 2) {
      return NextResponse.json({ users: [] }, { status: 200 });
    }

    // List all users (Note: In production, you'd want to use Firestore for user profiles)
    // Firebase Auth doesn't provide direct search, so we'll list users and filter client-side
    // For a production app, consider storing user profiles in Firestore
    const listUsersResult = await admin.auth().listUsers(1000); // Max 1000 users

    const allMatchingUsers: UserProfile[] = [];

    for (const user of listUsersResult.users) {
      // Skip current user
      if (user.uid === currentUserId) continue;

      const email = user.email?.toLowerCase() || "";
      const displayName = user.displayName?.toLowerCase() || "";

      // Check if query matches email or display name
      if (
        email.includes(query.toLowerCase()) ||
        displayName.includes(query.toLowerCase())
      ) {
        allMatchingUsers.push({
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || null,
          photoURL: user.photoURL || null,
          createdAt: new Date(user.metadata.creationTime || Date.now()),
        });
      }
    }

    // Apply pagination
    const total = allMatchingUsers.length;
    const paginatedUsers = allMatchingUsers.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    // Log user search
    await auditLog.user.search(
      request,
      user!.uid,
      query,
      paginatedUsers.length,
      true
    );

    const response = NextResponse.json({
      users: paginatedUsers,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
      offset,
      hasMore,
    });
    return await addRateLimitHeaders(response, request, user!.uid);
  } catch (error) {
    await auditLog.error.server(
      request,
      user?.uid,
      "/api/users/search",
      "Failed to search users"
    );
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}
