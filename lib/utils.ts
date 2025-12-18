import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date in a readable format like "May 27, 2004"
 */
export function formatReadableDate(date: Date | string | number): string {
  const dateObj = new Date(date);

  if (isNaN(dateObj.getTime())) {
    return "Unknown date";
  }

  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  return dateObj.toLocaleDateString("en-US", options);
}
