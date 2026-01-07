import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenerativeAI(apiKey);
}

// Rate limiting: Track requests to stay within free tier limits
// Free tier: 15 RPM (requests per minute), 1500 RPD (requests per day)
const requestTracker = {
  minuteCount: 0,
  dayCount: 0,
  lastMinuteReset: Date.now(),
  lastDayReset: Date.now(),
};

const RATE_LIMITS = {
  perMinute: 12, // Keep buffer below 15 RPM
  perDay: 1400,  // Keep buffer below 1500 RPD
};

function checkRateLimit(): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  
  // Reset minute counter if a minute has passed
  if (now - requestTracker.lastMinuteReset >= 60000) {
    requestTracker.minuteCount = 0;
    requestTracker.lastMinuteReset = now;
  }
  
  // Reset day counter if a day has passed
  if (now - requestTracker.lastDayReset >= 86400000) {
    requestTracker.dayCount = 0;
    requestTracker.lastDayReset = now;
  }
  
  // Check limits
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

export interface ResumeAnalysisResult {
  overallScore: number;
  atsScore: number;
  strengths: string[];
  weaknesses: string[];
  skills: string[];
  suggestions: {
    type: "improvement" | "keyword" | "format" | "content";
    section: string;
    suggestion: string;
    priority: "high" | "medium" | "low";
  }[];
  experience: {
    company: string;
    role: string;
    duration: string;
  }[];
  education: {
    institution: string;
    degree: string;
    year: string;
  }[];
  learningSuggestions: {
    skill: string;
    priority: "high" | "medium" | "low";
    learningType: "concept" | "tool" | "practice";
    estimatedTime: string;
    reason: string;
  }[];
}

/**
 * Analyze resume text using Gemini AI
 * This combines multiple analysis tasks into ONE prompt to minimize API calls
 */
export async function analyzeResume(
  resumeText: string,
  targetRole?: string
): Promise<ResumeAnalysisResult> {
  // Check rate limit
  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    throw new Error(
      `Rate limit exceeded. Please try again in ${Math.ceil((rateCheck.retryAfter || 60000) / 1000)} seconds.`
    );
  }

  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Single comprehensive prompt to minimize API calls
  const prompt = `You are an expert resume analyzer and career counselor. Analyze the following resume and provide a comprehensive evaluation.

RESUME TEXT:
"""
${resumeText}
"""

${targetRole ? `TARGET ROLE: ${targetRole}` : ""}

Provide your analysis in the following JSON format ONLY (no additional text):
{
  "overallScore": <number 0-100 based on overall quality>,
  "atsScore": <number 0-100 for ATS compatibility>,
  "strengths": [<array of 3-5 key strengths as strings>],
  "weaknesses": [<array of 3-5 areas needing improvement as strings>],
  "skills": [<array of all technical and soft skills extracted>],
  "suggestions": [
    {
      "type": "<improvement|keyword|format|content>",
      "section": "<section name>",
      "suggestion": "<specific actionable suggestion>",
      "priority": "<high|medium|low>"
    }
  ],
  "experience": [
    {
      "company": "<company name>",
      "role": "<job title>",
      "duration": "<duration string>"
    }
  ],
  "education": [
    {
      "institution": "<school/university>",
      "degree": "<degree type and field>",
      "year": "<graduation year or expected>"
    }
  ],
  "learningSuggestions": [
    {
      "skill": "<skill to learn>",
      "priority": "<high|medium|low>",
      "learningType": "<concept|tool|practice>",
      "estimatedTime": "<e.g., 2-4 weeks>",
      "reason": "<why this skill is important>"
    }
  ]
}

Scoring Guidelines:
- Overall Score: Consider content quality, achievements, formatting, completeness
- ATS Score: Check for clean formatting, relevant keywords, no tables/graphics mentions, standard sections
- Provide 3-5 learning suggestions based on skill gaps for ${targetRole || "software engineering roles"}

Return ONLY the JSON object, no markdown formatting or additional text.`;

  try {
    incrementRequestCount();
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Parse JSON from response (handle potential markdown wrapping)
    let jsonText = text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.slice(7);
    }
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith("```")) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();
    
    const analysis = JSON.parse(jsonText) as ResumeAnalysisResult;
    
    // Validate and sanitize scores
    analysis.overallScore = Math.min(100, Math.max(0, Math.round(analysis.overallScore)));
    analysis.atsScore = Math.min(100, Math.max(0, Math.round(analysis.atsScore)));
    
    return analysis;
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to analyze resume. Please try again later.");
  }
}

/**
 * Extract text from PDF buffer using Gemini's vision capability
 * This is useful when we can't parse PDF directly
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  // Check rate limit
  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    throw new Error(
      `Rate limit exceeded. Please try again in ${Math.ceil((rateCheck.retryAfter || 60000) / 1000)} seconds.`
    );
  }

  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Extract all text content from this PDF document. Return only the raw text, preserving the general structure but removing formatting. Do not add any analysis or commentary.`;

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
    
    return result.response.text();
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error("Failed to extract text from PDF.");
  }
}

/**
 * Calculate skill match percentage between student skills and job requirements
 * This is done locally without API call to save quota
 */
export function calculateSkillMatch(
  studentSkills: string[],
  requiredSkills: string[]
): number {
  if (requiredSkills.length === 0) return 100;
  
  const normalizedStudentSkills = studentSkills.map((s) => s.toLowerCase().trim());
  const normalizedRequired = requiredSkills.map((s) => s.toLowerCase().trim());
  
  let matchCount = 0;
  for (const required of normalizedRequired) {
    // Check for exact match or partial match
    const hasMatch = normalizedStudentSkills.some(
      (skill) => skill.includes(required) || required.includes(skill)
    );
    if (hasMatch) matchCount++;
  }
  
  return Math.round((matchCount / normalizedRequired.length) * 100);
}

/**
 * Get remaining API quota info
 */
export function getQuotaInfo() {
  const now = Date.now();
  
  // Reset counters if needed
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
