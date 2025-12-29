import { NextRequest, NextResponse } from "next/server";
import { generateCSRFToken, setCSRFTokenCookie, getCSRFToken } from "@/lib/csrf-middleware";
import { withRateLimit } from "@/lib/rate-limiter";

/**
 * GET - Get or generate CSRF token
 * Returns the CSRF token that should be sent in X-CSRF-Token header
 */
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    // Check if token already exists in cookie
    let token = getCSRFToken(request);

    // Generate new token if one doesn't exist
    if (!token) {
      token = generateCSRFToken();
    }

    // Set token in cookie
    const response = NextResponse.json({ csrfToken: token });
    return setCSRFTokenCookie(response, token);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get CSRF token" },
      { status: 500 }
    );
  }
}
