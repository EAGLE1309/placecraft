import { GoogleGenerativeAI, SchemaType, Schema } from "@google/generative-ai";
import {
  ExtractedResumeData,
  ResumeAnalysisSuggestion,
  ResumeLearningSuggestion,
  GeminiResumeExtractionResponse,
  GeminiImproveResumeResponse,
  ImprovedResumeData,
} from "@/types/resume";
import { v4 as uuidv4 } from "uuid";

/**
 * Resume AI Module
 * 
 * This module handles all AI interactions for the resume subsystem:
 * - Unified extraction + analysis (single Gemini call)
 * - Resume improvement based on stored analysis
 * 
 * All Gemini calls use strict JSON schemas for consistent output.
 */

// ==================== UTILITIES ====================

/**
 * Clean undefined values from object for Firebase compatibility
 * Firebase doesn't accept undefined values, but our TypeScript types use undefined for optional fields
 */
export function cleanUndefinedValues(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(cleanUndefinedValues);
  }

  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = cleanUndefinedValues(value);
    }
  }
  return cleaned;
}

// ==================== GEMINI CLIENT & RATE LIMITING ====================

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenerativeAI(apiKey);
}

const requestTracker = {
  minuteCount: 0,
  dayCount: 0,
  lastMinuteReset: Date.now(),
  lastDayReset: Date.now(),
};

const RATE_LIMITS = {
  perMinute: 12,
  perDay: 1400,
};

function checkRateLimit(): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();

  if (now - requestTracker.lastMinuteReset >= 60000) {
    requestTracker.minuteCount = 0;
    requestTracker.lastMinuteReset = now;
  }

  if (now - requestTracker.lastDayReset >= 86400000) {
    requestTracker.dayCount = 0;
    requestTracker.lastDayReset = now;
  }

  if (requestTracker.minuteCount >= RATE_LIMITS.perMinute) {
    const retryAfter = 60000 - (now - requestTracker.lastMinuteReset);
    return { allowed: false, retryAfter };
  }

  if (requestTracker.dayCount >= RATE_LIMITS.perDay) {
    return { allowed: false, retryAfter: 86400000 };
  }

  return { allowed: true };
}

function incrementRequestCount() {
  requestTracker.minuteCount++;
  requestTracker.dayCount++;
}

export function getQuotaInfo() {
  const now = Date.now();

  if (now - requestTracker.lastMinuteReset >= 60000) {
    requestTracker.minuteCount = 0;
    requestTracker.lastMinuteReset = now;
  }
  if (now - requestTracker.lastDayReset >= 86400000) {
    requestTracker.dayCount = 0;
    requestTracker.lastDayReset = now;
  }

  return {
    minuteRemaining: RATE_LIMITS.perMinute - requestTracker.minuteCount,
    dayRemaining: RATE_LIMITS.perDay - requestTracker.dayCount,
    resetInSeconds: Math.ceil((60000 - (now - requestTracker.lastMinuteReset)) / 1000),
  };
}

// ==================== STRICT JSON SCHEMAS ====================

