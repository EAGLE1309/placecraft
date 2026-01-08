import {
  AIResumeGeneration,
  AIResumeSuggestion,
  ResumeGenerationRequest,
  SkillGapAnalysis,
  GeneratedResumeSection,
  StudentProfile,
  CompanyRequirements
} from "@/types";
import { generateWithCache, getCachedResult } from "./cache";
import { analyzeSkillGap, generateResumeSection, improveContent } from "../google/gemini";
import crypto from "crypto";

export class AIResumeGenerator {
  private studentProfile: StudentProfile;
  private request: ResumeGenerationRequest;

  constructor(studentProfile: StudentProfile, request: ResumeGenerationRequest) {
    this.studentProfile = studentProfile;
    this.request = request;
  }

  async generateResume(): Promise<AIResumeGeneration> {
    const generationId = crypto.randomUUID();
    const suggestions: AIResumeSuggestion[] = [];
    const generatedSections: GeneratedResumeSection[] = [];
    let skillGapAnalysis: SkillGapAnalysis | undefined;

    if (this.request.companyRequirements) {
      skillGapAnalysis = await this.analyzeSkillGap(this.request.companyRequirements);
    }

    const sections = this.request.customizations?.sections || [
      "summary",
      "experience",
      "projects",
      "skills",
      "education",
      "certifications",
      "achievements"
    ];

    for (const section of sections) {
      const sectionData = await this.generateSection(section, skillGapAnalysis);
      generatedSections.push(sectionData);
      suggestions.push(...sectionData.suggestions);
    }

    return {
      id: generationId,
      studentId: this.studentProfile.id,
      requestData: this.request,
      status: "completed",
      suggestions,
      skillGapAnalysis,
      generatedSections,
      acceptedSuggestions: [],
      rejectedSuggestions: [],
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
      updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
    };
  }

  private async analyzeSkillGap(requirements: CompanyRequirements): Promise<SkillGapAnalysis> {
    const cacheKey = `skill-gap-${this.studentProfile.id}-${requirements.companyName}-${requirements.role}`;
    const inputData = {
      studentSkills: this.studentProfile.skills,
      requiredSkills: requirements.requiredSkills,
      preferredSkills: requirements.preferredSkills,
    };

    const cached = await getCachedResult(cacheKey, "skill-improvement", inputData);
    if (cached) {
      return JSON.parse(cached);
    }

    const analysis = await analyzeSkillGap(
      this.studentProfile.skills,
      requirements.requiredSkills,
      requirements.preferredSkills
    );

    await generateWithCache(
      cacheKey,
      "skill-improvement",
      inputData,
      JSON.stringify(analysis)
    );

    return analysis;
  }

  private async generateSection(
    section: string,
    skillGapAnalysis?: SkillGapAnalysis
  ): Promise<GeneratedResumeSection> {
    const suggestions: AIResumeSuggestion[] = [];
    let content = "";
    let cached = false;

    switch (section) {
      case "summary":
        const summaryResult = await this.generateSummary(skillGapAnalysis);
        content = summaryResult.content;
        suggestions.push(...summaryResult.suggestions);
        cached = summaryResult.cached;
        break;

      case "experience":
        const expResult = await this.generateExperience(skillGapAnalysis);
        content = expResult.content;
        suggestions.push(...expResult.suggestions);
        cached = expResult.cached;
        break;

      case "projects":
        const projResult = await this.generateProjects(skillGapAnalysis);
        content = projResult.content;
        suggestions.push(...projResult.suggestions);
        cached = projResult.cached;
        break;

      case "skills":
        const skillsResult = await this.generateSkills(skillGapAnalysis);
        content = skillsResult.content;
        suggestions.push(...skillsResult.suggestions);
        cached = skillsResult.cached;
        break;

      case "education":
        content = this.formatEducation();
        break;

      case "certifications":
        content = this.formatCertifications();
        break;

      case "achievements":
        const achResult = await this.generateAchievements();
        content = achResult.content;
        suggestions.push(...achResult.suggestions);
        cached = achResult.cached;
        break;
    }

    return {
      section,
      content,
      suggestions,
      aiGenerated: suggestions.length > 0,
      cached,
    };
  }

