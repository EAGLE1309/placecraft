import { NextRequest, NextResponse } from "next/server";
import { generateAIResume } from "@/lib/ai/resume-generator";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { StudentProfile, ResumeGenerationRequest } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const requestData: ResumeGenerationRequest = await request.json();

    if (!requestData.studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    const studentRef = doc(db!, "students", requestData.studentId);
    const studentSnap = await getDoc(studentRef);

    if (!studentSnap.exists()) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    const studentProfile = {
      id: studentSnap.id,
      ...studentSnap.data(),
    } as StudentProfile;

    const generation = await generateAIResume(studentProfile, requestData);

    return NextResponse.json({
      success: true,
      generation,
    });
  } catch (error) {
    console.error("Error generating resume:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate resume" },
      { status: 500 }
    );
  }
}