const extractionSchema: Schema = {
  type: SchemaType.OBJECT as const,
  properties: {
    extractedData: {
      type: SchemaType.OBJECT,
      properties: {
        personalInfo: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING, nullable: true },
            email: { type: SchemaType.STRING, nullable: true },
            phone: { type: SchemaType.STRING, nullable: true },
            location: { type: SchemaType.STRING, nullable: true },
            linkedin: { type: SchemaType.STRING, nullable: true },
            github: { type: SchemaType.STRING, nullable: true },
            portfolio: { type: SchemaType.STRING, nullable: true },
            summary: { type: SchemaType.STRING, nullable: true },
          },
          required: ["name", "email", "phone", "location", "linkedin", "github", "portfolio", "summary"],
        },
        education: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              institution: { type: SchemaType.STRING },
              degree: { type: SchemaType.STRING },
              field: { type: SchemaType.STRING, nullable: true },
              startYear: { type: SchemaType.STRING, nullable: true },
              endYear: { type: SchemaType.STRING, nullable: true },
              grade: { type: SchemaType.STRING, nullable: true },
              current: { type: SchemaType.BOOLEAN },
            },
            required: ["institution", "degree", "current"],
          },
        },
        experience: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              company: { type: SchemaType.STRING },
              role: { type: SchemaType.STRING },
              description: { type: SchemaType.STRING, nullable: true },
              startDate: { type: SchemaType.STRING, nullable: true },
              endDate: { type: SchemaType.STRING, nullable: true },
              current: { type: SchemaType.BOOLEAN },
              highlights: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING },
              },
            },
            required: ["company", "role", "current", "highlights"],
          },
        },
        projects: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING },
              description: { type: SchemaType.STRING, nullable: true },
              technologies: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING },
              },
              link: { type: SchemaType.STRING, nullable: true },
            },
            required: ["title", "technologies"],
          },
        },
        skills: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
        certifications: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              name: { type: SchemaType.STRING },
              issuer: { type: SchemaType.STRING, nullable: true },
              date: { type: SchemaType.STRING, nullable: true },
            },
            required: ["name"],
          },
        },
        achievements: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING },
              description: { type: SchemaType.STRING, nullable: true },
            },
            required: ["title"],
          },
        },
      },
      required: ["personalInfo", "education", "experience", "projects", "skills", "certifications", "achievements"],
    },
    analysis: {
      type: SchemaType.OBJECT,
      properties: {
        overallScore: { type: SchemaType.NUMBER },
        atsScore: { type: SchemaType.NUMBER },
        strengths: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
        weaknesses: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
        suggestions: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              type: { type: SchemaType.STRING },
              section: { type: SchemaType.STRING },
              suggestion: { type: SchemaType.STRING },
              priority: { type: SchemaType.STRING },
            },
            required: ["type", "section", "suggestion", "priority"],
          },
        },
        learningSuggestions: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              skill: { type: SchemaType.STRING },
              priority: { type: SchemaType.STRING },
              learningType: { type: SchemaType.STRING },
              estimatedTime: { type: SchemaType.STRING },
              reason: { type: SchemaType.STRING },
            },
            required: ["skill", "priority", "learningType", "estimatedTime", "reason"],
          },
        },
      },
      required: ["overallScore", "atsScore", "strengths", "weaknesses", "suggestions", "learningSuggestions"],
    },
  },
  required: ["extractedData", "analysis"],
};

const improveResumeSchema: Schema = {
  type: SchemaType.OBJECT as const,
  properties: {
    improvedData: {
      type: SchemaType.OBJECT,
      properties: {
        personalInfo: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING, nullable: true },
            email: { type: SchemaType.STRING, nullable: true },
            phone: { type: SchemaType.STRING, nullable: true },
            location: { type: SchemaType.STRING, nullable: true },
            linkedin: { type: SchemaType.STRING, nullable: true },
            github: { type: SchemaType.STRING, nullable: true },
            portfolio: { type: SchemaType.STRING, nullable: true },
            summary: { type: SchemaType.STRING, nullable: true },
          },
          required: ["name", "email", "phone", "location", "linkedin", "github", "portfolio", "summary"],
        },
        education: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              institution: { type: SchemaType.STRING },
              degree: { type: SchemaType.STRING },
              field: { type: SchemaType.STRING, nullable: true },
              startYear: { type: SchemaType.STRING, nullable: true },
              endYear: { type: SchemaType.STRING, nullable: true },
              grade: { type: SchemaType.STRING, nullable: true },
              current: { type: SchemaType.BOOLEAN },
            },
            required: ["institution", "degree", "current"],
          },
        },
        experience: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              company: { type: SchemaType.STRING },
              role: { type: SchemaType.STRING },
              description: { type: SchemaType.STRING },
              startDate: { type: SchemaType.STRING, nullable: true },
              endDate: { type: SchemaType.STRING, nullable: true },
              current: { type: SchemaType.BOOLEAN },
              highlights: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING },
              },
            },
            required: ["company", "role", "description", "current", "highlights"],
          },
        },
        projects: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING },
              description: { type: SchemaType.STRING },
              technologies: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING },
              },
              link: { type: SchemaType.STRING, nullable: true },
            },
            required: ["title", "description", "technologies"],
          },
        },
        skills: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
        certifications: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              name: { type: SchemaType.STRING },
              issuer: { type: SchemaType.STRING, nullable: true },
              date: { type: SchemaType.STRING, nullable: true },
            },
            required: ["name"],
          },
        },
        achievements: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING },
              description: { type: SchemaType.STRING },
            },
            required: ["title", "description"],
          },
        },
      },
      required: ["personalInfo", "education", "experience", "projects", "skills", "certifications", "achievements"],
    },
    improvementSummary: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
  required: ["improvedData", "improvementSummary"],
};

// ==================== EXTRACTION + ANALYSIS (SINGLE CALL) ====================

export interface ExtractAndAnalyzeResult {
  extractedData: ExtractedResumeData;
  overallScore: number;
  atsScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: ResumeAnalysisSuggestion[];
  learningSuggestions: ResumeLearningSuggestion[];
}

/**
 * Extract resume content and analyze it in a single Gemini API call
 * Uses strict JSON schema for consistent output
 */
