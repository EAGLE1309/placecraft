import {
  LearningSubject,
  LearningChapter,
  CreateSubjectInput,
  CreateChapterInput,
  AIRoadmapResponse,
  AIChapterOverview,
  AIStudyNotes,
  YouTubeVideo,
} from "@/types/learning";
import {
  getSubjectByName,
  getSubjectById,
  getOrCreateSubject,
  updateSubjectRoadmap,
  updateSubjectChaptersMeta,
  getChaptersBySubjectId,
  getChapterById,
  createChaptersBatch,
  updateChapterOverview,
  updateChapterNotes,
  updateChapterVideos,
  normalizeSubjectName,
  getDisplayName,
} from "@/lib/firebase/learning-system";
import {
  generateLearningJSON,
  createRoadmapPrompt,
  createChapterOverviewPrompt,
  createStudyNotesPrompt,
  inferDifficulty,
  estimateHours,
} from "./learning-gemini";
import { searchYouTubeVideos, buildVideoSearchQuery, getYouTubeSearchUrl } from "@/lib/youtube/search";

/**
 * Learning Content Service
 * Implements cache-first logic for all AI-generated content
 * Content is cached directly in the Firebase documents (not a separate cache table)
 */

// ==================== SUBJECT & ROADMAP ====================

/**
 * Get or create a subject for a skill, including roadmap generation
 * Cache-first: checks Firebase first, generates only if not exists
 */
export async function getOrGenerateSubjectWithRoadmap(
  skillName: string,
  learningType?: string
): Promise<{ subject: LearningSubject; cached: boolean }> {
  const normalizedName = normalizeSubjectName(skillName);
  const displayName = getDisplayName(skillName);

  // Step 1: Check if subject exists
  let subject = await getSubjectByName(normalizedName);

  if (subject) {
    // Subject exists, check if roadmap is cached
    if (subject.roadmap) {
      return { subject, cached: true };
    }

    // Subject exists but no roadmap - generate it
    const roadmapResponse = await generateRoadmapForSubject(subject);

    // Update subject with roadmap
    await updateSubjectRoadmap(subject.id, roadmapResponse.roadmap.overview);

    return {
      subject: {
        ...subject,
        roadmap: roadmapResponse.roadmap.overview,
      },
      cached: false,
    };
  }

  // Step 2: Create new subject
  const difficulty = inferDifficulty(skillName, learningType);
  const hours = estimateHours(difficulty);

  const input: CreateSubjectInput = {
    subjectName: normalizedName,
    displayName,
    description: `Learn ${displayName} from the ground up with our structured learning path.`,
    difficulty,
    estimatedHours: hours,
    prerequisites: [],
  };

  const { subject: newSubject } = await getOrCreateSubject(input);

  // Step 3: Generate roadmap for new subject
  const roadmapResponse = await generateRoadmapForSubject(newSubject);

  // Update subject with roadmap
  await updateSubjectRoadmap(newSubject.id, roadmapResponse.roadmap.overview);

  return {
    subject: {
      ...newSubject,
      roadmap: roadmapResponse.roadmap.overview,
    },
    cached: false,
  };
}

/**
 * Generate roadmap using AI (internal helper)
 */
async function generateRoadmapForSubject(subject: LearningSubject): Promise<AIRoadmapResponse> {
  const prompt = createRoadmapPrompt(subject.displayName, subject.difficulty);
  return await generateLearningJSON<AIRoadmapResponse>(prompt);
}

// ==================== CHAPTERS ====================

/**
 * Get or generate chapters for a subject
 * Cache-first: checks Firebase first, generates only if not exists
 */
export async function getOrGenerateChapters(
  subjectId: string
): Promise<{ chapters: LearningChapter[]; cached: boolean }> {
  // Step 1: Check if chapters already exist in DB
  const existingChapters = await getChaptersBySubjectId(subjectId);

  if (existingChapters.length > 0) {
    return { chapters: existingChapters, cached: true };
  }

  // Step 2: Get subject details
  const subject = await getSubjectById(subjectId);
  if (!subject) {
    throw new Error("Subject not found");
  }

  // Step 3: Generate chapters using AI
  const prompt = createRoadmapPrompt(subject.displayName, subject.difficulty);
  const roadmapResponse = await generateLearningJSON<AIRoadmapResponse>(prompt);

  // Step 4: Create chapter documents
  const chapterInputs: CreateChapterInput[] = roadmapResponse.chapters.map((ch) => ({
    subjectId,
    subjectName: subject.displayName,
    chapterNumber: ch.chapterNumber,
    title: ch.title,
    description: ch.description,
    estimatedMinutes: ch.estimatedMinutes,
  }));

  const chapters = await createChaptersBatch(chapterInputs);

  // Step 5: Update subject metadata
  await updateSubjectChaptersMeta(subjectId, chapters.length);

  // Also update roadmap if not already set
  if (!subject.roadmap) {
    await updateSubjectRoadmap(subjectId, roadmapResponse.roadmap.overview);
  }

  return { chapters, cached: false };
}

// ==================== CHAPTER CONTENT ====================

/**
 * Get or generate chapter overview and concepts
 * Cache-first: checks if overview exists in chapter document
 */
