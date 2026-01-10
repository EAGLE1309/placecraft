import { Timestamp } from "firebase/firestore";

/**
 * Resume Subsystem Types
 * 
 * This file contains all types related to the student resume flow:
 * - Extracted resume data (from AI parsing)
 * - Resume analysis and suggestions
 * - Improved resume data
 * - Data reconciliation
 */

// ==================== EXTRACTED RESUME DATA ====================

/**
 * Personal information extracted from resume
 * All fields are optional since resume may not contain all info
 */
export interface ExtractedPersonalInfo {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  summary?: string;
}

/**
 * Education entry extracted from resume
 */
export interface ExtractedEducation {
  institution: string;
  degree: string;
  field?: string;
  startYear?: string;
  endYear?: string;
  grade?: string;
  current?: boolean;
}

/**
 * Experience entry extracted from resume
 */
export interface ExtractedExperience {
  company: string;
  role: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  highlights?: string[];
}

/**
 * Project entry extracted from resume
 */
export interface ExtractedProject {
  title: string;
  description?: string;
  technologies?: string[];
  link?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Certification entry extracted from resume
 */
export interface ExtractedCertification {
  name: string;
  issuer?: string;
  date?: string;
  credentialId?: string;
  url?: string;
}

/**
 * Achievement/Award extracted from resume
 */
export interface ExtractedAchievement {
  title: string;
  description?: string;
  date?: string;
}

/**
 * Complete structured resume data extracted from uploaded resume
 * This is what Gemini returns after parsing the resume
 */
export interface ExtractedResumeData {
  personalInfo: ExtractedPersonalInfo;
  education: ExtractedEducation[];
  experience: ExtractedExperience[];
  projects: ExtractedProject[];
  skills: string[];
  certifications: ExtractedCertification[];
  achievements: ExtractedAchievement[];
  languages?: string[];
  interests?: string[];
  rawTextLength?: number;
}

// ==================== RESUME ANALYSIS ====================

/**
 * Individual suggestion for resume improvement
 */
export interface ResumeAnalysisSuggestion {
  id: string;
  type: "improvement" | "keyword" | "format" | "content" | "missing";
  section: string;
  suggestion: string;
  priority: "high" | "medium" | "low";
  currentText?: string;
  suggestedText?: string;
}

/**
 * Learning suggestion based on skill gaps
 */
export interface ResumeLearningSuggestion {
  skill: string;
  priority: "high" | "medium" | "low";
  learningType: "concept" | "tool" | "practice";
  estimatedTime: string;
  reason: string;
}

/**
 * Complete resume analysis result
 * This is stored as a first-class record in the database
 */
export interface StoredResumeAnalysis {
  id: string;
  studentId: string;
  resumeFileId: string;
  resumePath: string;
  resumeUrl: string;
  
  // Extracted structured data
  extractedData: ExtractedResumeData;
  
  // Analysis scores
  overallScore: number;
  atsScore: number;
  
  // Analysis results
  strengths: string[];
  weaknesses: string[];
  suggestions: ResumeAnalysisSuggestion[];
  learningSuggestions: ResumeLearningSuggestion[];
  
  // Metadata
  targetRole?: string;
  analyzedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==================== IMPROVED RESUME ====================

/**
 * Improved resume data returned by AI
 * Same structure as extracted but with enhanced content
 */
export interface ImprovedResumeData {
  personalInfo: ExtractedPersonalInfo;
  education: ExtractedEducation[];
  experience: ExtractedExperience[];
  projects: ExtractedProject[];
  skills: string[];
  certifications: ExtractedCertification[];
  achievements: ExtractedAchievement[];
  
  // Track what was improved
  improvementSummary: string[];
}

/**
 * Record of an improved resume version
 */
export interface ImprovedResumeRecord {
  id: string;
  studentId: string;
  sourceAnalysisId: string; // Reference to the analysis used
  
  // The improved data
  improvedData: ImprovedResumeData;
  
  // Generated PDF info
  pdfFileId?: string;
  pdfPath?: string;
  pdfUrl?: string;
  
  // Scores after improvement
  estimatedScore?: number;
  
