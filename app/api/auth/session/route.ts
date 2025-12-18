import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase';
import { cookies } from 'next/headers';
import { signOut } from 'firebase/auth';

export async function GET(request: NextRequest) {
  try {
    // This is a client-side operation, so we'll just return a success response
    // The actual session management is handled by Firebase Auth on the client
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Sign out from Firebase Auth
    await signOut(auth);

    // Clear any server-side cookies if needed
    const cookieStore = cookies();
    // Add any custom cookies to clear here

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}