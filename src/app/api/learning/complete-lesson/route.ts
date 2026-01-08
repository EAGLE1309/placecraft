import { NextRequest, NextResponse } from "next/server";
import { completeLesson, unmarkLesson } from "@/lib/firebase/learning";

export async function POST(request: NextRequest) {
  try {
    const { studentId, courseId, lessonId, action } = await request.json();

    if (!studentId || !courseId || !lessonId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (action === "unmark") {
      const result = await unmarkLesson(studentId, courseId, lessonId);
      return NextResponse.json({
        success: true,
        message: "Lesson unmarked successfully",
        progress: result.progress,
        skillsRemoved: result.skillsRemoved,
      });
    }

    const result = await completeLesson(studentId, courseId, lessonId);

    return NextResponse.json({
      success: true,
      message: "Lesson completed successfully",
      progress: result.progress,
      skillsAdded: result.skillsAdded,
    });
  } catch (error) {
    console.error("Error completing lesson:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to complete lesson" },
      { status: 500 }
    );
  }
}
