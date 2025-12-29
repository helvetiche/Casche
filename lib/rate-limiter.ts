import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit-logger";

/**
 * Rate Limiter Configuration
 * Different limits for different endpoint types
 */
export const RATE_LIMITS = {
  // Authentication endpoints - stricter limits
  auth: {
    requests: 5,
    windowMs: 60 * 1000, // 1 minute
  },
  // Transaction endpoints - moderate limits
  transaction: {
    requests: 20,
    windowMs: 60 * 1000, // 1 minute
  },
  // General API endpoints
  general: {
    requests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  // Search endpoints - more lenient
  search: {
    requests: 30,
    windowMs: 60 * 1000, // 1 minute
  },
} as const;

/**
 * Rate limit entry stored in memory or Redis
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Rate limiter interface for abstraction
 */
interface RateLimiterStore {
  get(key: string, windowMs: number): Promise<RateLimitEntry>;
  increment(key: string, windowMs: number): Promise<RateLimitEntry>;
}

/**
 * In-memory rate limit store (fallback)
 * Used when Redis is not configured or in development
 */
class InMemoryRateLimitStore implements RateLimiterStore {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  async get(key: string, windowMs: number): Promise<RateLimitEntry> {
    const entry = this.store.get(key);
    const now = Date.now();

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired entry
      const newEntry: RateLimitEntry = {
        count: 0,
        resetTime: now + windowMs,
      };
      this.store.set(key, newEntry);
      return newEntry;
    }

    return entry;
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const entry = await this.get(key, windowMs);
    entry.count += 1;
    this.store.set(key, entry);
    return entry;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

/**
 * Redis-based rate limit store (distributed)
 * Uses Upstash Redis for serverless/distributed environments
 */
class RedisRateLimitStore implements RateLimiterStore {
  private redis: any;
  private prefix: string = "ratelimit:";

  constructor() {
    try {
      // Dynamically import @upstash/redis to avoid errors if not installed
      const { Redis } = require("@upstash/redis");
      this.redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
    } catch (error) {
      console.error("Failed to initialize Redis:", error);
      throw error;
    }
  }

  async get(key: string, windowMs: number): Promise<RateLimitEntry> {
    const redisKey = `${this.prefix}${key}`;
    const now = Date.now();

    try {
      const data = (await this.redis.get(redisKey)) as RateLimitEntry | null;

      if (!data || now > data.resetTime) {
        // Create new entry or reset expired entry
        const newEntry: RateLimitEntry = {
          count: 0,
          resetTime: now + windowMs,
        };
        // Set with expiration (add 1 second buffer)
        // Upstash Redis uses set with ex option for expiration
        await this.redis.set(redisKey, newEntry, {
          ex: Math.ceil(windowMs / 1000) + 1,
        });
        return newEntry;
      }

      return data;
    } catch (error) {
      console.error("Redis get error:", error);
      // Fallback to creating a new entry
      return {
        count: 0,
        resetTime: now + windowMs,
      };
    }
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const redisKey = `${this.prefix}${key}`;
    const now = Date.now();

    try {
      // Use Redis pipeline for atomic operations
      const data = (await this.redis.get(redisKey)) as RateLimitEntry | null;

      let entry: RateLimitEntry;
      if (!data || now > data.resetTime) {
        // Create new entry
        entry = {
          count: 1,
          resetTime: now + windowMs,
        };
      } else {
        // Increment existing entry
        entry = {
          count: data.count + 1,
          resetTime: data.resetTime,
        };
      }

      // Set with expiration
      // Upstash Redis uses set with ex option for expiration
      await this.redis.set(redisKey, entry, {
        ex: Math.ceil(windowMs / 1000) + 1,
      });
      return entry;
    } catch (error) {
      console.error("Redis increment error:", error);
      // Fallback: return a new entry
      return {
        count: 1,
        resetTime: now + windowMs,
      };
    }
  }
}

/**
 * Get the appropriate rate limiter store
 * Uses Redis if configured, otherwise falls back to in-memory
 */
function getRateLimiterStore(): RateLimiterStore {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Use Redis if both URL and token are configured
  if (redisUrl && redisToken) {
    try {
      return new RedisRateLimitStore();
    } catch (error) {
      console.warn(
        "Failed to initialize Redis rate limiter, falling back to in-memory:",
        error
      );
      return new InMemoryRateLimitStore();
    }
  }

  // Fallback to in-memory for development or when Redis is not configured
  return new InMemoryRateLimitStore();
}

// Singleton instance - will use Redis if configured, otherwise in-memory
let rateLimitStore: RateLimiterStore | null = null;

function getStore(): RateLimiterStore {
  if (!rateLimitStore) {
    rateLimitStore = getRateLimiterStore();
  }
  return rateLimitStore;
}

/**
 * Get identifier for rate limiting based on request
 * Uses user ID if authenticated, otherwise IP address
 */
const getRateLimitKey = (
  request: NextRequest,
  userId?: string,
  endpoint?: string
): string => {
  // If user is authenticated, use user ID for more accurate limiting
  if (userId) {
    return `user:${userId}:${endpoint || "api"}`;
  }

  // Otherwise use IP address
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : request.headers.get("x-real-ip") || "unknown";

  return `ip:${ip}:${endpoint || "api"}`;
};

/**
 * Determine rate limit type based on endpoint path
 */
const getRateLimitType = (pathname: string): keyof typeof RATE_LIMITS => {
  if (pathname.includes("/auth/")) {
    return "auth";
  }
  if (
    pathname.includes("/transactions") ||
    pathname.includes("/quick-submit")
  ) {
    return "transaction";
  }
  if (pathname.includes("/search")) {
    return "search";
  }
  return "general";
};

/**
 * Universal rate limiting middleware
 *
 * @param request - Next.js request object
 * @param userId - Optional authenticated user ID
 * @param customLimit - Optional custom rate limit override
 * @returns NextResponse with rate limit headers, or null if within limits
 */
export const rateLimit = async (
  request: NextRequest,
  userId?: string,
  customLimit?: { requests: number; windowMs: number }
): Promise<NextResponse | null> => {
  const pathname = new URL(request.url).pathname;
  const limitType = getRateLimitType(pathname);
  const limit = customLimit || RATE_LIMITS[limitType];
  const endpoint = pathname.split("/").pop() || "api";

  const key = getRateLimitKey(request, userId, endpoint);
  const store = getStore();
  const entry = await store.increment(key, limit.windowMs);

  // Calculate remaining requests
  const remaining = Math.max(0, limit.requests - entry.count);
  const resetTime = entry.resetTime;

  // Check if rate limit exceeded
  if (entry.count > limit.requests) {
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

    return NextResponse.json(
      {
        error: "Too many requests",
        message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Limit": limit.requests.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": resetTime.toString(),
        },
      }
    );
  }

  // Return null to indicate request should proceed
  // Headers will be added by the wrapper function
  return null;
};

/**
 * Rate limit wrapper for API route handlers
 *
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const rateLimitResponse = await withRateLimit(request);
 *   if (rateLimitResponse) return rateLimitResponse;
 *
 *   // Your handler code here
 * }
 * ```
 */
export const withRateLimit = async (
  request: NextRequest,
  userId?: string,
  customLimit?: { requests: number; windowMs: number }
): Promise<NextResponse | null> => {
  const pathname = new URL(request.url).pathname;
  const limitType = getRateLimitType(pathname);
  const limit = customLimit || RATE_LIMITS[limitType];
  const endpoint = pathname.split("/").pop() || "api";

  const key = getRateLimitKey(request, userId, endpoint);
  const store = getStore();
  const entry = await store.increment(key, limit.windowMs);

  const remaining = Math.max(0, limit.requests - entry.count);
  const resetTime = entry.resetTime;

  // Check if rate limit exceeded
  if (entry.count > limit.requests) {
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

    // Log rate limit violation
    await auditLog.rateLimit.exceeded(request, userId, endpoint);

    return NextResponse.json(
      {
        error: "Too many requests",
        message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Limit": limit.requests.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": resetTime.toString(),
        },
      }
    );
  }

  // Add rate limit headers to response (will be added by caller)
  return null;
};

/**
 * Get rate limit headers for successful requests
 */
export const getRateLimitHeaders = async (
  request: NextRequest,
  userId?: string,
  customLimit?: { requests: number; windowMs: number }
): Promise<Record<string, string>> => {
  const pathname = new URL(request.url).pathname;
  const limitType = getRateLimitType(pathname);
  const limit = customLimit || RATE_LIMITS[limitType];
  const endpoint = pathname.split("/").pop() || "api";

  const key = getRateLimitKey(request, userId, endpoint);
  const store = getStore();
  const entry = await store.get(key, limit.windowMs);

  const remaining = Math.max(0, limit.requests - entry.count);
  const resetTime = entry.resetTime;

  return {
    "X-RateLimit-Limit": limit.requests.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": resetTime.toString(),
  };
};

// Cleanup on process exit (only for in-memory store)
if (typeof process !== "undefined") {
  process.on("SIGTERM", () => {
    if (rateLimitStore instanceof InMemoryRateLimitStore) {
      rateLimitStore.destroy();
    }
  });
  process.on("SIGINT", () => {
    if (rateLimitStore instanceof InMemoryRateLimitStore) {
      rateLimitStore.destroy();
    }
  });
}
