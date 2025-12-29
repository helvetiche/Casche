import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

/**
 * CSRF token cookie name
 */
const CSRF_TOKEN_COOKIE = "csrf-token";

/**
 * CSRF token header name
 */
const CSRF_TOKEN_HEADER = "X-CSRF-Token";

/**
 * Generate a cryptographically secure CSRF token
 */
export const generateCSRFToken = (): string => {
  return randomBytes(32).toString("hex");
};

/**
 * Validate CSRF token from request
 * Compares token from header with token from cookie
 *
 * @param request - Next.js request object
 * @returns NextResponse with 403 status if invalid, null if valid
 */
export const validateCSRFToken = (
  request: NextRequest
): NextResponse | null => {
  const headerToken = request.headers.get(CSRF_TOKEN_HEADER);
  const cookieToken = request.cookies.get(CSRF_TOKEN_COOKIE)?.value;

  if (!headerToken || !cookieToken) {
    return NextResponse.json({ error: "CSRF token missing" }, { status: 403 });
  }

  if (headerToken !== cookieToken) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  return null;
};

/**
 * Set CSRF token in response cookie
 *
 * @param response - Next.js response object
 * @param token - CSRF token to set
 * @returns Response with CSRF token cookie
 */
export const setCSRFTokenCookie = (
  response: NextResponse,
  token: string
): NextResponse => {
  response.cookies.set(CSRF_TOKEN_COOKIE, token, {
    httpOnly: false, // Must be readable by JavaScript to send in header
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return response;
};

/**
 * Get CSRF token from request cookies
 *
 * @param request - Next.js request object
 * @returns CSRF token or null if not present
 */
export const getCSRFToken = (request: NextRequest): string | null => {
  return request.cookies.get(CSRF_TOKEN_COOKIE)?.value || null;
};
