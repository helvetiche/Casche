import admin from "@/lib/firebase-admin";

/**
 * Audit Log Entry Types
 */
export type AuditLogType =
  | "auth.login"
  | "auth.logout"
  | "auth.token_refresh"
  | "goal.create"
  | "goal.update"
  | "goal.delete"
  | "goal.share"
  | "transaction.create"
  | "transaction.delete"
  | "friend.request"
  | "friend.accept"
  | "friend.decline"
  | "user.search"
  | "rate_limit.exceeded"
  | "authorization.failed"
  | "error.server";

/**
 * Audit Log Entry
 */
export interface AuditLogEntry {
  type: AuditLogType;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  resourceId?: string; // e.g., goalId, transactionId
  action: string;
  details?: Record<string, unknown>;
  success: boolean;
  error?: string;
  timestamp: Date;
}

const db = admin.firestore();

/**
 * Log audit event to Firestore
 *
 * @param entry - Audit log entry to record
 */
export const logAuditEvent = async (entry: AuditLogEntry): Promise<void> => {
  try {
    // Only log in production or if explicitly enabled
    if (
      process.env.NODE_ENV === "development" &&
      !process.env.ENABLE_AUDIT_LOGS
    ) {
      return;
    }

    await db.collection("auditLogs").add({
      ...entry,
      timestamp: admin.firestore.Timestamp.fromDate(entry.timestamp),
    });
  } catch (error) {
    // Don't throw errors from audit logging - it shouldn't break the app
    // In production, consider logging to external service
    console.error("Failed to log audit event:", error);
  }
};

/**
 * Helper to create audit log entry from request
 */
export const createAuditLogEntry = (
  type: AuditLogType,
  request: Request,
  options: {
    userId?: string;
    resourceId?: string;
    action: string;
    details?: Record<string, unknown>;
    success: boolean;
    error?: string;
  }
): AuditLogEntry => {
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded
    ? forwarded.split(",")[0].trim()
    : request.headers.get("x-real-ip") || "unknown";

  return {
    type,
    userId: options.userId,
    ipAddress,
    userAgent: request.headers.get("user-agent") || undefined,
    resourceId: options.resourceId,
    action: options.action,
    details: options.details,
    success: options.success,
    error: options.error,
    timestamp: new Date(),
  };
};

/**
 * Convenience functions for common audit events
 */
export const auditLog = {
  /**
   * Log authentication event
   */
  auth: {
    login: async (
      request: Request,
      userId: string,
      success: boolean,
      error?: string
    ) => {
      await logAuditEvent(
        createAuditLogEntry("auth.login", request, {
          userId,
          action: "User login attempt",
          success,
          error,
        })
      );
    },
    logout: async (request: Request, userId: string) => {
      await logAuditEvent(
        createAuditLogEntry("auth.logout", request, {
          userId,
          action: "User logout",
          success: true,
        })
      );
    },
  },

  /**
   * Log goal-related events
   */
  goal: {
    create: async (
      request: Request,
      userId: string,
      goalId: string,
      success: boolean,
      error?: string
    ) => {
      await logAuditEvent(
        createAuditLogEntry("goal.create", request, {
          userId,
          resourceId: goalId,
          action: "Create goal",
          success,
          error,
        })
      );
    },
    update: async (
      request: Request,
      userId: string,
      goalId: string,
      success: boolean,
      error?: string
    ) => {
      await logAuditEvent(
        createAuditLogEntry("goal.update", request, {
          userId,
          resourceId: goalId,
          action: "Update goal",
          success,
          error,
        })
      );
    },
    delete: async (
      request: Request,
      userId: string,
      goalId: string,
      success: boolean,
      error?: string
    ) => {
      await logAuditEvent(
        createAuditLogEntry("goal.delete", request, {
          userId,
          resourceId: goalId,
          action: "Delete goal",
          success,
          error,
        })
      );
    },
    share: async (
      request: Request,
      userId: string,
      goalId: string,
      toUserId: string,
      success: boolean,
      error?: string
    ) => {
      await logAuditEvent(
        createAuditLogEntry("goal.share", request, {
          userId,
          resourceId: goalId,
          action: "Share goal",
          details: { toUserId },
          success,
          error,
        })
      );
    },
  },

  /**
   * Log transaction events
   */
  transaction: {
    create: async (
      request: Request,
      userId: string,
      transactionId: string,
      goalId: string,
      amount: number,
      type: "deposit" | "withdrawal",
      success: boolean,
      error?: string
    ) => {
      await logAuditEvent(
        createAuditLogEntry("transaction.create", request, {
          userId,
          resourceId: transactionId,
          action: `Create ${type} transaction`,
          details: { goalId, amount, type },
          success,
          error,
        })
      );
    },
  },

  /**
   * Log authorization failures
   */
  authorization: {
    failed: async (
      request: Request,
      userId: string | undefined,
      resourceId: string | undefined,
      action: string
    ) => {
      await logAuditEvent(
        createAuditLogEntry("authorization.failed", request, {
          userId,
          resourceId,
          action,
          success: false,
          error: "Unauthorized access attempt",
        })
      );
    },
  },

  /**
   * Log rate limit violations
   */
  rateLimit: {
    exceeded: async (
      request: Request,
      userId: string | undefined,
      endpoint: string
    ) => {
      await logAuditEvent(
        createAuditLogEntry("rate_limit.exceeded", request, {
          userId,
          action: "Rate limit exceeded",
          details: { endpoint },
          success: false,
          error: "Too many requests",
        })
      );
    },
  },

  /**
   * Log user search events
   */
  user: {
    search: async (
      request: Request,
      userId: string,
      query: string,
      resultCount: number,
      success: boolean,
      error?: string
    ) => {
      await logAuditEvent(
        createAuditLogEntry("user.search", request, {
          userId,
          action: "Search users",
          details: { query, resultCount },
          success,
          error,
        })
      );
    },
  },

  /**
   * Log server errors
   */
  error: {
    server: async (
      request: Request,
      userId: string | undefined,
      endpoint: string,
      errorMessage: string
    ) => {
      await logAuditEvent(
        createAuditLogEntry("error.server", request, {
          userId,
          action: "Server error",
          details: { endpoint },
          success: false,
          error: errorMessage,
        })
      );
    },
  },
};
