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
  resumeFileId?: string; // Firebase Storage file ID
  resumeUrl?: string;
  resumePath?: string; // Firebase Storage full path
  resumeScore?: number;
  atsScore?: number;
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
  completed: boolean;
  createdAt: Timestamp;
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
