import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { QuickSubmitButton, Goal } from "@/lib/types/goals";
import { verifyFirebaseToken } from "@/lib/auth-middleware";
import { validateString, validateAmount } from "@/lib/security-utils";
import { validateRequestSize } from "@/lib/request-size-middleware";
import { auditLog } from "@/lib/audit-logger";
import { withRateLimit } from "@/lib/rate-limiter";
import { validateCSRFToken } from "@/lib/csrf-middleware";

const db = admin.firestore();

// GET - Get quick submit buttons for goal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  let user: { uid: string; email?: string; displayName?: string } | null = null;
  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await verifyFirebaseToken(request);
    if (authResult.error) return authResult.error;
    user = authResult.user;

    const { goalId } = await params;

    if (!goalId) {
      return NextResponse.json(
        { error: "Goal ID is required" },
        { status: 400 }
      );
    }

    // Check if user is owner or member
    const goalDoc = await db.collection("goals").doc(goalId).get();

    if (!goalDoc.exists) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const goalData = goalDoc.data() as Goal;

    const memberDoc = await db
      .collection("goalMembers")
      .where("goalId", "==", goalId)
      .where("userId", "==", user!.uid)
      .limit(1)
      .get();

    if (memberDoc.empty && goalData.userId !== user!.uid) {
      return NextResponse.json(
        { error: "Unauthorized to view quick submit buttons" },
        { status: 403 }
      );
    }

    const quickSubmitSnapshot = await db
      .collection("quickSubmitButtons")
      .where("goalId", "==", goalId)
      .orderBy("order", "asc")
      .get();

    const quickSubmitButtons: QuickSubmitButton[] =
      quickSubmitSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as QuickSubmitButton)
      );

    return NextResponse.json({ quickSubmitButtons });
  } catch (error) {
    await auditLog.error.server(
      request,
      user?.uid,
      "/api/goals/[goalId]/quick-submit",
      "Failed to fetch quick submit buttons"
    );
    return NextResponse.json(
      { error: "Failed to fetch quick submit buttons" },
      { status: 500 }
    );
  }
}

// POST - Create/update quick submit button
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  let user: { uid: string; email?: string; displayName?: string } | null = null;
  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await verifyFirebaseToken(request);
    if (authResult.error) return authResult.error;
    user = authResult.user;

    // Validate CSRF token
    const csrfCheck = validateCSRFToken(request);
    if (csrfCheck) return csrfCheck;

    const { goalId } = await params;

    // Validate request body size
    const sizeCheck = validateRequestSize(request);
    if (sizeCheck) return sizeCheck;

    const body = await request.json();
    const { id, label, amount, order } = body;

    // Validate inputs
    let validatedLabel: string;
    let validatedAmount: number;
    let validatedOrder: number;

    try {
      validatedLabel = validateString(label, "Label", 100, true);
      validatedAmount = validateAmount(amount);
      validatedOrder =
        order !== undefined
          ? typeof order === "number" && order >= 0
            ? Math.floor(order)
            : (() => {
                throw new Error("Order must be a non-negative integer");
              })()
          : 0;
    } catch (validationError) {
      return NextResponse.json(
        {
          error:
            validationError instanceof Error
              ? validationError.message
              : "Invalid input",
        },
        { status: 400 }
      );
    }

    // Check if user is owner or member
    const goalDoc = await db.collection("goals").doc(goalId).get();

    if (!goalDoc.exists) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const goalData = goalDoc.data() as Goal;

    const memberDoc = await db
      .collection("goalMembers")
      .where("goalId", "==", goalId)
      .where("userId", "==", user!.uid)
      .limit(1)
      .get();

    if (memberDoc.empty && goalData.userId !== user!.uid) {
      return NextResponse.json(
        { error: "Unauthorized to manage quick submit buttons" },
        { status: 403 }
      );
    }

    // If id provided, update existing; otherwise create new
    if (id) {
      const buttonRef = db.collection("quickSubmitButtons").doc(id);
      const buttonDoc = await buttonRef.get();

      if (!buttonDoc.exists) {
        return NextResponse.json(
          { error: "Quick submit button not found" },
          { status: 404 }
        );
      }

      await buttonRef.update({
        label: validatedLabel,
        amount: validatedAmount,
        order:
          order !== undefined ? validatedOrder : buttonDoc.data()?.order || 0,
      });

      // Log quick submit button update
      await auditLog.goal.update(request, user!.uid, goalId, true);

      const updatedButtonDoc = await buttonRef.get();
      const quickSubmitButton: QuickSubmitButton = {
        id: updatedButtonDoc.id,
        ...updatedButtonDoc.data(),
      } as QuickSubmitButton;

      return NextResponse.json({ quickSubmitButton });
    } else {
      // Create new button
      // Get max order to append at end
      const existingButtonsSnapshot = await db
        .collection("quickSubmitButtons")
        .where("goalId", "==", goalId)
        .orderBy("order", "desc")
        .limit(1)
        .get();

      const maxOrder = existingButtonsSnapshot.empty
        ? 0
        : (existingButtonsSnapshot.docs[0].data().order as number) + 1;

      const buttonRef = db.collection("quickSubmitButtons").doc();
      const buttonData: Omit<QuickSubmitButton, "id"> = {
        goalId,
        label: validatedLabel,
        amount: validatedAmount,
        order: order !== undefined ? validatedOrder : maxOrder,
      };

      await buttonRef.set(buttonData);

      // Log quick submit button creation
      await auditLog.goal.update(request, user!.uid, goalId, true);

      const quickSubmitButton: QuickSubmitButton = {
        id: buttonRef.id,
        ...buttonData,
      };

      return NextResponse.json({ quickSubmitButton }, { status: 201 });
    }
  } catch (error) {
    await auditLog.error.server(
      request,
      user?.uid,
      "/api/goals/[goalId]/quick-submit",
      "Failed to save quick submit button"
    );
    return NextResponse.json(
      { error: "Failed to save quick submit button" },
      { status: 500 }
    );
  }
}

