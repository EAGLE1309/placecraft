import { NextRequest, NextResponse } from "next/server";
import { getResumeHistory } from "@/lib/firebase/firestore";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    const history = await getResumeHistory(studentId);

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Error fetching resume history:", error);
    return NextResponse.json(
      { error: "Failed to fetch resume history" },
      { status: 500 }
    );
  }
}