  // Metadata
  createdAt: Timestamp;
}

// ==================== DATA RECONCILIATION ====================

/**
 * Status of reconciliation between resume data and profile data
 */
export type ReconciliationStatus = 
  | "pending"      // Not yet reviewed
  | "accepted"     // User accepted the extracted data
  | "rejected"     // User rejected (keeping profile data)
  | "merged";      // User manually merged

/**
 * Individual field reconciliation record
 */
export interface FieldReconciliation {
  field: string;
  category: "skills" | "education" | "experience" | "projects" | "certifications" | "achievements";
  extractedValue: unknown;
  profileValue: unknown;
  status: ReconciliationStatus;
  resolvedValue?: unknown;
  resolvedAt?: Timestamp;
}

/**
 * Overall data reconciliation state for a student
 */
export interface DataReconciliationState {
  studentId: string;
  analysisId: string;
  fields: FieldReconciliation[];
  overallStatus: ReconciliationStatus;
  lastReviewedAt?: Timestamp;
}

// ==================== GEMINI SCHEMA TYPES ====================

/**
 * Strict schema for Gemini extraction + analysis response
 * This is what we expect from the unified API call
 */
export interface GeminiResumeExtractionResponse {
  // Extracted structured data
  extractedData: {
    personalInfo: {
      name: string | null;
      email: string | null;
      phone: string | null;
      location: string | null;
      linkedin: string | null;
      github: string | null;
      portfolio: string | null;
      summary: string | null;
    };
    education: Array<{
      institution: string;
      degree: string;
      field: string | null;
      startYear: string | null;
      endYear: string | null;
      grade: string | null;
      current: boolean;
    }>;
    experience: Array<{
      company: string;
      role: string;
      description: string | null;
      startDate: string | null;
      endDate: string | null;
      current: boolean;
      highlights: string[];
    }>;
    projects: Array<{
      title: string;
      description: string | null;
      technologies: string[];
      link: string | null;
    }>;
    skills: string[];
    certifications: Array<{
      name: string;
      issuer: string | null;
      date: string | null;
    }>;
    achievements: Array<{
      title: string;
      description: string | null;
    }>;
  };
  
  // Analysis results
  analysis: {
    overallScore: number;
    atsScore: number;
    strengths: string[];
    weaknesses: string[];
    suggestions: Array<{
      type: "improvement" | "keyword" | "format" | "content" | "missing";
      section: string;
      suggestion: string;
      priority: "high" | "medium" | "low";
    }>;
    learningSuggestions: Array<{
      skill: string;
      priority: "high" | "medium" | "low";
      learningType: "concept" | "tool" | "practice";
      estimatedTime: string;
      reason: string;
    }>;
  };
}

/**
 * Strict schema for Gemini improve resume response
 */
export interface GeminiImproveResumeResponse {
  improvedData: {
    personalInfo: {
      name: string | null;
      email: string | null;
      phone: string | null;
      location: string | null;
      linkedin: string | null;
      github: string | null;
      portfolio: string | null;
      summary: string | null;
    };
    education: Array<{
      institution: string;
      degree: string;
      field: string | null;
      startYear: string | null;
      endYear: string | null;
      grade: string | null;
      current: boolean;
    }>;
    experience: Array<{
      company: string;
      role: string;
      description: string;
      startDate: string | null;
      endDate: string | null;
      current: boolean;
      highlights: string[];
    }>;
    projects: Array<{
      title: string;
      description: string;
      technologies: string[];
      link: string | null;
    }>;
    skills: string[];
    certifications: Array<{
      name: string;
      issuer: string | null;
      date: string | null;
    }>;
    achievements: Array<{
      title: string;
      description: string;
    }>;
  };
  improvementSummary: string[];
}

// ==================== API REQUEST/RESPONSE TYPES ====================

/**
 * Request to upload and analyze a resume
 */
export interface ResumeUploadRequest {
  file: File;
  studentId: string;
  targetRole?: string;
}

/**
 * Response from upload and analyze
 */
export interface ResumeUploadResponse {
  success: boolean;
  analysisId: string;
  fileId: string;
  downloadUrl: string;
  analysis: {
    overallScore: number;
    atsScore: number;
    strengths: string[];
    weaknesses: string[];
    suggestions: ResumeAnalysisSuggestion[];
    extractedSkillsCount: number;
  };
}

/**
 * Request to improve a resume
 */
export interface ResumeImproveRequest {
  studentId: string;
  analysisId: string;
  targetRole?: string;
  focusAreas?: string[];
}

/**
 * Response from improve resume
 */
export interface ResumeImproveResponse {
  success: boolean;
  improvedResumeId: string;
  pdfUrl: string;
  improvementSummary: string[];
  estimatedScore: number;
}
