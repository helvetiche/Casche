import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/firebase";
import { cookies } from "next/headers";
import { signOut } from "firebase/auth";
import { withRateLimit } from "@/lib/rate-limiter";
import { auditLog } from "@/lib/audit-logger";
import { validateCSRFToken } from "@/lib/csrf-middleware";

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    // This is a client-side operation, so we'll just return a success response
    // The actual session management is handled by Firebase Auth on the client
    return NextResponse.json({ success: true });
  } catch (error) {
    await auditLog.error.server(
      request,
      undefined,
      "/api/auth/session",
      "Failed to get session"
    );
    return NextResponse.json(
      { error: "Failed to get session" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    // Validate CSRF token
    const csrfCheck = validateCSRFToken(request);
    if (csrfCheck) return csrfCheck;

    // Sign out from Firebase Auth
    await signOut(auth);

    // Clear any server-side cookies if needed
    const cookieStore = cookies();
    // Add any custom cookies to clear here

    return NextResponse.json({ success: true });
  } catch (error) {
    await auditLog.error.server(
      request,
      undefined,
      "/api/auth/session",
      "Failed to logout"
    );
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}
