import { NextRequest, NextResponse } from "next/server";

/**
 * Default timeout values (in milliseconds)
 */
export const TIMEOUTS = {
  DEFAULT: 30000, // 30 seconds
  COMPLEX_QUERY: 60000, // 60 seconds
} as const;

/**
 * Wrap an async handler with timeout protection
 * Returns 504 Gateway Timeout if handler exceeds timeout
 *
 * @param handler - Async handler function
 * @param timeoutMs - Timeout in milliseconds (default: 30s)
 * @returns Wrapped handler with timeout protection
 */
export const withTimeout = <T extends NextRequest>(
  handler: (request: T, ...args: any[]) => Promise<NextResponse>,
  timeoutMs: number = TIMEOUTS.DEFAULT
) => {
  return async (request: T, ...args: any[]): Promise<NextResponse> => {
    const timeoutPromise = new Promise<NextResponse>((resolve) => {
      setTimeout(() => {
        resolve(
          NextResponse.json(
            {
              error: "Request timeout",
              message: `Request exceeded timeout of ${timeoutMs}ms`,
            },
            { status: 504 }
          )
        );
      }, timeoutMs);
    });

    const handlerPromise = handler(request, ...args);

    return Promise.race([handlerPromise, timeoutPromise]);
  };
};
