import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { withRateLimit, getRateLimitHeaders } from "@/lib/rate-limiter";
import { auditLog } from "@/lib/audit-logger";

export interface AuthenticatedRequest extends NextRequest {
  user: {
    uid: string;
    email?: string;
    displayName?: string;
  };
}

/**
 * Middleware to verify Firebase ID token from Authorization header
 * Returns authenticated user info or error response
 * Includes rate limiting for authentication endpoints
 */
export async function verifyFirebaseToken(request: NextRequest): Promise<{
  user: { uid: string; email?: string; displayName?: string } | null;
  error: NextResponse | null;
}> {
  try {
    // Apply rate limiting for auth endpoints
    const rateLimitResponse = await withRateLimit(request);
    if (rateLimitResponse) {
      return {
        user: null,
        error: rateLimitResponse,
      };
    }

    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        user: null,
        error: NextResponse.json(
          { error: "Missing or invalid authorization header" },
          { status: 401 }
        ),
      };
    }

    const idToken = authHeader.split("Bearer ")[1];

    if (!idToken) {
      return {
        user: null,
        error: NextResponse.json(
          { error: "Missing ID token" },
          { status: 401 }
        ),
      };
    }

    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Log successful authentication
    await auditLog.auth.login(request, decodedToken.uid, true);

    return {
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name,
      },
      error: null,
    };
  } catch (error) {
    // Log failed authentication attempt
    const authHeader = request.headers.get("authorization");
    const idToken = authHeader?.split("Bearer ")[1];
    if (idToken) {
      try {
        // Try to decode to get user ID if possible
        const decoded = await admin
          .auth()
          .verifyIdToken(idToken, true)
          .catch(() => null);
        if (decoded) {
          await auditLog.auth.login(
            request,
            decoded.uid,
            false,
            "Invalid or expired token"
          );
        }
      } catch {
        // Ignore - can't log without valid token
      }
    }

    // Don't expose internal error details
    return {
      user: null,
      error: NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      ),
    };
  }
}

/**
 * Helper function to verify that the authenticated user matches the requested user ID
 */
export async function verifyUserAuthorization(
  authenticatedUserId: string,
  requestedUserId: string,
  request: NextRequest,
  resourceId?: string
): Promise<NextResponse | null> {
  if (authenticatedUserId !== requestedUserId) {
    // Log authorization failure
    await auditLog.authorization.failed(
      request,
      authenticatedUserId,
      resourceId,
      `Attempted to access resource for user ${requestedUserId}`
    );

    return NextResponse.json(
      {
        error: "Unauthorized: Cannot perform action on behalf of another user",
      },
      { status: 403 }
    );
  }
  return null;
}

/**
 * Helper function to add rate limit headers to a response
 */
export async function addRateLimitHeaders(
  response: NextResponse,
  request: NextRequest,
  userId?: string
): Promise<NextResponse> {
  const headers = await getRateLimitHeaders(request, userId);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