  private async generateSummary(skillGapAnalysis?: SkillGapAnalysis): Promise<{
    content: string;
    suggestions: AIResumeSuggestion[];
    cached: boolean;
  }> {
    const cacheKey = `summary-${this.studentProfile.id}-${this.request.targetCompany || "general"}`;
    const inputData = {
      name: this.studentProfile.name,
      skills: this.studentProfile.skills,
      experience: this.studentProfile.experience.length,
      projects: this.studentProfile.projects.length,
      targetCompany: this.request.targetCompany,
      targetRole: this.request.targetRole,
    };

    const cached = await getCachedResult(cacheKey, "summary-generation", inputData);
    if (cached) {
      return {
        content: cached,
        suggestions: [{
          id: crypto.randomUUID(),
          section: "summary",
          type: "improvement",
          suggested: cached,
          reasoning: "AI-generated professional summary tailored to your profile",
          priority: "high",
          status: "pending",
          cached: true,
        }],
        cached: true,
      };
    }

    const prompt = this.buildSummaryPrompt(skillGapAnalysis);
    const generated = await generateResumeSection("summary", prompt, this.studentProfile);

    await generateWithCache(cacheKey, "summary-generation", inputData, generated);

    return {
      content: generated,
      suggestions: [{
        id: crypto.randomUUID(),
        section: "summary",
        type: "improvement",
        suggested: generated,
        reasoning: "AI-generated professional summary tailored to your profile",
        priority: "high",
        status: "pending",
        cached: false,
      }],
      cached: false,
    };
  }

  private async generateExperience(skillGapAnalysis?: SkillGapAnalysis): Promise<{
    content: string;
    suggestions: AIResumeSuggestion[];
    cached: boolean;
  }> {
    const suggestions: AIResumeSuggestion[] = [];
    const improvedExperiences: string[] = [];

    for (const exp of this.studentProfile.experience) {
      const cacheKey = `experience-${this.studentProfile.id}-${exp.id}`;
      const inputData = {
        company: exp.company,
        role: exp.role,
        description: exp.description,
        skills: exp.skills,
        targetCompany: this.request.targetCompany,
      };

      const cached = await getCachedResult(cacheKey, "keyword-optimization", inputData);
      if (cached) {
        improvedExperiences.push(cached);
        suggestions.push({
          id: crypto.randomUUID(),
          section: "experience",
          type: "keyword-optimization",
          original: exp.description,
          suggested: cached,
          reasoning: "Optimized with action verbs and quantifiable achievements",
          priority: "high",
          status: "pending",
          cached: true,
        });
        continue;
      }

      const improved = await improveContent(
        exp.description,
        "experience",
        this.request.companyRequirements?.requiredSkills || []
      );

      await generateWithCache(cacheKey, "keyword-optimization", inputData, improved);

      improvedExperiences.push(improved);
      suggestions.push({
        id: crypto.randomUUID(),
        section: "experience",
        type: "keyword-optimization",
        original: exp.description,
        suggested: improved,
        reasoning: "Optimized with action verbs and quantifiable achievements",
        priority: "high",
        status: "pending",
        cached: false,
      });
    }

    return {
      content: improvedExperiences.join("\n\n"),
      suggestions,
      cached: suggestions.every(s => s.cached),
    };
  }

  private async generateProjects(skillGapAnalysis?: SkillGapAnalysis): Promise<{
    content: string;
    suggestions: AIResumeSuggestion[];
    cached: boolean;
  }> {
    const suggestions: AIResumeSuggestion[] = [];
    const improvedProjects: string[] = [];

    for (const project of this.studentProfile.projects) {
      const cacheKey = `project-${this.studentProfile.id}-${project.id}`;
      const inputData = {
        title: project.title,
        description: project.description,
        technologies: project.technologies,
        targetCompany: this.request.targetCompany,
      };

      const cached = await getCachedResult(cacheKey, "keyword-optimization", inputData);
      if (cached) {
        improvedProjects.push(cached);
        suggestions.push({
          id: crypto.randomUUID(),
          section: "projects",
          type: "keyword-optimization",
          original: project.description,
          suggested: cached,
          reasoning: "Enhanced with technical details and impact metrics",
          priority: "medium",
          status: "pending",
          cached: true,
        });
        continue;
      }

      const improved = await improveContent(
        project.description,
        "projects",
        this.request.companyRequirements?.requiredSkills || []
      );

      await generateWithCache(cacheKey, "keyword-optimization", inputData, improved);

      improvedProjects.push(improved);
      suggestions.push({
        id: crypto.randomUUID(),
        section: "projects",
        type: "keyword-optimization",
        original: project.description,
        suggested: improved,
        reasoning: "Enhanced with technical details and impact metrics",
        priority: "medium",
        status: "pending",
        cached: false,
      });
    }

    return {
      content: improvedProjects.join("\n\n"),
      suggestions,
      cached: suggestions.every(s => s.cached),
    };
  }

