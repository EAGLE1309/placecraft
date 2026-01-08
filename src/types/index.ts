import { Timestamp } from "firebase/firestore";

// Auth types
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export type UserRole = "student" | "admin" | "recruiter" | null;

// Student Profile
export interface StudentProfile {
  id: string;
  uid: string;
  email: string;
  name: string;
  phone: string;
  college: string;
  branch: string;
  graduationYear: number;
  cgpa?: number;
  skills: string[];
  education: Education[];
  experience: Experience[];
  projects: Project[];
  certifications: Certification[];
  achievements: Achievement[];
  resumeFileId?: string; // Current/selected resume file ID
  resumeUrl?: string;
  resumePath?: string; // Firebase Storage full path
  resumeScore?: number;
  atsScore?: number;
  finalResumeId?: string; // ID of the resume selected as final (for admins/recruiters)
  profileComplete: boolean;
  onboardingComplete: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startYear: number;
  endYear?: number;
  grade?: string;
  current: boolean;
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  description: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  skills: string[];
}

export interface Project {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  link?: string;
  startDate?: string;
  endDate?: string;
}

// Recruiter Profile
export interface RecruiterProfile {
  id: string;
  uid: string;
  email: string;
  name: string;
  phone: string;
  company: string;
  designation: string;
  companyLogo?: string;
  verified: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Placement Drive
export interface PlacementDrive {
  id: string;
  recruiterId: string;
  company: string;
  companyLogo?: string;
  role: string;
  description: string;
  type: "internship" | "fulltime";
  location: string;
  ctc?: string; // For fulltime
  stipend?: string; // For internship
  duration?: string; // For internship
  eligibility: DriveEligibility;
  requiredSkills: string[];
  preferredSkills: string[];
  applicationDeadline: Timestamp;
  driveDate?: Timestamp;
  status: "draft" | "published" | "closed" | "completed";
  applicationCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DriveEligibility {
  branches: string[];
  minCgpa: number;
  batches: number[]; // graduation years
  backlogs?: number;
}

// Application
export type ApplicationStatus =
  | "applied"
  | "shortlisted"
  | "interview"
  | "selected"
  | "rejected"
  | "withdrawn";

export interface Application {
  id: string;
  driveId: string;
  studentId: string;
  studentUid: string;
  resumeFileId: string; // Locked resume version
  resumeScore: number;
  skillMatch: number;
  status: ApplicationStatus;
  statusHistory: StatusChange[];
  recruiterNotes?: string;
  adminNotes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StatusChange {
  status: ApplicationStatus;
  changedBy: string;
  changedAt: Timestamp;
  notes?: string;
}

// Resume Analysis (AI)
export interface ResumeAnalysis {
  id: string;
  studentId: string;
  resumeFileId: string;
  overallScore: number;
  atsScore: number;
  strengths: string[];
  weaknesses: string[];
  extractedSkills: string[];
  extractedEducation: Education[];
  extractedExperience: Experience[];
  suggestions: ResumeSuggestion[];
  analyzedAt: Timestamp;
}

export interface ResumeSuggestion {
  type: "improvement" | "keyword" | "format" | "content";
  section: string;
  suggestion: string;
  priority: "high" | "medium" | "low";
}

// Learning Suggestions
export interface LearningSuggestion {
  id: string;
  studentId: string;
  skill: string;
  priority: "high" | "medium" | "low";
  learningType: "concept" | "tool" | "practice";
  estimatedTime: string;
  reason: string;
  resources?: LearningResource[];
  completed: boolean;
  completedAt?: Timestamp;
  createdAt: Timestamp;
}

export interface LearningResource {
  title: string;
  url: string;
  type: "video" | "article" | "course" | "documentation";
}

// Resume Improvement Data (for resume generation flow)
export interface ResumeImprovementData {
  id: string;
  studentId: string;
  missingFields: MissingField[];
  userResponses: Record<string, string>;
  learningNeeded: string[];
  generatedResumeUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MissingField {
  field: string;
  category: "experience" | "projects" | "skills" | "education" | "certifications" | "achievements";
  suggestion: string;
  priority: "high" | "medium" | "low";
  required: boolean;
}

// Resume History
export interface ResumeHistory {
  id: string;
  studentId: string;
  resumeFileId: string;
  resumeUrl: string;
  resumePath: string;
  version: number;
  resumeScore?: number;
  atsScore?: number;
  isFinal: boolean; // Whether this is the final/selected resume
  generatedFrom?: string; // "upload" | "improvement" | "ai-generated"
  improvementData?: ResumeImprovementSnapshot;
  createdAt: Timestamp;
}

export interface ResumeImprovementSnapshot {
  personalInfo: PersonalInfo;
  education: Education[];
  experience: Experience[];
  projects: Project[];
  skills: string[];
  certifications?: Certification[];
  achievements?: string[];
}

export interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  summary?: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  credentialId?: string;
  url?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  date: string;
  category?: string;
}

// Dashboard Stats
export interface AdminDashboardStats {
  totalStudents: number;
  totalRecruiters: number;
  activeDrives: number;
  totalApplications: number;
  placedStudents: number;
  pendingApprovals: number;
}

export interface StudentDashboardStats {
  appliedCount: number;
  shortlistedCount: number;
  selectedCount: number;
  resumeScore: number;
  profileCompletion: number;
}

export interface RecruiterDashboardStats {
  activeDrives: number;
  totalApplications: number;
  shortlistedCount: number;
  selectedCount: number;
}

// Form Data types
export interface StudentOnboardingData {
  name: string;
  phone: string;
  college: string;
  branch: string;
  graduationYear: number;
  cgpa?: number;
}

export interface DriveFormData {
  company: string;
  role: string;
  description: string;
  type: "internship" | "fulltime";
  location: string;
  ctc?: string;
  stipend?: string;
  duration?: string;
  branches: string[];
  minCgpa: number;
  batches: number[];
  requiredSkills: string[];
  preferredSkills: string[];
  applicationDeadline: string;
  driveDate?: string;
}

// Constants
export const BRANCHES = [
  "Computer Science",
  "Information Technology",
  "Electronics",
  "Electrical",
  "Mechanical",
  "Civil",
  "Chemical",
  "Biotechnology",
  "Other",
] as const;

export const COMMON_SKILLS = [
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "Java",
  "C++",
  "SQL",
  "MongoDB",
  "Git",
  "Docker",
  "AWS",
  "Machine Learning",
  "Data Analysis",
  "Communication",
  "Problem Solving",
  "Team Work",
] as const;

// Member types (for admin panel)
export interface Member {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  department?: string;
  verificationId: string;
  joinedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface MemberFormData {
  name: string;
  email: string;
  phone?: string;
  role?: string;
  department?: string;
}

// Learning System with Skills Integration
export interface LearningCourse {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedHours: number;
  lessons: Lesson[];
  skillsToGain: string[];
  prerequisites?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  content: string;
  order: number;
  estimatedMinutes: number;
  skillsToGain: string[];
  resources?: LearningResource[];
}

export interface CourseProgress {
  id: string;
  studentId: string;
  courseId: string;
  completedLessons: string[];
  gainedSkills: string[];
  startedAt: Timestamp;
  lastAccessedAt: Timestamp;
  completedAt?: Timestamp;
  progress: number;
}

export interface LessonCompletion {
  lessonId: string;
  completedAt: Timestamp;
  skillsGained: string[];
}

// AI Resume Generation System
export interface ResumeGenerationRequest {
  studentId: string;
  targetCompany?: string;
  targetRole?: string;
  companyRequirements?: CompanyRequirements;
  includeAllSkills?: boolean;
  customizations?: ResumeCustomizations;
}

export interface CompanyRequirements {
  companyName: string;
  role: string;
  requiredSkills: string[];
  preferredSkills: string[];
  description?: string;
  jobUrl?: string;
}

export interface ResumeCustomizations {
  template?: string;
  colorScheme?: string;
  sections?: string[];
  highlightSkills?: string[];
}

export interface AIResumeGeneration {
  id: string;
  studentId: string;
  requestData: ResumeGenerationRequest;
  status: "pending" | "analyzing" | "generating" | "completed" | "failed";
  suggestions: AIResumeSuggestion[];
  skillGapAnalysis?: SkillGapAnalysis;
  generatedSections: GeneratedResumeSection[];
  acceptedSuggestions: string[];
  rejectedSuggestions: string[];
  finalResumeData?: ResumeImprovementSnapshot;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
}

export interface AIResumeSuggestion {
  id: string;
  section: "summary" | "experience" | "projects" | "skills" | "education" | "certifications" | "achievements";
  type: "improvement" | "addition" | "rephrasing" | "keyword-optimization";
  original?: string;
  suggested: string;
  reasoning: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "accepted" | "rejected";
  cached?: boolean;
}

export interface GeneratedResumeSection {
  section: string;
  content: string;
  suggestions: AIResumeSuggestion[];
  aiGenerated: boolean;
  cached?: boolean;
}

export interface SkillGapAnalysis {
  requiredSkills: string[];
  presentSkills: string[];
  missingSkills: string[];
  partialSkills: string[];
  recommendedLearning: LearningRecommendation[];
  canProceedWithResume: boolean;
  matchPercentage: number;
}

export interface LearningRecommendation {
  skill: string;
  priority: "critical" | "high" | "medium" | "low";
  estimatedTime: string;
  availableCourses?: string[];
  reason: string;
}

// AI Cache System (to minimize API calls)
export interface AICache {
  id: string;
  cacheKey: string;
  cacheType: "resume-section" | "skill-improvement" | "summary-generation" | "keyword-optimization";
  inputHash: string;
  output: string;
  metadata?: Record<string, unknown>;
  hitCount: number;
  createdAt: Timestamp;
  lastUsedAt: Timestamp;
  expiresAt?: Timestamp;
}

// Resume Generation Results
export interface ResumeGenerationResult {
  success: boolean;
  generationId: string;
  suggestions: AIResumeSuggestion[];
  skillGapAnalysis?: SkillGapAnalysis;
  previewUrl?: string;
  message?: string;
}
