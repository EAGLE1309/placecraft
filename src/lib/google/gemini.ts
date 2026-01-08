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
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
 * Extract text from PDF buffer locally using pdf2json
 * Fast, no API calls, works for standard text-based PDFs
 */
async function extractTextLocally(pdfBuffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      console.log("[PDF Parser] Attempting local extraction with pdf2json");

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const PDFParser = require("pdf2json");
      const pdfParser = new PDFParser();

      pdfParser.on("pdfParser_dataError", (errData: { parserError: string }) => {
        console.log("[PDF Parser] Local extraction failed:", errData.parserError);
        reject(new Error(errData.parserError));
      });

      pdfParser.on("pdfParser_dataReady", (pdfData: { Pages: Array<{ Texts: Array<{ R: Array<{ T: string }> }> }> }) => {
        try {
          // Extract text from all pages
          let extractedText = "";

          if (pdfData.Pages) {
            pdfData.Pages.forEach((page) => {
              if (page.Texts) {
                page.Texts.forEach((text) => {
                  if (text.R) {
                    text.R.forEach((r) => {
                      if (r.T) {
                        // Decode URI component (pdf2json encodes text)
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

          console.log(`[PDF Parser] Successfully extracted ${cleanedText.length} characters locally`);
          resolve(cleanedText);
        } catch (err) {
          reject(err);
        }
      });

      // Parse the PDF buffer
      pdfParser.parseBuffer(pdfBuffer);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Extract text from PDF buffer using local parser first, Gemini AI as fallback
 * Primary: pdf2json (fast, no API calls, works for text-based PDFs)
 * Fallback: Gemini AI (handles image-based PDFs and complex layouts)
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  // Validate buffer
  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error("Invalid PDF: Buffer is empty");
  }

  // Check if buffer is too large (Gemini has limits)
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
  // Check rate limit before using Gemini
  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    throw new Error(
      `Rate limit exceeded. Please try again in ${Math.ceil((rateCheck.retryAfter || 60000) / 1000)} seconds.`
    );
  }
  console.log("[PDF Extraction] Using Gemini AI fallback for extraction");

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

    // Check if extraction failed
    if (extractedText.includes("ERROR: Cannot read PDF")) {
      throw new Error("PDF is encrypted, password-protected, or corrupted");
    }

    // Validate extracted text
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("No text could be extracted from the PDF. The file may be image-based or corrupted.");
    }

    console.log(`[PDF Extraction] Gemini AI extracted ${extractedText.length} characters`);
    return extractedText;
  } catch (error) {
    console.error("[PDF Extraction] Gemini AI extraction failed:", {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      bufferSize: pdfBuffer.length,
    });

    // Provide more specific error messages
    if (error instanceof Error) {
      // Re-throw our custom errors
      if (error.message.includes("encrypted") ||
        error.message.includes("password-protected") ||
        error.message.includes("No text could be extracted")) {
        throw error;
      }

      // Handle Gemini API errors
      if (error.message.includes("quota") || error.message.includes("rate limit")) {
        throw new Error("API rate limit reached. Please try again in a few moments.");
      }

      if (error.message.includes("API key")) {
        throw new Error("AI service configuration error. Please contact support.");
      }

      // Generic Gemini error
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }

    throw new Error("Failed to extract text from PDF. Please ensure the file is a valid, readable PDF document.");
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

/**
 * Analyze skill gap between student skills and company requirements
 */
export async function analyzeSkillGap(
  studentSkills: string[],
  requiredSkills: string[],
  preferredSkills: string[]
): Promise<{
  requiredSkills: string[];
  presentSkills: string[];
  missingSkills: string[];
  partialSkills: string[];
  recommendedLearning: Array<{
    skill: string;
    priority: "critical" | "high" | "medium" | "low";
    estimatedTime: string;
    availableCourses?: string[];
    reason: string;
  }>;
  canProceedWithResume: boolean;
  matchPercentage: number;
}> {
  const normalizedStudentSkills = studentSkills.map(s => s.toLowerCase().trim());
  const normalizedRequired = requiredSkills.map(s => s.toLowerCase().trim());
  const normalizedPreferred = preferredSkills.map(s => s.toLowerCase().trim());

  const presentSkills: string[] = [];
  const missingSkills: string[] = [];
  const partialSkills: string[] = [];

  for (const required of requiredSkills) {
    const normalized = required.toLowerCase().trim();
    const hasExact = normalizedStudentSkills.some(s => s === normalized);
    const hasPartial = normalizedStudentSkills.some(s => s.includes(normalized) || normalized.includes(s));

    if (hasExact) {
      presentSkills.push(required);
    } else if (hasPartial) {
      partialSkills.push(required);
    } else {
      missingSkills.push(required);
    }
  }

  const matchPercentage = Math.round(((presentSkills.length + partialSkills.length * 0.5) / requiredSkills.length) * 100);
  const canProceedWithResume = matchPercentage >= 40;

  const recommendedLearning = missingSkills.slice(0, 5).map(skill => ({
    skill,
    priority: "high" as const,
    estimatedTime: "2-4 weeks",
    reason: `Required skill for the target role`,
  }));

  return {
    requiredSkills,
    presentSkills,
    missingSkills,
    partialSkills,
    recommendedLearning,
    canProceedWithResume,
    matchPercentage,
  };
}

/**
 * Generate resume section content using AI
 */
export async function generateResumeSection(
  section: string,
  prompt: string,
  context: unknown
): Promise<string> {
  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    throw new Error(
      `Rate limit exceeded. Please try again in ${Math.ceil((rateCheck.retryAfter || 60000) / 1000)} seconds.`
    );
  }

  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const fullPrompt = `${prompt}

Generate professional, concise content for the ${section} section. Focus on impact and achievements. Return only the content, no additional formatting or explanations.`;

  try {
    incrementRequestCount();
    const result = await model.generateContent(fullPrompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate content. Please try again later.");
  }
}

/**
 * Improve existing content with AI optimization
 */
export async function improveContent(
  content: string,
  contentType: string,
  targetKeywords: string[]
): Promise<string> {
  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    throw new Error(
      `Rate limit exceeded. Please try again in ${Math.ceil((rateCheck.retryAfter || 60000) / 1000)} seconds.`
    );
  }

  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `Improve the following ${contentType} content for a resume. Make it more impactful, use action verbs, and include quantifiable achievements where possible.${targetKeywords.length > 0 ? ` Incorporate these keywords naturally: ${targetKeywords.join(", ")}` : ""}

Original content:
"""
${content}
"""

Return only the improved content, no explanations or additional text.`;

  try {
    incrementRequestCount();
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Gemini API error:", error);
    return content;
  }
}
