import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  limit,
} from "firebase/firestore";
import { db } from "./config";
import {
  LearningSubject,
  LearningChapter,
  LearningSubjectProgress,
  CreateSubjectInput,
  CreateChapterInput,
  YouTubeVideo,
} from "@/types/learning";
import { v4 as uuidv4 } from "uuid";

// ==================== COLLECTION NAMES ====================
// These are NEW collections, not modifying existing ones
const LEARNING_SUBJECTS_COLLECTION = "learning_subjects";
const LEARNING_CHAPTERS_COLLECTION = "learning_chapters";
const LEARNING_PROGRESS_COLLECTION = "learning_subject_progress";

function getDb() {
  if (!db) {
    throw new Error("Firebase is not initialized. Check your environment variables.");
  }
  return db;
}

// ==================== SUBJECT FUNCTIONS ====================

/**
 * Get a subject by its normalized name (e.g., "react", "nodejs")
 */
export async function getSubjectByName(subjectName: string): Promise<LearningSubject | null> {
  const normalizedName = normalizeSubjectName(subjectName);
  const q = query(
    collection(getDb(), LEARNING_SUBJECTS_COLLECTION),
    where("subjectName", "==", normalizedName),
    limit(1)
  );
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return null;
  }
  
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as LearningSubject;
}

/**
 * Get a subject by ID
 */