export async function extractAndAnalyzeResume(
  resumeText: string,
  targetRole?: string
): Promise<ExtractAndAnalyzeResult> {
  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    throw new Error(
      `Rate limit exceeded. Please try again in ${Math.ceil((rateCheck.retryAfter || 60000) / 1000)} seconds.`
    );
  }

  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: extractionSchema,
    },
  });

  const prompt = `You are an expert resume parser and career counselor. Your task is to:
1. Extract ALL structured information from the resume
2. Provide a comprehensive analysis with scores and suggestions

RESUME TEXT:
"""
${resumeText}
"""

${targetRole ? `TARGET ROLE: ${targetRole}` : "TARGET ROLE: Software Engineering"}

INSTRUCTIONS:
1. Extract all information you can find. For missing fields, use null.
2. For education/experience dates, preserve the original format found in the resume.
3. For skills, extract ALL technical skills, soft skills, tools, frameworks, and languages mentioned.
4. Provide honest scores (0-100):
   - overallScore: Quality of content, achievements, quantification, relevance
   - atsScore: ATS compatibility (simple formatting, keywords, standard sections)
5. List 3-5 strengths (what the resume does well)
6. List 3-5 weaknesses (areas needing improvement)
7. Provide 5-10 specific, actionable suggestions with priority levels
8. Provide 3-5 learning suggestions for skill gaps

Be thorough but realistic in scoring. Most student resumes score 40-70.`;

  try {
    incrementRequestCount();
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    const parsed = JSON.parse(text) as GeminiResumeExtractionResponse;

    // Transform to our internal format with IDs for suggestions
    const suggestions: ResumeAnalysisSuggestion[] = parsed.analysis.suggestions.map((s) => ({
      id: uuidv4(),
      type: s.type as ResumeAnalysisSuggestion["type"],
      section: s.section,
      suggestion: s.suggestion,
      priority: s.priority as ResumeAnalysisSuggestion["priority"],
    }));

    const learningSuggestions: ResumeLearningSuggestion[] = parsed.analysis.learningSuggestions.map((l) => ({
      skill: l.skill,
      priority: l.priority as ResumeLearningSuggestion["priority"],
      learningType: l.learningType as ResumeLearningSuggestion["learningType"],
      estimatedTime: l.estimatedTime,
      reason: l.reason,
    }));

    // Build extracted data with proper undefined handling for type compatibility
    const extractedData: ExtractedResumeData = {
      personalInfo: {
        name: parsed.extractedData.personalInfo.name || undefined,
        email: parsed.extractedData.personalInfo.email || undefined,
        phone: parsed.extractedData.personalInfo.phone || undefined,
        location: parsed.extractedData.personalInfo.location || undefined,
        linkedin: parsed.extractedData.personalInfo.linkedin || undefined,
        github: parsed.extractedData.personalInfo.github || undefined,
        portfolio: parsed.extractedData.personalInfo.portfolio || undefined,
        summary: parsed.extractedData.personalInfo.summary || undefined,
      },
      education: parsed.extractedData.education.map((e) => ({
        institution: e.institution,
        degree: e.degree,
        field: e.field || undefined,
        startYear: e.startYear || undefined,
        endYear: e.endYear || undefined,
        grade: e.grade || undefined,
        current: e.current,
      })),
      experience: parsed.extractedData.experience.map((e) => ({
        company: e.company,
        role: e.role,
        description: e.description || undefined,
        startDate: e.startDate || undefined,
        endDate: e.endDate || undefined,
        current: e.current,
        highlights: e.highlights,
      })),
      projects: parsed.extractedData.projects.map((p) => ({
        title: p.title,
        description: p.description || undefined,
        technologies: p.technologies,
        link: p.link || undefined,
      })),
      skills: parsed.extractedData.skills,
      certifications: parsed.extractedData.certifications.map((c) => ({
        name: c.name,
        issuer: c.issuer || undefined,
        date: c.date || undefined,
      })),
      achievements: parsed.extractedData.achievements.map((a) => ({
        title: a.title,
        description: a.description || undefined,
      })),
      rawTextLength: resumeText.length,
    };

    return {
      extractedData,
      overallScore: Math.min(100, Math.max(0, Math.round(parsed.analysis.overallScore))),
      atsScore: Math.min(100, Math.max(0, Math.round(parsed.analysis.atsScore))),
      strengths: parsed.analysis.strengths,
      weaknesses: parsed.analysis.weaknesses,
      suggestions,
      learningSuggestions,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Resume AI] Extraction and analysis failed:", error);

    // Provide specific error messages for common issues
    if (message.includes("GEMINI_API_KEY") || message.toLowerCase().includes("api key")) {
      throw new Error("AI service is not configured (missing GEMINI_API_KEY). Please contact support.");
    }

    if (message.toLowerCase().includes("quota") || message.toLowerCase().includes("429")) {
      throw new Error("AI service quota exceeded. Please try again later.");
    }

    if (message.toLowerCase().includes("rate")) {
      throw new Error("AI service is rate limited. Please try again in a moment.");
    }

    if (message.toLowerCase().includes("model") && message.toLowerCase().includes("not")) {
      throw new Error("AI service configuration error (model unavailable). Please contact support.");
    }

    // Fall back to a generic message but preserve some context
    throw new Error(`Failed to analyze resume: ${message.substring(0, 150)}`);
  }
}

