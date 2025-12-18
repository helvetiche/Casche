import { NextRequest, NextResponse } from "next/server";
import { authAdmin } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const { uid } = await request.json();

    if (!uid) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Set custom claims for the user
    await authAdmin.setCustomUserClaims(uid, {
      role: "user",
      tier: "basic",
    });

    return NextResponse.json({
      success: true,
      message: "Custom claims set successfully",
    });
  } catch (error) {
    console.error("Error setting custom claims:", error);
    return NextResponse.json(
      { error: "Failed to set custom claims" },
      { status: 500 }
    );
  }
}
