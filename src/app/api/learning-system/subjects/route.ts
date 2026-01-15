import { NextRequest, NextResponse } from "next/server";
import { getOrGenerateSubjectWithRoadmap, checkSubjectExists } from "@/lib/ai/learning-service";
import { getSubjectById } from "@/lib/firebase/learning-system";

/**
 * GET /api/learning-system/subjects?skillName=react
 * Get or create a subject for a skill (with roadmap generation)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skillName = searchParams.get("skillName");
    const subjectId = searchParams.get("subjectId");

    // If subjectId is provided, get by ID
    if (subjectId) {
      const subject = await getSubjectById(subjectId);
      if (!subject) {
        return NextResponse.json(
          { success: false, error: "Subject not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        subject,
        cached: true,
      });
    }

    // If skillName is provided, check if subject exists
    if (skillName) {
      const result = await checkSubjectExists(skillName);
      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    return NextResponse.json(
      { success: false, error: "skillName or subjectId is required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Learning API] GET subjects error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to get subject" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/learning-system/subjects
 * Create/get subject with roadmap generation
 * Body: { skillName: string, learningType?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { skillName, learningType } = body;

    if (!skillName) {
      return NextResponse.json(
        { success: false, error: "skillName is required" },
        { status: 400 }
      );
    }

    const { subject, cached } = await getOrGenerateSubjectWithRoadmap(skillName, learningType);

    return NextResponse.json({
      success: true,
      subject,
      cached,
    });
  } catch (error) {
    console.error("[Learning API] POST subjects error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create subject" },
      { status: 500 }
    );
  }
}
