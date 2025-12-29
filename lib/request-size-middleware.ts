import { NextRequest, NextResponse } from "next/server";

/**
 * Default maximum request body sizes (in bytes)
 */
export const MAX_REQUEST_SIZE = {
  DEFAULT: 1024 * 1024, // 1MB
  FILE_UPLOAD: 10 * 1024 * 1024, // 10MB
} as const;

/**
 * Validates request body size before parsing
 * Returns error response if size exceeds limit, otherwise returns null
 *
 * @param request - Next.js request object
 * @param maxSizeBytes - Maximum allowed size in bytes (default: 1MB)
 * @returns NextResponse with 413 status if exceeded, null otherwise
 */
export const validateRequestSize = (
  request: NextRequest,
  maxSizeBytes: number = MAX_REQUEST_SIZE.DEFAULT
): NextResponse | null => {
  const contentLength = request.headers.get("content-length");

  if (contentLength) {
    const size = parseInt(contentLength, 10);

    if (isNaN(size)) {
      return NextResponse.json(
        { error: "Invalid Content-Length header" },
        { status: 400 }
      );
    }

    if (size > maxSizeBytes) {
      return NextResponse.json(
        {
          error: "Request body too large",
          message: `Maximum request size is ${Math.round(
            maxSizeBytes / 1024
          )}KB`,
        },
        { status: 413 }
      );
    }
  }

  // If Content-Length is not present, we can't validate upfront
  // The request will be parsed and Next.js will handle size limits
  return null;
};