export async function getSubjectById(subjectId: string): Promise<LearningSubject | null> {
  const docRef = doc(getDb(), LEARNING_SUBJECTS_COLLECTION, subjectId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return { id: docSnap.id, ...docSnap.data() } as LearningSubject;
}

/**
 * Create or get a subject (ensures no duplicates)
 */
export async function getOrCreateSubject(
  input: CreateSubjectInput
): Promise<{ subject: LearningSubject; created: boolean }> {
  const normalizedName = normalizeSubjectName(input.subjectName);
  
  // Check if already exists
  const existing = await getSubjectByName(normalizedName);
  if (existing) {
    return { subject: existing, created: false };
  }
  
  // Create new subject
  const id = uuidv4();
  const now = Timestamp.now();
  
  const subject: LearningSubject = {
    id,
    subjectName: normalizedName,
    displayName: input.displayName,
    description: input.description,
    difficulty: input.difficulty,
    estimatedHours: input.estimatedHours,
    prerequisites: input.prerequisites,
    chaptersGenerated: false,
    chapterCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  
  await setDoc(doc(getDb(), LEARNING_SUBJECTS_COLLECTION, id), subject);
  
  return { subject, created: true };
}

/**
 * Update subject with roadmap (cache)
 */
export async function updateSubjectRoadmap(
  subjectId: string,
  roadmap: string
): Promise<void> {
  const docRef = doc(getDb(), LEARNING_SUBJECTS_COLLECTION, subjectId);
  await updateDoc(docRef, {
    roadmap,
    roadmapGeneratedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

/**
 * Update subject chapters metadata
 */
export async function updateSubjectChaptersMeta(
  subjectId: string,
  chapterCount: number
): Promise<void> {
  const docRef = doc(getDb(), LEARNING_SUBJECTS_COLLECTION, subjectId);
  await updateDoc(docRef, {
    chaptersGenerated: true,
    chapterCount,
    updatedAt: Timestamp.now(),
  });
}

// ==================== CHAPTER FUNCTIONS ====================

/**
 * Get all chapters for a subject
 */
export async function getChaptersBySubjectId(subjectId: string): Promise<LearningChapter[]> {
  const q = query(
    collection(getDb(), LEARNING_CHAPTERS_COLLECTION),
    where("subjectId", "==", subjectId),
    orderBy("chapterNumber", "asc")
  );
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as LearningChapter[];
}

/**
 * Get a chapter by ID
 */
export async function getChapterById(chapterId: string): Promise<LearningChapter | null> {
  const docRef = doc(getDb(), LEARNING_CHAPTERS_COLLECTION, chapterId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return { id: docSnap.id, ...docSnap.data() } as LearningChapter;
}

/**
 * Create a chapter (used when generating chapters from AI)
 */
export async function createChapter(input: CreateChapterInput): Promise<LearningChapter> {
  const id = uuidv4();
  const now = Timestamp.now();
  
  const chapter: LearningChapter = {
    id,
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  
  await setDoc(doc(getDb(), LEARNING_CHAPTERS_COLLECTION, id), chapter);
  
  return chapter;
}

/**
 * Batch create chapters (more efficient)
 */
export async function createChaptersBatch(inputs: CreateChapterInput[]): Promise<LearningChapter[]> {
  const chapters: LearningChapter[] = [];
  const now = Timestamp.now();
  
  for (const input of inputs) {
    const id = uuidv4();
    const chapter: LearningChapter = {
      id,
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    
    await setDoc(doc(getDb(), LEARNING_CHAPTERS_COLLECTION, id), chapter);
    chapters.push(chapter);
  }
  
  return chapters;
}

/**
 * Update chapter with overview and concepts (cache)
 */
export async function updateChapterOverview(
  chapterId: string,
  overview: string,
  concepts: string[]
): Promise<void> {
  const docRef = doc(getDb(), LEARNING_CHAPTERS_COLLECTION, chapterId);
  const now = Timestamp.now();
  await updateDoc(docRef, {
    overview,
    concepts,
    overviewGeneratedAt: now,
    conceptsGeneratedAt: now,
    updatedAt: now,
  });
}

/**
 * Update chapter with AI notes (cache)
 */
export async function updateChapterNotes(
  chapterId: string,
  aiNotes: string
): Promise<void> {
  const docRef = doc(getDb(), LEARNING_CHAPTERS_COLLECTION, chapterId);
  await updateDoc(docRef, {
    aiNotes,
    aiNotesGeneratedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

/**
 * Update chapter with videos (cache)
 */
export async function updateChapterVideos(
  chapterId: string,
  videos: YouTubeVideo[]
): Promise<void> {
  const docRef = doc(getDb(), LEARNING_CHAPTERS_COLLECTION, chapterId);
  await updateDoc(docRef, {
    videos,
    videosGeneratedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

// ==================== PROGRESS FUNCTIONS ====================

/**
 * Get student's progress for a subject
 */
export async function getSubjectProgress(
  studentId: string,
  subjectId: string
): Promise<LearningSubjectProgress | null> {
  const q = query(
    collection(getDb(), LEARNING_PROGRESS_COLLECTION),
    where("studentId", "==", studentId),
    where("subjectId", "==", subjectId),
    limit(1)
  );
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return null;
  }
  
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as LearningSubjectProgress;
}

/**
 * Get all learning progress for a student
 */
export async function getStudentLearningProgress(
  studentId: string
): Promise<LearningSubjectProgress[]> {
  const q = query(
    collection(getDb(), LEARNING_PROGRESS_COLLECTION),
    where("studentId", "==", studentId),
    orderBy("lastAccessedAt", "desc")
  );
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as LearningSubjectProgress[];
}

/**
 * Start learning a subject (create progress entry)
 */
export async function startLearningSubject(
  studentId: string,
  subjectId: string,
  subjectName: string
): Promise<LearningSubjectProgress> {
  // Check if already started
  const existing = await getSubjectProgress(studentId, subjectId);
  if (existing) {
    // Update last accessed time
    const docRef = doc(getDb(), LEARNING_PROGRESS_COLLECTION, existing.id);
    await updateDoc(docRef, {
      lastAccessedAt: Timestamp.now(),
    });
    return { ...existing, lastAccessedAt: Timestamp.now() };
  }
  
  // Create new progress entry
  const id = uuidv4();
  const now = Timestamp.now();
  
  const progress: LearningSubjectProgress = {
    id,
    studentId,
    subjectId,
    subjectName,
    completedChapters: [],
    notesViewedChapters: [],
    videosViewedChapters: [],
    progressPercentage: 0,
    startedAt: now,
    lastAccessedAt: now,
  };
  
  await setDoc(doc(getDb(), LEARNING_PROGRESS_COLLECTION, id), progress);
  
  return progress;
}

/**
 * Mark a chapter as completed
 */
export async function markChapterComplete(
  studentId: string,
  subjectId: string,
  chapterId: string,
  totalChapters: number
): Promise<LearningSubjectProgress> {
  const progress = await getSubjectProgress(studentId, subjectId);
  if (!progress) {
    throw new Error("Progress not found. Start learning first.");
  }
  
  // Check if already completed
  if (progress.completedChapters.includes(chapterId)) {
    return progress;
  }
  
  const newCompletedChapters = [...progress.completedChapters, chapterId];
  const newProgressPercentage = Math.round((newCompletedChapters.length / totalChapters) * 100);
  const now = Timestamp.now();
  
  const updates: Partial<LearningSubjectProgress> = {
    completedChapters: newCompletedChapters,
    progressPercentage: newProgressPercentage,
    lastAccessedAt: now,
  };
  
  if (newProgressPercentage === 100) {
    updates.completedAt = now;
  }
  
  const docRef = doc(getDb(), LEARNING_PROGRESS_COLLECTION, progress.id);
  await updateDoc(docRef, updates);
  
  return {
    ...progress,
    ...updates,
  } as LearningSubjectProgress;
}

/**
 * Unmark a chapter as completed
 */
export async function unmarkChapterComplete(
  studentId: string,
  subjectId: string,
  chapterId: string,
  totalChapters: number
): Promise<LearningSubjectProgress> {
  const progress = await getSubjectProgress(studentId, subjectId);
  if (!progress) {
    throw new Error("Progress not found.");
  }
  
  // Check if not completed
  if (!progress.completedChapters.includes(chapterId)) {
    return progress;
  }
  
  const newCompletedChapters = progress.completedChapters.filter((id) => id !== chapterId);
  const newProgressPercentage = totalChapters > 0 
    ? Math.round((newCompletedChapters.length / totalChapters) * 100)
    : 0;
  
  const docRef = doc(getDb(), LEARNING_PROGRESS_COLLECTION, progress.id);
  await updateDoc(docRef, {
    completedChapters: newCompletedChapters,
    progressPercentage: newProgressPercentage,
    lastAccessedAt: Timestamp.now(),
    completedAt: null,
  });
  
  return {
    ...progress,
    completedChapters: newCompletedChapters,
    progressPercentage: newProgressPercentage,
    completedAt: undefined,
  };
}

/**
 * Track that user viewed notes for a chapter
 */
export async function trackNotesViewed(
  studentId: string,
  subjectId: string,
  chapterId: string
): Promise<void> {
  const progress = await getSubjectProgress(studentId, subjectId);
  if (!progress) return;
  
  if (progress.notesViewedChapters.includes(chapterId)) return;
  
  const docRef = doc(getDb(), LEARNING_PROGRESS_COLLECTION, progress.id);
  await updateDoc(docRef, {
    notesViewedChapters: [...progress.notesViewedChapters, chapterId],
    lastAccessedAt: Timestamp.now(),
  });
}

/**
 * Track that user viewed videos for a chapter
 */
export async function trackVideosViewed(
  studentId: string,
  subjectId: string,
  chapterId: string
): Promise<void> {
  const progress = await getSubjectProgress(studentId, subjectId);
  if (!progress) return;
  
  if (progress.videosViewedChapters.includes(chapterId)) return;
  
  const docRef = doc(getDb(), LEARNING_PROGRESS_COLLECTION, progress.id);
  await updateDoc(docRef, {
    videosViewedChapters: [...progress.videosViewedChapters, chapterId],
    lastAccessedAt: Timestamp.now(),
  });
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Normalize subject name for consistent lookups
 * e.g., "React.js" -> "react", "Node.js" -> "nodejs"
 */
export function normalizeSubjectName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\.js$/i, "")
    .replace(/\./g, "")
    .replace(/\s+/g, "-");
}

/**
 * Get display name from skill name
 */
export function getDisplayName(skillName: string): string {
  // Common mappings
  const mappings: Record<string, string> = {
    react: "React",
    nodejs: "Node.js",
    "node-js": "Node.js",
    javascript: "JavaScript",
    typescript: "TypeScript",
    python: "Python",
    java: "Java",
    "c++": "C++",
    cpp: "C++",
    sql: "SQL",
    mongodb: "MongoDB",
    docker: "Docker",
    kubernetes: "Kubernetes",
    aws: "AWS",
    git: "Git",
    "machine-learning": "Machine Learning",
    "data-structures": "Data Structures",
    algorithms: "Algorithms",
    "system-design": "System Design",
  };
  
  const normalized = normalizeSubjectName(skillName);
  return mappings[normalized] || skillName;
}
