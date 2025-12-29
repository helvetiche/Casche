/**
 * Utility functions for making authenticated API requests with CSRF protection
 */

/**
 * Get CSRF token from cookie or fetch it from the server
 */
export const getCSRFToken = async (): Promise<string | null> => {
  // Try to read from cookie first
  if (typeof document !== "undefined") {
    const cookies = document.cookie.split(";");
    const csrfCookie = cookies.find((cookie) =>
      cookie.trim().startsWith("csrf-token=")
    );
    if (csrfCookie) {
      return csrfCookie.split("=")[1].trim();
    }
  }

  // If not in cookie, fetch from server
  try {
    const response = await fetch("/api/auth/csrf-token", {
      method: "GET",
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      return data.csrfToken || null;
    }
  } catch (error) {
    console.error("Error fetching CSRF token:", error);
  }

  return null;
};

/**
 * Make an authenticated API request with CSRF protection
 */
export const apiRequest = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const csrfToken = await getCSRFToken();

  const headers: HeadersInit = {
    ...options.headers,
  };

  // Add CSRF token to headers for POST, PUT, DELETE requests
  if (csrfToken && ["POST", "PUT", "DELETE", "PATCH"].includes(options.method || "GET")) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: "include", // Include cookies
  });
};
