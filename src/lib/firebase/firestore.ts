import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  increment,
  writeBatch,
} from "firebase/firestore";
import { db } from "./config";
import {
  StudentProfile,
  RecruiterProfile,
  PlacementDrive,
  Application,
  ApplicationStatus,
  Education,
  Experience,
  Project,
  LearningSuggestion,
  ResumeImprovementData,
  MissingField,
  ResumeHistory,
  ResumeImprovementSnapshot,
} from "@/types";
import { v4 as uuidv4 } from "uuid";

// Collection names
const COLLECTIONS = {
  STUDENTS: "students",
  RECRUITERS: "recruiters",
  DRIVES: "drives",
  APPLICATIONS: "applications",
  LEARNING_SUGGESTIONS: "learningSuggestions",
  RESUME_IMPROVEMENTS: "resumeImprovements",
  RESUME_HISTORY: "resumeHistory",
} as const;

function getDb() {
  if (!db) {
    throw new Error("Firestore is not initialized. Check your environment variables.");
  }
  return db;
}

// ==================== STUDENT OPERATIONS ====================

export async function getStudentByUid(uid: string): Promise<StudentProfile | null> {
  const studentsRef = collection(getDb(), COLLECTIONS.STUDENTS);
  const q = query(studentsRef, where("uid", "==", uid), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as StudentProfile;
}

export async function getStudentById(id: string): Promise<StudentProfile | null> {
  const docRef = doc(getDb(), COLLECTIONS.STUDENTS, id);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as StudentProfile;
}

export async function createStudent(
  uid: string,
  email: string,
  name: string,
  data: Partial<StudentProfile>
): Promise<StudentProfile> {
  const id = uuidv4();
  const now = Timestamp.now();

  const student: Omit<StudentProfile, "id"> = {
    uid,
    email,
    name,
    phone: data.phone || "",
    college: data.college || "",
    branch: data.branch || "",
    graduationYear: data.graduationYear || new Date().getFullYear() + 1,
    cgpa: data.cgpa,
    skills: data.skills || [],
    education: data.education || [],
    experience: data.experience || [],
    projects: data.projects || [],
    certifications: data.certifications || [],
    achievements: data.achievements || [],
    profileComplete: false,
    onboardingComplete: false,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(getDb(), COLLECTIONS.STUDENTS, id), student);
  return { id, ...student };
}

export async function updateStudent(
  id: string,
  data: Partial<StudentProfile>
): Promise<void> {
  const docRef = doc(getDb(), COLLECTIONS.STUDENTS, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function getAllStudents(): Promise<StudentProfile[]> {
  const studentsRef = collection(getDb(), COLLECTIONS.STUDENTS);
  const q = query(studentsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as StudentProfile[];
}

export async function getEligibleStudents(
  drive: PlacementDrive
): Promise<StudentProfile[]> {
  const studentsRef = collection(getDb(), COLLECTIONS.STUDENTS);
  const q = query(
    studentsRef,
    where("branch", "in", drive.eligibility.branches),
    where("graduationYear", "in", drive.eligibility.batches),
    where("onboardingComplete", "==", true)
  );
  const snapshot = await getDocs(q);

  // Filter by CGPA client-side (Firestore doesn't support >= with in queries)
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as StudentProfile)
    .filter((student) => (student.cgpa || 0) >= drive.eligibility.minCgpa);
}

// ==================== RECRUITER OPERATIONS ====================

export async function getRecruiterByUid(uid: string): Promise<RecruiterProfile | null> {
  const recruitersRef = collection(getDb(), COLLECTIONS.RECRUITERS);
  const q = query(recruitersRef, where("uid", "==", uid), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as RecruiterProfile;
}

export async function createRecruiter(
  uid: string,
  email: string,
  name: string,
  data: Partial<RecruiterProfile>
): Promise<RecruiterProfile> {
  const id = uuidv4();
  const now = Timestamp.now();

  const recruiter: Omit<RecruiterProfile, "id"> = {
    uid,
    email,
    name,
    phone: data.phone || "",
    company: data.company || "",
    designation: data.designation || "",
    verified: false,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(getDb(), COLLECTIONS.RECRUITERS, id), recruiter);
  return { id, ...recruiter };
}

export async function updateRecruiter(
  id: string,
  data: Partial<RecruiterProfile>
): Promise<void> {
  const docRef = doc(getDb(), COLLECTIONS.RECRUITERS, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function getAllRecruiters(): Promise<RecruiterProfile[]> {
  const recruitersRef = collection(getDb(), COLLECTIONS.RECRUITERS);
  const q = query(recruitersRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as RecruiterProfile[];
}

// ==================== DRIVE OPERATIONS ====================

export async function getDriveById(id: string): Promise<PlacementDrive | null> {
  const docRef = doc(getDb(), COLLECTIONS.DRIVES, id);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as PlacementDrive;
}

export async function createDrive(
  recruiterId: string,
  data: Omit<PlacementDrive, "id" | "recruiterId" | "applicationCount" | "createdAt" | "updatedAt">
): Promise<PlacementDrive> {
  const id = uuidv4();
  const now = Timestamp.now();

  const drive: Omit<PlacementDrive, "id"> = {
    ...data,
    recruiterId,
    applicationCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(getDb(), COLLECTIONS.DRIVES, id), drive);
  return { id, ...drive };
}

export async function updateDrive(
  id: string,
  data: Partial<PlacementDrive>
): Promise<void> {
  const docRef = doc(getDb(), COLLECTIONS.DRIVES, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function getAllDrives(): Promise<PlacementDrive[]> {
  const drivesRef = collection(getDb(), COLLECTIONS.DRIVES);
  const q = query(drivesRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as PlacementDrive[];
}

export async function getPublishedDrives(): Promise<PlacementDrive[]> {
  const drivesRef = collection(getDb(), COLLECTIONS.DRIVES);
  const q = query(
    drivesRef,
    where("status", "==", "published"),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as PlacementDrive[];
}

export async function getDrivesByRecruiter(recruiterId: string): Promise<PlacementDrive[]> {
  const drivesRef = collection(getDb(), COLLECTIONS.DRIVES);
  const q = query(
    drivesRef,
    where("recruiterId", "==", recruiterId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as PlacementDrive[];
}

export async function getEligibleDrivesForStudent(
  student: StudentProfile
): Promise<PlacementDrive[]> {
  const drives = await getPublishedDrives();

  return drives.filter((drive) => {
    const { eligibility } = drive;
    const branchMatch = eligibility.branches.includes(student.branch);
    const batchMatch = eligibility.batches.includes(student.graduationYear);
    const cgpaMatch = (student.cgpa || 0) >= eligibility.minCgpa;
    const deadlineValid = drive.applicationDeadline.toDate() > new Date();

    return branchMatch && batchMatch && cgpaMatch && deadlineValid;
  });
}

// ==================== APPLICATION OPERATIONS ====================

export async function getApplicationById(id: string): Promise<Application | null> {
  const docRef = doc(getDb(), COLLECTIONS.APPLICATIONS, id);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Application;
}

export async function createApplication(
  student: StudentProfile,
  driveId: string,
  skillMatch: number
): Promise<Application> {
  const id = uuidv4();
  const now = Timestamp.now();

  // Use final resume if available, otherwise use current resume
  const finalResume = await getFinalResume(student.id);
  const resumeFileId = finalResume?.resumeFileId || student.resumeFileId || "";
  const resumeScore = finalResume?.resumeScore || student.resumeScore || 0;

  const application: Omit<Application, "id"> = {
    driveId,
    studentId: student.id,
    studentUid: student.uid,
    resumeFileId,
    resumeScore,
    skillMatch,
    status: "applied",
    statusHistory: [
      {
        status: "applied",
        changedBy: student.uid,
        changedAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const batch = writeBatch(getDb());

  // Create application
  batch.set(doc(getDb(), COLLECTIONS.APPLICATIONS, id), application);

  // Increment drive application count
  batch.update(doc(getDb(), COLLECTIONS.DRIVES, driveId), {
    applicationCount: increment(1),
  });

  await batch.commit();

  return { id, ...application };
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
  changedBy: string,
  notes?: string
): Promise<void> {
  const application = await getApplicationById(id);
  if (!application) throw new Error("Application not found");

  const now = Timestamp.now();
  const statusChange = {
    status,
    changedBy,
    changedAt: now,
    notes,
  };

  await updateDoc(doc(getDb(), COLLECTIONS.APPLICATIONS, id), {
    status,
    statusHistory: [...application.statusHistory, statusChange],
    updatedAt: serverTimestamp(),
  });
}

export async function getApplicationsByStudent(studentId: string): Promise<Application[]> {
  const appsRef = collection(getDb(), COLLECTIONS.APPLICATIONS);
  const q = query(
    appsRef,
    where("studentId", "==", studentId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Application[];
}

export async function getApplicationsByDrive(driveId: string): Promise<Application[]> {
  const appsRef = collection(getDb(), COLLECTIONS.APPLICATIONS);
  const q = query(
    appsRef,
    where("driveId", "==", driveId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Application[];
}

export async function hasAppliedToDrive(
  studentId: string,
  driveId: string
): Promise<boolean> {
  const appsRef = collection(getDb(), COLLECTIONS.APPLICATIONS);
  const q = query(
    appsRef,
    where("studentId", "==", studentId),
    where("driveId", "==", driveId),
    limit(1)
  );
  const snapshot = await getDocs(q);

  return !snapshot.empty;
}

// ==================== LEARNING SUGGESTIONS ====================

export async function getLearningSuggestions(studentId: string): Promise<LearningSuggestion[]> {
  const suggestionsRef = collection(getDb(), COLLECTIONS.LEARNING_SUGGESTIONS);
  const q = query(
    suggestionsRef,
    where("studentId", "==", studentId),
    orderBy("priority", "asc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as LearningSuggestion[];
}

export async function createLearningSuggestion(
  studentId: string,
  suggestion: Omit<LearningSuggestion, "id" | "studentId" | "completed" | "createdAt">
): Promise<LearningSuggestion> {
  const id = uuidv4();
  const now = Timestamp.now();

  const data: Omit<LearningSuggestion, "id"> = {
    ...suggestion,
    studentId,
    completed: false,
    createdAt: now,
  };

  await setDoc(doc(getDb(), COLLECTIONS.LEARNING_SUGGESTIONS, id), data);
  return { id, ...data };
}

export async function markSuggestionComplete(id: string): Promise<void> {
  await updateDoc(doc(getDb(), COLLECTIONS.LEARNING_SUGGESTIONS, id), {
    completed: true,
    completedAt: serverTimestamp(),
  });
}

// ==================== RESUME IMPROVEMENTS ====================

export async function getResumeImprovementData(studentId: string): Promise<ResumeImprovementData | null> {
  const improvementsRef = collection(getDb(), COLLECTIONS.RESUME_IMPROVEMENTS);
  const q = query(
    improvementsRef,
    where("studentId", "==", studentId),
    orderBy("createdAt", "desc"),
    limit(1)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ResumeImprovementData;
}

export async function saveResumeImprovementData(
  studentId: string,
  data: {
    missingFields: MissingField[];
    userResponses?: Record<string, string>;
    learningNeeded?: string[];
  }
): Promise<ResumeImprovementData> {
  const existing = await getResumeImprovementData(studentId);
  const now = Timestamp.now();

  if (existing) {
    // Update existing record
    await updateDoc(doc(getDb(), COLLECTIONS.RESUME_IMPROVEMENTS, existing.id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { ...existing, ...data, updatedAt: now };
  }

  // Create new record
  const id = uuidv4();
  const newData: Omit<ResumeImprovementData, "id"> = {
    studentId,
    missingFields: data.missingFields,
    userResponses: data.userResponses || {},
    learningNeeded: data.learningNeeded || [],
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(getDb(), COLLECTIONS.RESUME_IMPROVEMENTS, id), newData);
  return { id, ...newData };
}

export async function updateResumeImprovementResponses(
  id: string,
  responses: Record<string, string>
): Promise<void> {
  await updateDoc(doc(getDb(), COLLECTIONS.RESUME_IMPROVEMENTS, id), {
    userResponses: responses,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteLearningSuggestions(studentId: string): Promise<void> {
  const suggestionsRef = collection(getDb(), COLLECTIONS.LEARNING_SUGGESTIONS);
  const q = query(suggestionsRef, where("studentId", "==", studentId));
  const snapshot = await getDocs(q);

  const batch = writeBatch(getDb());
  snapshot.docs.forEach((docSnapshot) => {
    batch.delete(docSnapshot.ref);
  });
  await batch.commit();
}

// ==================== STATISTICS ====================

export async function getAdminStats() {
  const [students, recruiters, drives, applications] = await Promise.all([
    getAllStudents(),
    getAllRecruiters(),
    getAllDrives(),
    getDocs(collection(getDb(), COLLECTIONS.APPLICATIONS)),
  ]);

  const allApps = applications.docs.map((doc) => doc.data()) as Application[];

  return {
    totalStudents: students.length,
    totalRecruiters: recruiters.length,
    activeDrives: drives.filter((d) => d.status === "published").length,
    totalApplications: allApps.length,
    placedStudents: allApps.filter((a) => a.status === "selected").length,
    pendingApprovals: recruiters.filter((r) => !r.verified).length,
  };
}

export async function getStudentStats(studentId: string) {
  const applications = await getApplicationsByStudent(studentId);
  const student = await getStudentById(studentId);

  // Calculate profile completion
  let completion = 0;
  if (student) {
    if (student.name) completion += 10;
    if (student.phone) completion += 10;
    if (student.college) completion += 10;
    if (student.branch) completion += 10;
    if (student.graduationYear) completion += 10;
    if (student.cgpa) completion += 10;
    if (student.skills.length > 0) completion += 15;
    if (student.education.length > 0) completion += 10;
    if (student.resumeFileId) completion += 15;
  }

  return {
    appliedCount: applications.length,
    shortlistedCount: applications.filter((a) => a.status === "shortlisted").length,
    selectedCount: applications.filter((a) => a.status === "selected").length,
    resumeScore: student?.resumeScore || 0,
    profileCompletion: completion,
  };
}

export async function getRecruiterStats(recruiterId: string) {
  const drives = await getDrivesByRecruiter(recruiterId);
  const driveIds = drives.map((d) => d.id);

  let totalApplications = 0;
  let shortlistedCount = 0;
  let selectedCount = 0;

  for (const driveId of driveIds) {
    const apps = await getApplicationsByDrive(driveId);
    totalApplications += apps.length;
    shortlistedCount += apps.filter((a) => a.status === "shortlisted").length;
    selectedCount += apps.filter((a) => a.status === "selected").length;
  }

  return {
    activeDrives: drives.filter((d) => d.status === "published").length,
    totalApplications,
    shortlistedCount,
    selectedCount,
  };
}

// ==================== RESUME HISTORY ====================

export async function getResumeHistory(studentId: string): Promise<ResumeHistory[]> {
  const historyRef = collection(getDb(), COLLECTIONS.RESUME_HISTORY);
  const q = query(
    historyRef,
    where("studentId", "==", studentId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ResumeHistory[];
}

export async function getResumeHistoryById(id: string): Promise<ResumeHistory | null> {
  const docRef = doc(getDb(), COLLECTIONS.RESUME_HISTORY, id);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as ResumeHistory;
}

export async function createResumeHistory(
  studentId: string,
  data: {
    resumeFileId: string;
    resumeUrl: string;
    resumePath: string;
    resumeScore?: number;
    atsScore?: number;
    generatedFrom?: string;
    improvementData?: ResumeImprovementSnapshot;
  }
): Promise<ResumeHistory> {
  const id = uuidv4();
  const now = Timestamp.now();

  // Get current history count to determine version number
  const existingHistory = await getResumeHistory(studentId);
  const version = existingHistory.length + 1;

  const historyEntry: Omit<ResumeHistory, "id"> = {
    studentId,
    resumeFileId: data.resumeFileId,
    resumeUrl: data.resumeUrl,
    resumePath: data.resumePath,
    version,
    resumeScore: data.resumeScore ?? 0,
    atsScore: data.atsScore ?? 0,
    isFinal: false,
    generatedFrom: data.generatedFrom,
    improvementData: data.improvementData,
    createdAt: now,
  };

  await setDoc(doc(getDb(), COLLECTIONS.RESUME_HISTORY, id), historyEntry);
  return { id, ...historyEntry };
}

export async function setFinalResume(
  studentId: string,
  historyId: string
): Promise<void> {
  const batch = writeBatch(getDb());

  // Get the resume history entry
  const historyEntry = await getResumeHistoryById(historyId);
  if (!historyEntry) throw new Error("Resume history not found");

  // Unmark all previous final resumes
  const allHistory = await getResumeHistory(studentId);
  allHistory.forEach((entry) => {
    if (entry.isFinal) {
      batch.update(doc(getDb(), COLLECTIONS.RESUME_HISTORY, entry.id), {
        isFinal: false,
      });
    }
  });

  // Mark the selected resume as final
  batch.update(doc(getDb(), COLLECTIONS.RESUME_HISTORY, historyId), {
    isFinal: true,
  });

  // Update student profile with final resume ID
  const student = await getStudentByUid(historyEntry.studentId);
  if (student) {
    batch.update(doc(getDb(), COLLECTIONS.STUDENTS, student.id), {
      finalResumeId: historyId,
      resumeFileId: historyEntry.resumeFileId,
      resumeUrl: historyEntry.resumeUrl,
      resumePath: historyEntry.resumePath,
      resumeScore: historyEntry.resumeScore,
      atsScore: historyEntry.atsScore,
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

export async function getFinalResume(studentId: string): Promise<ResumeHistory | null> {
  const historyRef = collection(getDb(), COLLECTIONS.RESUME_HISTORY);
  const q = query(
    historyRef,
    where("studentId", "==", studentId),
    where("isFinal", "==", true),
    limit(1)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ResumeHistory;
}