// ==================== IMPROVE RESUME ====================

/**
 * Generate an improved version of the resume based on stored analysis
 * Uses strict JSON schema for consistent output
 */
export async function improveResume(
  extractedData: ExtractedResumeData,
  suggestions: ResumeAnalysisSuggestion[],
  targetRole?: string
): Promise<ImprovedResumeData> {
  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    throw new Error(
      `Rate limit exceeded. Please try again in ${Math.ceil((rateCheck.retryAfter || 60000) / 1000)} seconds.`
    );
  }

  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: improveResumeSchema,
    },
  });

  const suggestionsText = suggestions
    .map((s, i) => `${i + 1}. [${s.priority.toUpperCase()}] ${s.section}: ${s.suggestion}`)
    .join("\n");

  const prompt = `You are an expert resume writer. Your task is to IMPROVE the resume content based on the analysis suggestions provided.

ORIGINAL EXTRACTED RESUME DATA:
${JSON.stringify(extractedData, null, 2)}

IMPROVEMENT SUGGESTIONS TO APPLY:
${suggestionsText}

${targetRole ? `TARGET ROLE: ${targetRole}` : ""}

INSTRUCTIONS:
1. Improve ALL content based on the suggestions:
   - Rewrite experience descriptions with action verbs and quantified achievements
   - Enhance project descriptions with technical details and impact
   - Improve the summary to be compelling and role-focused
   - Optimize skill ordering (most relevant first)
   - Improve achievement descriptions to highlight impact

2. PRESERVE all original information (dates, names, contact info)
3. DO NOT invent new experiences or projects - only improve existing content
4. Add highlight bullet points for each experience entry
5. Ensure descriptions are concise but impactful (2-4 sentences each)

6. In improvementSummary, list what specific improvements you made (5-10 items)

Return the improved resume in the exact same structure as the input.`;

  try {
    incrementRequestCount();
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    const parsed = JSON.parse(text) as GeminiImproveResumeResponse;

    // Build improved data with proper null handling
    const improvedData: ImprovedResumeData = {
      personalInfo: {
        name: parsed.improvedData.personalInfo.name || undefined,
        email: parsed.improvedData.personalInfo.email || undefined,
        phone: parsed.improvedData.personalInfo.phone || undefined,
        location: parsed.improvedData.personalInfo.location || undefined,
        linkedin: parsed.improvedData.personalInfo.linkedin || undefined,
        github: parsed.improvedData.personalInfo.github || undefined,
        portfolio: parsed.improvedData.personalInfo.portfolio || undefined,
        summary: parsed.improvedData.personalInfo.summary || undefined,
      },
      education: parsed.improvedData.education.map((e) => ({
        institution: e.institution,
        degree: e.degree,
        field: e.field || undefined,
        startYear: e.startYear || undefined,
        endYear: e.endYear || undefined,
        grade: e.grade || undefined,
        current: e.current,
      })),
      experience: parsed.improvedData.experience.map((e) => ({
        company: e.company,
        role: e.role,
        description: e.description,
        startDate: e.startDate || undefined,
        endDate: e.endDate || undefined,
        current: e.current,
        highlights: e.highlights,
      })),
      projects: parsed.improvedData.projects.map((p) => ({
        title: p.title,
        description: p.description,
        technologies: p.technologies,
        link: p.link || undefined,
      })),
      skills: parsed.improvedData.skills,
      certifications: parsed.improvedData.certifications.map((c) => ({
        name: c.name,
        issuer: c.issuer || undefined,
        date: c.date || undefined,
      })),
      achievements: parsed.improvedData.achievements.map((a) => ({
        title: a.title,
        description: a.description,
      })),
      improvementSummary: parsed.improvementSummary,
    };

    return improvedData;
  } catch (error: any) {
    console.error("[Resume AI] Improvement failed:", error);

    // Handle quota exceeded errors specifically
    if (error.message?.includes('quota exceeded') || error.message?.includes('429')) {
      throw new Error("API quota exceeded. Please try again later or upgrade your plan.");
    }

    throw new Error("Failed to improve resume. Please try again later.");
  }
}

