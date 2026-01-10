import { NextRequest, NextResponse } from "next/server";
import { updateStudent } from "@/lib/firebase/firestore";

/**
 * Student Profile Update API
 * 
 * POST: Update student profile with merged data from resume extraction
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, updates } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID required" },
        { status: 400 }
      );
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 }
      );
    }

    // Validate allowed update fields
    const allowedFields = [
      "skills",
      "education", 
      "experience",
      "projects",
      "certifications",
      "achievements",
      "resumeExtractedSkills",
      "resumeExtractedEducation",
      "resumeExtractedExperience",
    ];

    const filteredUpdates: Record<string, unknown> = {};
    for (const key of Object.keys(updates)) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { error: "No valid update fields provided" },
        { status: 400 }
      );
    }

    // Add updated timestamp
    filteredUpdates.updatedAt = new Date();

    await updateStudent(studentId, filteredUpdates);

    console.log(`[Student Update] Updated profile for ${studentId}:`, Object.keys(filteredUpdates));

    return NextResponse.json({
      success: true,
      updatedFields: Object.keys(filteredUpdates),
    });
  } catch (error) {
    console.error("[Student Update] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update profile" },
      { status: 500 }
    );
  }
}
