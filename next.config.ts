import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers configuration
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/:path*",
        headers: [
          // Prevent MIME type sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Prevent clickjacking
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // XSS protection (legacy browsers)
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // Control referrer information
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Content Security Policy
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Script sources - allow Firebase, Google Auth, and Google Analytics
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://www.google.com https://apis.google.com https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: https: blob:",
              // Connect sources - allow Firebase and Google API connections
              "connect-src 'self' https://*.googleapis.com https://apis.google.com https://*.googleusercontent.com https://fonts.gstatic.com https://www.googletagmanager.com https://*.firebaseio.com https://*.firebase.com wss://*.firebaseio.com https://www.google-analytics.com https://*.google-analytics.com",
              // Frame sources - allow Firebase and Google Auth iframes
              "frame-src 'self' https://*.google.com https://accounts.google.com https://*.firebaseapp.com https://*.firebase.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
          // Permissions Policy - restrict browser features
          {
            key: "Permissions-Policy",
            value: [
              "camera=()",
              "microphone=()",
              "geolocation=()",
              "interest-cohort=()",
            ].join(", "),
          },
          // Strict Transport Security (only if using HTTPS)
          {
            key: "Strict-Transport-Security",
            value:
              process.env.NODE_ENV === "production"
                ? "max-age=31536000; includeSubDomains; preload"
                : "max-age=0",
          },
        ],
      },
    ];
  },
  // Request size limits to prevent DoS attacks
  experimental: {
    // Limit request body size (10MB default, adjust as needed)
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
