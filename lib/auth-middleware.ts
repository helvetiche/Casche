import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebase-admin';

export interface AuthenticatedRequest extends NextRequest {
  user: {
    uid: string;
    email?: string;
    displayName?: string;
  };
}

/**
 * Middleware to verify Firebase ID token from Authorization header
 * Returns authenticated user info or error response
 */
export async function verifyFirebaseToken(request: NextRequest): Promise<{
  user: { uid: string; email?: string; displayName?: string } | null;
  error: NextResponse | null;
}> {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        user: null,
        error: NextResponse.json(
          { error: 'Missing or invalid authorization header' },
          { status: 401 }
        ),
      };
    }

    const idToken = authHeader.split('Bearer ')[1];

    if (!idToken) {
      return {
        user: null,
        error: NextResponse.json(
          { error: 'Missing ID token' },
          { status: 401 }
        ),
      };
    }

    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    return {
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      ),
    };
  }
}

/**
 * Helper function to verify that the authenticated user matches the requested user ID
 */
export function verifyUserAuthorization(
  authenticatedUserId: string,
  requestedUserId: string
): NextResponse | null {
  if (authenticatedUserId !== requestedUserId) {
    return NextResponse.json(
      { error: 'Unauthorized: Cannot perform action on behalf of another user' },
      { status: 403 }
    );
  }
  return null;
}