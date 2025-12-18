# Casche Landing Page Setup Guide

## Overview

The landing page has been implemented with:

- ✅ Retro design system following DESIGN.MD specifications
- ✅ Poppins font (weights 300-500)
- ✅ OAuth authentication with Google
- ✅ Firebase Auth SDK (client-side) + Firebase Admin SDK (server-side)
- ✅ Secure API route with comprehensive security headers

## Environment Variables Required

Create a `.env.local` file in the root directory with the following variables:

### Firebase Client Configuration (Public - Safe to expose)

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### Firebase Admin SDK (Server-side only - NEVER expose to client)

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
```

## Firebase Setup Steps

1. **Create Firebase Project**

   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or use existing one
   - Enable Google Authentication in Authentication > Sign-in method

2. **Get Client Configuration**

   - Go to Project Settings > General
   - Scroll to "Your apps" section
   - Add a web app if not already added
   - Copy the Firebase configuration object values

3. **Get Admin SDK Credentials**
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Download the JSON file
   - Extract `project_id`, `client_email`, and `private_key` values

## Files Created

### Landing Page

- `app/page.tsx` - Main landing page with title, subtitle, and OAuth button

### Components

- `components/auth/OAuthButton.tsx` - OAuth button component with Google sign-in

### Configuration

- `lib/firebase.ts` - Firebase client-side configuration
- `app/layout.tsx` - Updated with Poppins font
- `app/globals.css` - Updated with retro color palette

### API Routes

- `app/api/auth/login/route.ts` - OAuth authentication endpoint with:
  - Firebase Admin SDK token verification
  - Custom claims assignment (role: "users")
  - Comprehensive security headers
  - Minimal data exposure principle

## Design Implementation

The landing page follows DESIGN.MD retro design principles:

- **Typography**: Poppins font (weights 300-500)
- **Colors**: Retro palette (#F8F7F4 background, #000000 text, #4285F4 button)
- **Button Style**: Primary action button with:
  - Blue background (#4285F4)
  - White text
  - 3px black border
  - Drop shadow for 3D effect
  - Hover states with translation
- **Layout**: Centered, mobile-first responsive design

## Testing the Landing Page

1. Start the development server:

   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000`

3. Click "Start Saving" button to test OAuth flow

4. After successful authentication, user will be redirected to `/dashboard` (you'll need to create this route)

## Next Steps

1. Create `/dashboard` route for authenticated users
2. Implement user document creation in Firestore after first login
3. Add error handling and loading states
4. Add protected route middleware
5. Implement logout functionality

## Security Notes

- All Firebase Admin SDK credentials are server-side only
- Client only receives minimal user data (uid, email, displayName, photoURL)
- All API routes include comprehensive security headers
- OAuth tokens are verified server-side before any operations
- Custom claims are set for role-based access control
