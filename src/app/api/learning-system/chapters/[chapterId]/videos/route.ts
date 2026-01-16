import { NextRequest, NextResponse } from "next/server";
import { getOrFetchChapterVideos } from "@/lib/ai/learning-service";

/**
 * POST /api/learning-system/chapters/[chapterId]/videos
 * Fetch YouTube videos for a chapter (cache-first)
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

    const { videos, cached, fallbackUrl } = await getOrFetchChapterVideos(chapterId);

    return NextResponse.json({
      success: true,
      videos,
      cached,
      fallbackUrl,
    });
  } catch (error) {
    console.error("[Learning API] POST videos error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch videos" },
      { status: 500 }
    );
  }
}
