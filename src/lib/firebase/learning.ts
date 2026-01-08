import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { db } from "./config";
import {
  LearningCourse,
  CourseProgress,
  Lesson,
  LessonCompletion,
  StudentProfile
} from "@/types";

const COURSES_COLLECTION = "learning_courses";
const PROGRESS_COLLECTION = "course_progress";
const STUDENTS_COLLECTION = "students";

function getDb() {
  if (!db) {
    throw new Error("Firebase is not initialized. Check your environment variables.");
  }
  return db;
}

export const getAllCourses = async (): Promise<LearningCourse[]> => {
  const querySnapshot = await getDocs(collection(getDb(), COURSES_COLLECTION));
  return querySnapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as LearningCourse[];
};

export const getCourseById = async (id: string): Promise<LearningCourse | null> => {
  const docRef = doc(getDb(), COURSES_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as LearningCourse;
  }
  return null;
};

export const getStudentProgress = async (studentId: string): Promise<CourseProgress[]> => {
  const q = query(
    collection(getDb(), PROGRESS_COLLECTION),
    where("studentId", "==", studentId)
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as CourseProgress[];
};

export const getCourseProgress = async (
  studentId: string,
  courseId: string
): Promise<CourseProgress | null> => {
  const q = query(
    collection(getDb(), PROGRESS_COLLECTION),
    where("studentId", "==", studentId),
    where("courseId", "==", courseId)
  );
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const docSnap = querySnapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as CourseProgress;
};

export const startCourse = async (
  studentId: string,
  courseId: string
): Promise<CourseProgress> => {
  const existing = await getCourseProgress(studentId, courseId);
  if (existing) {
    return existing;
  }

  const now = Timestamp.now();
  const progressData = {
    studentId,
    courseId,
    completedLessons: [],
    gainedSkills: [],
    startedAt: now,
    lastAccessedAt: now,
    progress: 0,
  };

  const docRef = await addDoc(collection(getDb(), PROGRESS_COLLECTION), progressData);
  return { id: docRef.id, ...progressData } as CourseProgress;
};

export const completeLesson = async (
  studentId: string,
  courseId: string,
  lessonId: string
): Promise<{ progress: CourseProgress; skillsAdded: string[] }> => {
  const course = await getCourseById(courseId);
  if (!course) {
    throw new Error("Course not found");
  }

  const lesson = course.lessons.find((l) => l.id === lessonId);
  if (!lesson) {
    throw new Error("Lesson not found");
  }

  let progress = await getCourseProgress(studentId, courseId);
  if (!progress) {
    progress = await startCourse(studentId, courseId);
  }

  if (progress.completedLessons.includes(lessonId)) {
    return { progress, skillsAdded: [] };
  }

  const progressRef = doc(getDb(), PROGRESS_COLLECTION, progress.id);
  const studentRef = doc(getDb(), STUDENTS_COLLECTION, studentId);

  const newCompletedLessons = [...progress.completedLessons, lessonId];
  const newGainedSkills = [...new Set([...progress.gainedSkills, ...lesson.skillsToGain])];
  const newProgress = (newCompletedLessons.length / course.lessons.length) * 100;

  const updateData: Record<string, unknown> = {
    completedLessons: newCompletedLessons,
    gainedSkills: newGainedSkills,
    lastAccessedAt: Timestamp.now(),
    progress: newProgress,
  };

  if (newProgress === 100) {
    updateData.completedAt = Timestamp.now();
  }

  await updateDoc(progressRef, updateData);

  const skillsToAdd = lesson.skillsToGain.filter(
    (skill) => !progress.gainedSkills.includes(skill)
  );

  if (skillsToAdd.length > 0) {
    await updateDoc(studentRef, {
      skills: arrayUnion(...skillsToAdd),
      updatedAt: Timestamp.now(),
    });
  }

  return {
    progress: {
      ...progress,
      completedLessons: newCompletedLessons,
      gainedSkills: newGainedSkills,
      progress: newProgress,
      completedAt: newProgress === 100 ? Timestamp.now() : undefined,
    },
    skillsAdded: skillsToAdd,
  };
};

export const unmarkLesson = async (
  studentId: string,
  courseId: string,
  lessonId: string
): Promise<{ progress: CourseProgress; skillsRemoved: string[] }> => {
  const course = await getCourseById(courseId);
  if (!course) {
    throw new Error("Course not found");
  }

  const lesson = course.lessons.find((l) => l.id === lessonId);
  if (!lesson) {
    throw new Error("Lesson not found");
  }

  const progress = await getCourseProgress(studentId, courseId);
  if (!progress || !progress.completedLessons.includes(lessonId)) {
    throw new Error("Lesson not completed");
  }

  const progressRef = doc(getDb(), PROGRESS_COLLECTION, progress.id);
  const studentRef = doc(getDb(), STUDENTS_COLLECTION, studentId);

  const newCompletedLessons = progress.completedLessons.filter((id) => id !== lessonId);

  const skillsStillNeeded = new Set<string>();
  newCompletedLessons.forEach((completedLessonId) => {
    const completedLesson = course.lessons.find((l) => l.id === completedLessonId);
    if (completedLesson) {
      completedLesson.skillsToGain.forEach((skill) => skillsStillNeeded.add(skill));
    }
  });

  const skillsToRemove = lesson.skillsToGain.filter(
    (skill) => !skillsStillNeeded.has(skill)
  );

  const newGainedSkills = progress.gainedSkills.filter(
    (skill) => !skillsToRemove.includes(skill)
  );

  const newProgress = (newCompletedLessons.length / course.lessons.length) * 100;

  await updateDoc(progressRef, {
    completedLessons: newCompletedLessons,
    gainedSkills: newGainedSkills,
    lastAccessedAt: Timestamp.now(),
    progress: newProgress,
    completedAt: null,
  });

  if (skillsToRemove.length > 0) {
    await updateDoc(studentRef, {
      skills: arrayRemove(...skillsToRemove),
      updatedAt: Timestamp.now(),
    });
  }

  return {
    progress: {
      ...progress,
      completedLessons: newCompletedLessons,
      gainedSkills: newGainedSkills,
      progress: newProgress,
      completedAt: undefined,
    },
    skillsRemoved: skillsToRemove,
  };
};

export const createCourse = async (courseData: Omit<LearningCourse, "id" | "createdAt" | "updatedAt">): Promise<LearningCourse> => {
  const now = Timestamp.now();
  const data = {
    ...courseData,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(getDb(), COURSES_COLLECTION), data);
  return { id: docRef.id, ...data } as LearningCourse;
};

export const updateCourse = async (
  courseId: string,
  updates: Partial<Omit<LearningCourse, "id" | "createdAt" | "updatedAt">>
): Promise<void> => {
  const docRef = doc(getDb(), COURSES_COLLECTION, courseId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
};

export const deleteCourse = async (courseId: string): Promise<void> => {
  const docRef = doc(getDb(), COURSES_COLLECTION, courseId);
  await deleteDoc(docRef);
};