// DELETE - Remove quick submit button
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  let user: { uid: string; email?: string; displayName?: string } | null = null;
  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await verifyFirebaseToken(request);
    if (authResult.error) return authResult.error;
    user = authResult.user;

    // Validate CSRF token
    const csrfCheck = validateCSRFToken(request);
    if (csrfCheck) return csrfCheck;

    const { goalId } = await params;
    const { searchParams } = new URL(request.url);
    const buttonId = searchParams.get("buttonId");

    if (!buttonId) {
      return NextResponse.json(
        { error: "Button ID is required" },
        { status: 400 }
      );
    }

    // Check if user is owner or member
    const goalDoc = await db.collection("goals").doc(goalId).get();

    if (!goalDoc.exists) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const goalData = goalDoc.data() as Goal;

    const memberDoc = await db
      .collection("goalMembers")
      .where("goalId", "==", goalId)
      .where("userId", "==", user!.uid)
      .limit(1)
      .get();

    if (memberDoc.empty && goalData.userId !== user!.uid) {
      return NextResponse.json(
        { error: "Unauthorized to delete quick submit buttons" },
        { status: 403 }
      );
    }

    const buttonRef = db.collection("quickSubmitButtons").doc(buttonId);
    const buttonDoc = await buttonRef.get();

    if (!buttonDoc.exists) {
      return NextResponse.json(
        { error: "Quick submit button not found" },
        { status: 404 }
      );
    }

    const buttonData = buttonDoc.data() as QuickSubmitButton;

    if (buttonData.goalId !== goalId) {
      return NextResponse.json(
        { error: "Button does not belong to this goal" },
        { status: 400 }
      );
    }

    await buttonRef.delete();

    // Log quick submit button deletion
    await auditLog.goal.update(request, user!.uid, goalId, true);

    return NextResponse.json({ success: true });
  } catch (error) {
    await auditLog.error.server(
      request,
      user?.uid,
      "/api/goals/[goalId]/quick-submit",
      "Failed to delete quick submit button"
    );
    return NextResponse.json(
      { error: "Failed to delete quick submit button" },
      { status: 500 }
    );
  }
}