  private async generateSkills(skillGapAnalysis?: SkillGapAnalysis): Promise<{
    content: string;
    suggestions: AIResumeSuggestion[];
    cached: boolean;
  }> {
    const suggestions: AIResumeSuggestion[] = [];
    let skills = [...this.studentProfile.skills];

    if (skillGapAnalysis && this.request.companyRequirements) {
      const relevantSkills = skills.filter(skill =>
        this.request.companyRequirements!.requiredSkills.includes(skill) ||
        this.request.companyRequirements!.preferredSkills.includes(skill)
      );

      const otherSkills = skills.filter(skill => !relevantSkills.includes(skill));

      skills = [...relevantSkills, ...otherSkills];

      suggestions.push({
        id: crypto.randomUUID(),
        section: "skills",
        type: "improvement",
        suggested: `Prioritized skills matching ${this.request.companyRequirements.companyName} requirements`,
        reasoning: `Highlighted ${relevantSkills.length} relevant skills for the role`,
        priority: "high",
        status: "pending",
      });
    }

    return {
      content: skills.join(", "),
      suggestions,
      cached: false,
    };
  }

  private async generateAchievements(): Promise<{
    content: string;
    suggestions: AIResumeSuggestion[];
    cached: boolean;
  }> {
    const suggestions: AIResumeSuggestion[] = [];
    const improvedAchievements: string[] = [];

    for (const achievement of this.studentProfile.achievements) {
      const cacheKey = `achievement-${this.studentProfile.id}-${achievement.id}`;
      const inputData = {
        title: achievement.title,
        description: achievement.description,
        category: achievement.category,
      };

      const cached = await getCachedResult(cacheKey, "keyword-optimization", inputData);
      if (cached) {
        improvedAchievements.push(cached);
        suggestions.push({
          id: crypto.randomUUID(),
          section: "achievements",
          type: "rephrasing",
          original: achievement.description,
          suggested: cached,
          reasoning: "Rephrased to highlight impact and recognition",
          priority: "medium",
          status: "pending",
          cached: true,
        });
        continue;
      }

      const improved = await improveContent(
        achievement.description,
        "achievements",
        []
      );

      await generateWithCache(cacheKey, "keyword-optimization", inputData, improved);

      improvedAchievements.push(improved);
      suggestions.push({
        id: crypto.randomUUID(),
        section: "achievements",
        type: "rephrasing",
        original: achievement.description,
        suggested: improved,
        reasoning: "Rephrased to highlight impact and recognition",
        priority: "medium",
        status: "pending",
        cached: false,
      });
    }

    return {
      content: improvedAchievements.join("\n"),
      suggestions,
      cached: suggestions.every(s => s.cached),
    };
  }

  private formatEducation(): string {
    return this.studentProfile.education
      .map(edu => `${edu.degree} in ${edu.field} - ${edu.institution} (${edu.startYear}-${edu.endYear || "Present"})`)
      .join("\n");
  }

  private formatCertifications(): string {
    return this.studentProfile.certifications
      .map(cert => `${cert.name} - ${cert.issuer} (${cert.date})`)
      .join("\n");
  }

  private buildSummaryPrompt(skillGapAnalysis?: SkillGapAnalysis): string {
    let prompt = `Generate a professional summary for ${this.studentProfile.name}, a ${this.studentProfile.branch} student graduating in ${this.studentProfile.graduationYear}.`;

    if (this.request.targetCompany && this.request.targetRole) {
      prompt += ` Targeting ${this.request.targetRole} role at ${this.request.targetCompany}.`;
    }

    prompt += ` Skills: ${this.studentProfile.skills.join(", ")}.`;
    prompt += ` Experience: ${this.studentProfile.experience.length} positions.`;
    prompt += ` Projects: ${this.studentProfile.projects.length} projects.`;

    if (skillGapAnalysis) {
      prompt += ` Emphasize skills matching company requirements: ${skillGapAnalysis.presentSkills.join(", ")}.`;
    }

    return prompt;
  }
}

export async function generateAIResume(
  studentProfile: StudentProfile,
  request: ResumeGenerationRequest
): Promise<AIResumeGeneration> {
  const generator = new AIResumeGenerator(studentProfile, request);
  return await generator.generateResume();
}
