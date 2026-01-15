import { NextRequest, NextResponse } from "next/server";
import {
  getSubjectProgress,
  getStudentLearningProgress,
  startLearningSubject,
  markChapterComplete,
  unmarkChapterComplete,
  trackNotesViewed,
  trackVideosViewed,
} from "@/lib/firebase/learning-system";

/**
 * GET /api/learning-system/progress?studentId=xxx&subjectId=xxx
 * Get learning progress for a student
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const subjectId = searchParams.get("subjectId");

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: "studentId is required" },
        { status: 400 }
      );
    }

    if (subjectId) {
      // Get progress for specific subject
      const progress = await getSubjectProgress(studentId, subjectId);
      return NextResponse.json({
        success: true,
        progress,
      });
    } else {
      // Get all progress for student
      const progressList = await getStudentLearningProgress(studentId);
      return NextResponse.json({
        success: true,
        progressList,
      });
    }
  } catch (error) {
    console.error("[Learning API] GET progress error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to get progress" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/learning-system/progress
 * Start learning a subject or update progress
 * Body: { 
 *   studentId: string, 
 *   subjectId: string, 
 *   subjectName: string,
 *   action: "start" | "complete-chapter" | "uncomplete-chapter" | "track-notes" | "track-videos",
 *   chapterId?: string,
 *   totalChapters?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, subjectId, subjectName, action, chapterId, totalChapters } = body;

    if (!studentId || !subjectId) {
      return NextResponse.json(
        { success: false, error: "studentId and subjectId are required" },
        { status: 400 }
      );
    }

    switch (action) {
      case "start": {
        if (!subjectName) {
          return NextResponse.json(
            { success: false, error: "subjectName is required for start action" },
            { status: 400 }
          );
        }
        const progress = await startLearningSubject(studentId, subjectId, subjectName);
        return NextResponse.json({ success: true, progress });
      }

      case "complete-chapter": {
        if (!chapterId || !totalChapters) {
          return NextResponse.json(
            { success: false, error: "chapterId and totalChapters are required" },
            { status: 400 }
          );
        }
        const progress = await markChapterComplete(studentId, subjectId, chapterId, totalChapters);
        return NextResponse.json({ success: true, progress });
      }

      case "uncomplete-chapter": {
        if (!chapterId || !totalChapters) {
          return NextResponse.json(
            { success: false, error: "chapterId and totalChapters are required" },
            { status: 400 }
          );
        }
        const progress = await unmarkChapterComplete(studentId, subjectId, chapterId, totalChapters);
        return NextResponse.json({ success: true, progress });
      }

      case "track-notes": {
        if (!chapterId) {
          return NextResponse.json(
            { success: false, error: "chapterId is required" },
            { status: 400 }
          );
        }
        await trackNotesViewed(studentId, subjectId, chapterId);
        return NextResponse.json({ success: true });
      }

      case "track-videos": {
        if (!chapterId) {
          return NextResponse.json(
            { success: false, error: "chapterId is required" },
            { status: 400 }
          );
        }
        await trackVideosViewed(studentId, subjectId, chapterId);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[Learning API] POST progress error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update progress" },
      { status: 500 }
    );
  }
}
