import { NextRequest, NextResponse } from "next/server";
import { collection, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export async function POST(request: NextRequest) {
  try {
    const { generationId, suggestionId, action } = await request.json();

    if (!generationId || !suggestionId || !action) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const generationRef = doc(db!, "ai_resume_generations", generationId);
    const generationSnap = await getDoc(generationRef);

    if (!generationSnap.exists()) {
      return NextResponse.json(
        { error: "Generation not found" },
        { status: 404 }
      );
    }

    if (action === "accept") {
      await updateDoc(generationRef, {
        acceptedSuggestions: arrayUnion(suggestionId),
        rejectedSuggestions: arrayRemove(suggestionId),
      });
    } else if (action === "reject") {
      await updateDoc(generationRef, {
        rejectedSuggestions: arrayUnion(suggestionId),
        acceptedSuggestions: arrayRemove(suggestionId),
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'accept' or 'reject'" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Suggestion ${action}ed successfully`,
    });
  } catch (error) {
    console.error("Error updating suggestion:", error);
    return NextResponse.json(
      { error: "Failed to update suggestion" },
      { status: 500 }
    );
  }
}
