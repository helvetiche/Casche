import { NextRequest, NextResponse } from "next/server";
import { authAdmin } from "@/lib/firebase-admin";
import {
  verifyFirebaseToken,
  verifyUserAuthorization,
} from "@/lib/auth-middleware";
import { validateUserId } from "@/lib/security-utils";
import { validateRequestSize } from "@/lib/request-size-middleware";
import { validateCSRFToken } from "@/lib/csrf-middleware";

/**
 * SECURITY: This endpoint requires authentication and admin privileges
 * Only allows users to set claims for themselves (or admin users in future)
 */
export async function POST(request: NextRequest) {
  try {
    // CRITICAL: Require authentication
    const { user, error: tokenError } = await verifyFirebaseToken(request);
    if (tokenError) return tokenError;

    // Validate CSRF token
    const csrfCheck = validateCSRFToken(request);
    if (csrfCheck) return csrfCheck;

    // Validate request body size
    const sizeCheck = validateRequestSize(request);
    if (sizeCheck) return sizeCheck;

    const body = await request.json();
    const { uid } = body;

    if (!uid) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Validate user ID format
    try {
      validateUserId(uid);
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

    // SECURITY: Users can only set claims for themselves
    // In production, you might want to add admin role check here
    const authorizationError = await verifyUserAuthorization(
      user!.uid,
      uid,
      request
    );
    if (authorizationError) {
      return NextResponse.json(
        { error: "Unauthorized: You can only set claims for yourself" },
        { status: 403 }
      );
    }

    // Set custom claims for the user
    await authAdmin.setCustomUserClaims(uid, {
      role: "user",
      tier: "basic",
    });

    return NextResponse.json({
      success: true,
      message: "Custom claims set successfully",
    });
  } catch (error) {
    // Don't expose internal error details
    return NextResponse.json(
      { error: "Failed to set custom claims" },
      { status: 500 }
    );
  }
}
