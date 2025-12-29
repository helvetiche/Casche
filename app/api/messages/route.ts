import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { Message, Chat } from "@/lib/types/messages";
import {
  verifyFirebaseToken,
  verifyUserAuthorization,
  addRateLimitHeaders,
} from "@/lib/auth-middleware";
import { withRateLimit } from "@/lib/rate-limiter";
import { validateRequestSize } from "@/lib/request-size-middleware";
import { auditLog } from "@/lib/audit-logger";
import { validateCSRFToken } from "@/lib/csrf-middleware";

const db = admin.firestore();

// Helper function to generate chat ID from two user IDs
const getChatId = (userId1: string, userId2: string): string => {
  return [userId1, userId2].sort().join("_");
};

// GET: Fetch messages for a chat between two users
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
    const otherUserId = searchParams.get("otherUserId");

    if (!otherUserId) {
      return NextResponse.json(
        { error: "Other user ID is required" },
        { status: 400 }
      );
    }

    const chatId = getChatId(user!.uid, otherUserId);

    // Verify user is part of this chat
    if (!chatId.includes(user!.uid)) {
      return NextResponse.json(
        { error: "Unauthorized to access this chat" },
        { status: 403 }
      );
    }

    // Fetch messages for this chat
    const messagesSnapshot = await db
      .collection("messages")
      .where("chatId", "==", chatId)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const messages: Message[] = messagesSnapshot.docs.map((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate() || new Date();
      const readAt = data.readAt?.toDate() || null;

      return {
        id: doc.id,
        chatId: data.chatId,
        senderId: data.senderId,
        receiverId: data.receiverId,
        content: data.content,
        createdAt: createdAt.toISOString(),
        readAt: readAt ? readAt.toISOString() : null,
      };
    });

    // Reverse to show oldest first
    messages.reverse();

    const response = NextResponse.json({ messages });
    return await addRateLimitHeaders(response, request, user!.uid);
  } catch (error) {
    await auditLog.error.server(
      request,
      user?.uid,
      "/api/messages",
      "Failed to fetch messages"
    );
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// POST: Send a message
export async function POST(request: NextRequest) {
  let user: { uid: string; email?: string; displayName?: string } | null = null;
  try {
    // Apply rate limiting (stricter for message sending)
    const rateLimitResponse = await withRateLimit(request, undefined, {
      requests: 30,
      windowMs: 60 * 1000,
    });
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
    const { receiverId, content } = body;

    if (!receiverId || !content || content.trim() === "") {
      return NextResponse.json(
        { error: "Receiver ID and content are required" },
        { status: 400 }
      );
    }

    // Verify users are friends
    const [friendship1, friendship2] = await Promise.all([
      db
        .collection("friends")
        .where("userId", "==", user!.uid)
        .where("friendId", "==", receiverId)
        .where("status", "==", "accepted")
        .get(),
      db
        .collection("friends")
        .where("userId", "==", receiverId)
        .where("friendId", "==", user!.uid)
        .where("status", "==", "accepted")
        .get(),
    ]);

    if (friendship1.empty && friendship2.empty) {
      return NextResponse.json(
        { error: "You can only message your friends" },
        { status: 403 }
      );
    }

    const chatId = getChatId(user!.uid, receiverId);
    const now = admin.firestore.Timestamp.now();

    // Create or update chat
    const chatRef = db.collection("chats").doc(chatId);
    const chatDoc = await chatRef.get();

    if (!chatDoc.exists) {
      await chatRef.set({
        participants: [user!.uid, receiverId].sort(),
        lastMessage: content.trim(),
        lastMessageAt: now,
        createdAt: now,
      });
    } else {
      await chatRef.update({
        lastMessage: content.trim(),
        lastMessageAt: now,
      });
    }

    // Create message
    const messageRef = await db.collection("messages").add({
      chatId,
      senderId: user!.uid,
      receiverId,
      content: content.trim(),
      createdAt: now,
      readAt: null,
    });

    const messageDoc = await messageRef.get();
    const messageData = messageDoc.data()!;
    const createdAt = messageData.createdAt.toDate();

    const message = {
      id: messageDoc.id,
      chatId: messageData.chatId,
      senderId: messageData.senderId,
      receiverId: messageData.receiverId,
      content: messageData.content,
      createdAt: createdAt.toISOString(),
      readAt: null,
    };

    const response = NextResponse.json({ message });
    return await addRateLimitHeaders(response, request, user!.uid);
  } catch (error) {
    await auditLog.error.server(
      request,
      user?.uid,
      "/api/messages",
      "Failed to send message"
    );
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
