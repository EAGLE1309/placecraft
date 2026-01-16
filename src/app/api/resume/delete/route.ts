import { NextRequest, NextResponse } from "next/server";
import { deleteResumeHistory } from "@/lib/firebase/firestore";

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, historyId } = body;

    if (!studentId || !historyId) {
      return NextResponse.json(
        { error: "Student ID and history ID are required" },
        { status: 400 }
      );
    }

    await deleteResumeHistory(studentId, historyId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting resume:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete resume" },
      { status: 500 }
    );
  }
}
