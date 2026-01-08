import { NextRequest, NextResponse } from "next/server";
import { getStudentProgress, getCourseProgress } from "@/lib/firebase/learning";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const courseId = searchParams.get("courseId");

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    if (courseId) {
      const progress = await getCourseProgress(studentId, courseId);
      return NextResponse.json({ progress });
    }

    const allProgress = await getStudentProgress(studentId);
    return NextResponse.json({ progress: allProgress });
  } catch (error) {
    console.error("Error fetching progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 }
    );
  }
}
