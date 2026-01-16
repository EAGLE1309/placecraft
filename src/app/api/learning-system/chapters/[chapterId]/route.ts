import { NextRequest, NextResponse } from "next/server";
import { getChapterWithContent } from "@/lib/ai/learning-service";
import { getChapterById } from "@/lib/firebase/learning-system";

/**
 * GET /api/learning-system/chapters/[chapterId]
 * Get a specific chapter with its content (overview + concepts)
 */
export async function GET(
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

    // Get chapter with content (generates overview if not cached)
    const chapter = await getChapterWithContent(chapterId);

    return NextResponse.json({
      success: true,
      chapter,
    });
  } catch (error) {
    console.error("[Learning API] GET chapter error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to get chapter" },
      { status: 500 }
    );
  }
}
