import { NextRequest, NextResponse } from "next/server";
import { getOrGenerateChapters } from "@/lib/ai/learning-service";
import { getChaptersBySubjectId } from "@/lib/firebase/learning-system";

/**
 * GET /api/learning-system/chapters?subjectId=xxx
 * Get chapters for a subject (cache-first, no generation)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subjectId");

    if (!subjectId) {
      return NextResponse.json(
        { success: false, error: "subjectId is required" },
        { status: 400 }
      );
    }

    const chapters = await getChaptersBySubjectId(subjectId);

    return NextResponse.json({
      success: true,
      chapters,
      cached: true,
      hasChapters: chapters.length > 0,
    });
  } catch (error) {
    console.error("[Learning API] GET chapters error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to get chapters" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/learning-system/chapters
 * Generate chapters for a subject (if not already generated)
 * Body: { subjectId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subjectId } = body;

    if (!subjectId) {
      return NextResponse.json(
        { success: false, error: "subjectId is required" },
        { status: 400 }
      );
    }

    const { chapters, cached } = await getOrGenerateChapters(subjectId);

    return NextResponse.json({
      success: true,
      chapters,
      cached,
    });
  } catch (error) {
    console.error("[Learning API] POST chapters error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to generate chapters" },
      { status: 500 }
    );
  }
}
