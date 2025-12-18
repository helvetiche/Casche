import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { Friend, FriendWithProfile, UserProfile } from "@/lib/types/friends";
import {
  verifyFirebaseToken,
  verifyUserAuthorization,
} from "@/lib/auth-middleware";

const db = admin.firestore();

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

    // Verify user authorization - users can only view their own friends
    const authorizationError = verifyUserAuthorization(user!.uid, userId);
    if (authorizationError) return authorizationError;

    // Get all friendships where the user is either userId or friendId
    const [friendsAsUser, friendsAsFriend] = await Promise.all([
      db
        .collection("friends")
        .where("userId", "==", userId)
        .where("status", "==", "accepted")
        .get(),
      db
        .collection("friends")
        .where("friendId", "==", userId)
        .where("status", "==", "accepted")
        .get(),
    ]);

    // Combine and deduplicate friend IDs
    const friendIds = new Set<string>();
    const friendPromises: Promise<UserProfile>[] = [];

    // Process friends where user is the requester
    friendsAsUser.docs.forEach((doc) => {
      const data = doc.data() as Friend;
      friendIds.add(data.friendId);
    });

    // Process friends where user is the recipient
    friendsAsFriend.docs.forEach((doc) => {
      const data = doc.data() as Friend;
      friendIds.add(data.userId);
    });

    // Fetch user profiles for all friends
    friendIds.forEach((friendId) => {
      friendPromises.push(
        admin
          .auth()
          .getUser(friendId)
          .then((user) => ({
            uid: user.uid,
            email: user.email || "",
            displayName: user.displayName || null,
            photoURL: user.photoURL || null,
            createdAt: user.metadata.creationTime
              ? new Date(user.metadata.creationTime)
              : new Date(),
          }))
      );
    });

    const friendProfiles = await Promise.all(friendPromises);

    // Create FriendWithProfile objects
    const friendsWithProfiles: FriendWithProfile[] = friendProfiles.map(
      (profile) => ({
        id: `${userId}_${profile.uid}`,
        userId: userId,
        friendId: profile.uid,
        createdAt: profile.createdAt,
        status: "accepted" as const,
        friendProfile: profile,
      })
    );

    return NextResponse.json({ friends: friendsWithProfiles });
  } catch (error) {
    console.error("Error fetching friends:", error);
    return NextResponse.json(
      { error: "Failed to fetch friends" },
      { status: 500 }
    );
  }
}
