import { NextRequest, NextResponse } from "next/server";
import { setFinalResume } from "@/lib/firebase/firestore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, historyId } = body;

    if (!studentId || !historyId) {
      return NextResponse.json(
        { error: "Student ID and history ID are required" },
        { status: 400 }
      );
    }

    await setFinalResume(studentId, historyId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting final resume:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to set final resume" },
      { status: 500 }
    );
  }
}
