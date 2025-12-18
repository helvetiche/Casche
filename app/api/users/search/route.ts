import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { UserProfile } from "@/lib/types/friends";
import {
  verifyFirebaseToken,
  verifyUserAuthorization,
} from "@/lib/auth-middleware";

export async function GET(request: NextRequest) {
  try {
    // Verify Firebase authentication
    const { user, error: tokenError } = await verifyFirebaseToken(request);
    if (tokenError) return tokenError;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const currentUserId = searchParams.get("currentUserId");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!query || !currentUserId) {
      return NextResponse.json(
        { error: "Query and current user ID are required" },
        { status: 400 }
      );
    }

    // Verify user authorization - users can only search on their own behalf
    const authorizationError = verifyUserAuthorization(
      user!.uid,
      currentUserId
    );
    if (authorizationError) return authorizationError;

    if (query.length < 2) {
      return NextResponse.json({ users: [] }, { status: 200 });
    }

    // List all users (Note: In production, you'd want to use Firestore for user profiles)
    // Firebase Auth doesn't provide direct search, so we'll list users and filter client-side
    // For a production app, consider storing user profiles in Firestore
    const listUsersResult = await admin.auth().listUsers(1000); // Max 1000 users

    const matchingUsers: UserProfile[] = [];

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
        matchingUsers.push({
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || null,
          photoURL: user.photoURL || null,
          createdAt: new Date(user.metadata.creationTime || Date.now()),
        });

        // Limit results
        if (matchingUsers.length >= limit) break;
      }
    }

    return NextResponse.json({ users: matchingUsers });
  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}