// ==================== PDF TEXT EXTRACTION ====================

/**
 * Extract text from PDF buffer using local parser first, Gemini AI as fallback
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error("Invalid PDF: Buffer is empty");
  }

  // Quick signature check to catch non-PDF uploads early
  // A valid PDF typically starts with "%PDF-".
  const header = pdfBuffer.subarray(0, Math.min(pdfBuffer.length, 8)).toString("utf8");
  if (!header.startsWith("%PDF-")) {
    throw new Error("Invalid PDF: File does not appear to be a valid PDF document");
  }

  const maxSize = 20 * 1024 * 1024; // 20MB limit
  if (pdfBuffer.length > maxSize) {
    throw new Error(`PDF file is too large (${(pdfBuffer.length / 1024 / 1024).toFixed(2)}MB). Maximum size is 20MB.`);
  }

  console.log(`[PDF Extraction] Starting extraction for ${(pdfBuffer.length / 1024).toFixed(2)}KB PDF`);

  // Try local extraction first (fast, no API quota usage)
  try {
    const localText = await extractTextLocally(pdfBuffer);
    if (localText && localText.trim().length >= 50) {
      console.log("[PDF Extraction] Successfully used local parser (no API call)");
      return localText;
    }
  } catch (localError) {
    console.log(
      "[PDF Extraction] Local parser failed, falling back to Gemini AI:",
      localError instanceof Error ? localError.message : String(localError)
    );
  }

  // Fallback to Gemini AI (for image-based PDFs or complex layouts)
  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    throw new Error(
      `Rate limit exceeded. Please try again in ${Math.ceil((rateCheck.retryAfter || 60000) / 1000)} seconds.`
    );
  }

  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `Extract all text content from this PDF document. Return only the raw text, preserving the general structure but removing formatting. Do not add any analysis or commentary. If the PDF is encrypted, password-protected, or unreadable, respond with "ERROR: Cannot read PDF".`;

  try {
    incrementRequestCount();
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBuffer.toString("base64"),
        },
      },
    ]);

    const extractedText = result.response.text();

    if (extractedText.includes("ERROR: Cannot read PDF")) {
      throw new Error("PDF is encrypted, password-protected, or corrupted");
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("No text could be extracted from the PDF.");
    }

    console.log(`[PDF Extraction] Gemini AI extracted ${extractedText.length} characters`);
    return extractedText;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[PDF Extraction] Gemini AI extraction failed:", {
      message,
      bufferSize: pdfBuffer.length,
    });

    // Keep error messages actionable for the UI.
    if (message.includes("GEMINI_API_KEY") || message.toLowerCase().includes("api key")) {
      throw new Error("AI extraction is not configured (missing GEMINI_API_KEY). Please contact support.");
    }

    if (message.toLowerCase().includes("rate") || message.toLowerCase().includes("quota")) {
      throw new Error("AI service is rate limited. Please try again in a moment.");
    }

    if (message.toLowerCase().includes("model") && message.toLowerCase().includes("not")) {
      throw new Error("AI service configuration error (model unavailable). Please contact support.");
    }

    // Fall back to a generic message but preserve the root cause for debugging.
    throw new Error(`Failed to extract text from PDF: ${message}`);
  }
}

async function extractTextLocally(pdfBuffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const PDFParser = require("pdf2json");
      const pdfParser = new PDFParser();

      pdfParser.on("pdfParser_dataError", (errData: { parserError: string }) => {
        reject(new Error(errData.parserError));
      });

      pdfParser.on("pdfParser_dataReady", (pdfData: { Pages: Array<{ Texts: Array<{ R: Array<{ T: string }> }> }> }) => {
        try {
          let extractedText = "";
          if (pdfData.Pages) {
            pdfData.Pages.forEach((page) => {
              if (page.Texts) {
                page.Texts.forEach((text) => {
                  if (text.R) {
                    text.R.forEach((r) => {
                      if (r.T) {
                        extractedText += decodeURIComponent(r.T) + " ";
                      }
                    });
                  }
                });
                extractedText += "\n";
              }
            });
          }

          const cleanedText = extractedText.trim();
          if (!cleanedText || cleanedText.length < 50) {
            reject(new Error("Insufficient text extracted locally"));
            return;
          }

          resolve(cleanedText);
        } catch (err) {
          reject(err);
        }
      });

      pdfParser.parseBuffer(pdfBuffer);
    } catch (error) {
      reject(error);
    }
  });
}
