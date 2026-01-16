import { NextRequest, NextResponse } from "next/server";
import { getOrGenerateChapterNotes } from "@/lib/ai/learning-service";

/**
 * POST /api/learning-system/chapters/[chapterId]/notes
 * Generate AI study notes for a chapter (cache-first)
 * Only called when user explicitly clicks "Generate Notes"
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  try {
    const { chapterId } = await params;

    if (!chapterId) {
      return NextResponse.json(
        { success: false, error: "chapterId is required" },
        { status: 400 }
      );
    }

    const { notes, cached } = await getOrGenerateChapterNotes(chapterId);

    return NextResponse.json({
      success: true,
      notes,
      cached,
    });
  } catch (error) {
    console.error("[Learning API] POST notes error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to generate notes" },
      { status: 500 }
    );
  }
}
