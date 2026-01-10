import { Education, Experience, ExtractedEducation, ExtractedExperience } from "@/types";

/**
 * Utility functions for merging manual profile data with resume-extracted data
 * Handles deduplication and smart merging
 */

export interface MergedSkill {
  skill: string;
  source: "manual" | "resume" | "both";
}

export interface MergedEducation extends Education {
  source: "manual" | "resume";
}

export interface MergedExperience extends Experience {
  source: "manual" | "resume";
}

/**
 * Merge and deduplicate skills from manual entry and resume extraction
 */
export function mergeSkills(
  manualSkills: string[],
  resumeSkills: string[]
): MergedSkill[] {
  const skillMap = new Map<string, MergedSkill>();

  // Normalize skill names for comparison (lowercase, trim)
  const normalizeSkill = (skill: string) => String(skill).toLowerCase().trim();

  // Add manual skills
  manualSkills.forEach((skill) => {
    const skillStr = String(skill);
    const normalized = normalizeSkill(skillStr);
    skillMap.set(normalized, { skill: skillStr, source: "manual" });
  });

  // Add resume skills, marking duplicates as "both"
  resumeSkills.forEach((skill) => {
    const skillStr = String(skill);
    const normalized = normalizeSkill(skillStr);
    const existing = skillMap.get(normalized);
    
    if (existing) {
      // Skill exists in manual, mark as both
      existing.source = "both";
    } else {
      // New skill from resume
      skillMap.set(normalized, { skill: skillStr, source: "resume" });
    }
  });

  return Array.from(skillMap.values());
}

/**
 * Merge education entries, avoiding duplicates
 */
export function mergeEducation(
  manualEducation: Education[],
  resumeEducation: ExtractedEducation[]
): MergedEducation[] {
  const merged: MergedEducation[] = [];
  const seen = new Set<string>();

  // Helper to create a unique key for education entry
  const getEducationKey = (edu: Education | ExtractedEducation) => {
    const institution = edu.institution.toLowerCase().trim();
    const degree = edu.degree.toLowerCase().trim();
    return `${institution}|${degree}`;
  };

  // Add manual education first
  manualEducation.forEach((edu) => {
    const key = getEducationKey(edu);
    seen.add(key);
    merged.push({ ...edu, source: "manual" });
  });

  // Add resume education, skipping duplicates
  resumeEducation.forEach((edu) => {
    const key = getEducationKey(edu);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push({ ...edu, source: "resume" });
    }
  });

  return merged;
}

/**
 * Merge experience entries, avoiding duplicates
 */
export function mergeExperience(
  manualExperience: Experience[],
  resumeExperience: ExtractedExperience[]
): MergedExperience[] {
  const merged: MergedExperience[] = [];
  const seen = new Set<string>();

  // Helper to create a unique key for experience entry
  const getExperienceKey = (exp: Experience | ExtractedExperience) => {
    const company = exp.company.toLowerCase().trim();
    const role = exp.role.toLowerCase().trim();
    return `${company}|${role}`;
  };

  // Add manual experience first
  manualExperience.forEach((exp) => {
    const key = getExperienceKey(exp);
    seen.add(key);
    merged.push({ ...exp, source: "manual" });
  });

  // Add resume experience, skipping duplicates
  resumeExperience.forEach((exp) => {
    const key = getExperienceKey(exp);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push({ ...exp, source: "resume" });
    }
  });

  return merged;
}

/**
 * Get only unique skills (deduplicated list for saving)
 */
export function getUniqueSkills(mergedSkills: MergedSkill[]): string[] {
  return mergedSkills.map((ms) => String(ms.skill));
}

/**
 * Get count of resume-only items
 */
export function getResumeOnlyCount(items: Array<{ source: string }>): number {
  return items.filter((item) => item.source === "resume").length;
}