export async function getOrGenerateChapterOverview(
  chapterId: string
): Promise<{ chapter: LearningChapter; cached: boolean }> {
  // Step 1: Get chapter from DB
  const chapter = await getChapterById(chapterId);
  if (!chapter) {
    throw new Error("Chapter not found");
  }

  // Step 2: Check if overview is already cached
  if (chapter.overview && chapter.concepts && chapter.concepts.length > 0) {
    return { chapter, cached: true };
  }

  // Step 3: Generate overview using AI
  const prompt = createChapterOverviewPrompt(
    chapter.subjectName,
    chapter.title,
    chapter.description
  );
  const overviewResponse = await generateLearningJSON<AIChapterOverview>(prompt);

  // Step 4: Update chapter with generated content
  await updateChapterOverview(
    chapterId,
    overviewResponse.overview,
    overviewResponse.concepts
  );

  return {
    chapter: {
      ...chapter,
      overview: overviewResponse.overview,
      concepts: overviewResponse.concepts,
    },
    cached: false,
  };
}

/**
 * Get or generate AI study notes for a chapter
 * Cache-first: checks if notes exist in chapter document
 * Only generates when explicitly requested (user clicks "Generate Notes")
 */
export async function getOrGenerateChapterNotes(
  chapterId: string
): Promise<{ notes: string; cached: boolean }> {
  // Step 1: Get chapter from DB
  const chapter = await getChapterById(chapterId);
  if (!chapter) {
    throw new Error("Chapter not found");
  }

  // Step 2: Check if notes are already cached
  if (chapter.aiNotes) {
    console.log("[Learning Service] Notes already cached for chapter:", chapterId, "\n" + chapter.aiNotes);
    return { notes: chapter.aiNotes, cached: true };
  }

  // Step 3: Ensure we have concepts (needed for notes generation)
  let concepts = chapter.concepts;
  if (!concepts || concepts.length === 0) {
    // Generate overview first to get concepts
    const { chapter: updatedChapter } = await getOrGenerateChapterOverview(chapterId);
    concepts = updatedChapter.concepts || [];
  }

  // Step 4: Generate notes using AI with retry mechanism
  const prompt = createStudyNotesPrompt(
    chapter.subjectName,
    chapter.title,
    concepts
  );

  let notesResponse: AIStudyNotes | undefined;
  let lastError: Error | null = null;

  // Try up to 3 times with exponential backoff
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`[Learning Service] Generating notes attempt ${attempt}/3 for chapter:`, chapterId);
      notesResponse = await generateLearningJSON<AIStudyNotes>(prompt);
      console.log("[Learning Service] Generated notes for chapter:", chapterId, "\n" + notesResponse.notes);
      break; // Success, exit retry loop
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");
      console.error(`[Learning Service] Notes generation attempt ${attempt} failed:`, lastError);

      if (attempt < 3) {
        // Wait before retrying (exponential backoff: 1s, 2s)
        const waitTime = Math.pow(2, attempt - 1) * 1000;
        console.log(`[Learning Service] Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // If all attempts failed, throw the last error
  if (!notesResponse) {
    throw lastError || new Error("Failed to generate notes after multiple attempts");
  }

  // Step 5: Update chapter with generated notes
  await updateChapterNotes(chapterId, notesResponse.notes);

  return { notes: notesResponse.notes, cached: false };
}

// ==================== VIDEOS ====================

/**
 * Get or fetch YouTube videos for a chapter
 * Cache-first: checks if videos exist in chapter document
 */
export async function getOrFetchChapterVideos(
  chapterId: string
): Promise<{ videos: YouTubeVideo[]; cached: boolean; fallbackUrl?: string }> {
  // Step 1: Get chapter from DB
  const chapter = await getChapterById(chapterId);
  if (!chapter) {
    throw new Error("Chapter not found");
  }

  // Step 2: Check if videos are already cached
  if (chapter.videos && chapter.videos.length > 0) {
    return { videos: chapter.videos, cached: true };
  }

  // Step 3: Try to fetch videos from YouTube API
  const searchQuery = buildVideoSearchQuery(chapter.subjectName, chapter.title);

  try {
    const videos = await searchYouTubeVideos(searchQuery, 5);

    if (videos.length > 0) {
      // Step 4: Cache videos in chapter document
      await updateChapterVideos(chapterId, videos);
      return { videos, cached: false };
    }

    // No videos found, return fallback URL
    return {
      videos: [],
      cached: false,
      fallbackUrl: getYouTubeSearchUrl(searchQuery),
    };
  } catch (error) {
    console.error("[Learning Service] YouTube API error:", error);
    // Return fallback URL on API error
    return {
      videos: [],
      cached: false,
      fallbackUrl: getYouTubeSearchUrl(searchQuery),
    };
  }
}

// ==================== UTILITY ====================

/**
 * Get full chapter details (overview + concepts)
 * Used when opening a chapter page
 */
export async function getChapterWithContent(
  chapterId: string
): Promise<LearningChapter> {
  const { chapter } = await getOrGenerateChapterOverview(chapterId);
  return chapter;
}

/**
 * Check if a subject exists for a skill
 */
export async function checkSubjectExists(skillName: string): Promise<{
  exists: boolean;
  subject?: LearningSubject;
  hasRoadmap: boolean;
  hasChapters: boolean;
}> {
  const subject = await getSubjectByName(skillName);

  if (!subject) {
    return { exists: false, hasRoadmap: false, hasChapters: false };
  }

  return {
    exists: true,
    subject,
    hasRoadmap: !!subject.roadmap,
    hasChapters: subject.chaptersGenerated,
  };
}
