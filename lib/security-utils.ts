/**
 * Security utilities for input validation and sanitization
 */

// Maximum values for validation
export const MAX_AMOUNT = 999999999.99; // ~1 billion
export const MAX_STRING_LENGTH = 1000;
export const MAX_TITLE_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 2000;
export const MAX_MESSAGE_LENGTH = 5000;

/**
 * Validates and sanitizes numeric amount
 */
export const validateAmount = (amount: unknown): number => {
  if (typeof amount !== "number" && typeof amount !== "string") {
    throw new Error("Amount must be a number");
  }

  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(numAmount) || !isFinite(numAmount)) {
    throw new Error("Amount must be a valid number");
  }

  if (numAmount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  if (numAmount > MAX_AMOUNT) {
    throw new Error(`Amount cannot exceed ${MAX_AMOUNT.toLocaleString()}`);
  }

  // Round to 2 decimal places
  return Math.round(numAmount * 100) / 100;
};

/**
 * Validates and sanitizes string input
 */
export const validateString = (
  value: unknown,
  fieldName: string,
  maxLength: number = MAX_STRING_LENGTH,
  required: boolean = true
): string => {
  if (value === null || value === undefined) {
    if (required) {
      throw new Error(`${fieldName} is required`);
    }
    return "";
  }

  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();

  if (required && trimmed.length === 0) {
    throw new Error(`${fieldName} cannot be empty`);
  }

  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} cannot exceed ${maxLength} characters`);
  }

  return trimmed;
};

/**
 * Validates URL format
 */
export const validateUrl = (url: unknown, required: boolean = false): string => {
  if (!url && !required) {
    return "";
  }

  const urlString = validateString(url, "URL", 2048, required);

  if (!urlString) {
    return "";
  }

  try {
    const parsedUrl = new URL(urlString);
    // Only allow http and https protocols
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("URL must use http or https protocol");
    }
    return urlString;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Invalid URL format");
    }
    throw error;
  }
};

/**
 * Validates email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates user ID format (Firebase UID)
 */
export const validateUserId = (userId: unknown): string => {
  const uid = validateString(userId, "User ID", 128, true);

  // Firebase UIDs are typically 28 characters, alphanumeric
  if (!/^[a-zA-Z0-9_-]+$/.test(uid)) {
    throw new Error("Invalid user ID format");
  }

  return uid;
};

/**
 * Validates goal ID format
 */
export const validateGoalId = (goalId: unknown): string => {
  return validateString(goalId, "Goal ID", 128, true);
};

/**
 * Sanitizes HTML to prevent XSS
 * Basic implementation - consider using DOMPurify for production
 */
export const sanitizeHtml = (html: string): string => {
  // Remove potentially dangerous characters
  return html
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
};

/**
 * Validates date string
 */
export const validateDate = (date: unknown): Date | null => {
  if (!date) {
    return null;
  }

  if (typeof date !== "string") {
    throw new Error("Date must be a string");
  }

  const parsedDate = new Date(date);

  if (isNaN(parsedDate.getTime())) {
    throw new Error("Invalid date format");
  }

  // Don't allow dates too far in the past or future
  const now = new Date();
  const minDate = new Date(1900, 0, 1);
  const maxDate = new Date(2100, 11, 31);

  if (parsedDate < minDate || parsedDate > maxDate) {
    throw new Error("Date must be between 1900 and 2100");
  }

  return parsedDate;
};

/**
 * Validates icon type
 */
export const validateIconType = (iconType: unknown): "phosphor" | "custom" => {
  if (iconType !== "phosphor" && iconType !== "custom") {
    throw new Error("Icon type must be 'phosphor' or 'custom'");
  }
  return iconType;
};

/**
 * Validates transaction type
 */
export const validateTransactionType = (
  type: unknown
): "deposit" | "withdrawal" => {
  if (type !== "deposit" && type !== "withdrawal") {
    throw new Error("Transaction type must be 'deposit' or 'withdrawal'");
  }
  return type;
};

/**
 * Validates action type for requests
 */
export const validateActionType = (
  action: unknown
): "accept" | "decline" | "send" | "cancel" => {
  if (
    action !== "accept" &&
    action !== "decline" &&
    action !== "send" &&
    action !== "cancel"
  ) {
    throw new Error(
      "Action must be 'accept', 'decline', 'send', or 'cancel'"
    );
  }
  return action;
};
