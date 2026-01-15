import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Separate Gemini client for Learning Module
 * Uses GEMINI_API_KEY_LEARNING to avoid rate limit conflicts with main app
 */

// Initialize Gemini AI for Learning Module
function getLearningGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY_LEARNING;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_LEARNING is not configured. Please add it to your .env.local file.");
  }
  return new GoogleGenerativeAI(apiKey);
}

// Rate limiting specific to learning module
const learningRequestTracker = {
  minuteCount: 0,
  dayCount: 0,
  lastMinuteReset: Date.now(),
  lastDayReset: Date.now(),
};

const LEARNING_RATE_LIMITS = {
  perMinute: 12, // Keep buffer below 15 RPM
  perDay: 1400,  // Keep buffer below 1500 RPD
};

function checkLearningRateLimit(): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();

  // Reset minute counter if a minute has passed
  if (now - learningRequestTracker.lastMinuteReset >= 60000) {
    learningRequestTracker.minuteCount = 0;
    learningRequestTracker.lastMinuteReset = now;
  }

  // Reset day counter if a day has passed
  if (now - learningRequestTracker.lastDayReset >= 86400000) {
    learningRequestTracker.dayCount = 0;
    learningRequestTracker.lastDayReset = now;
  }

  // Check limits
  if (learningRequestTracker.minuteCount >= LEARNING_RATE_LIMITS.perMinute) {
    const retryAfter = 60000 - (now - learningRequestTracker.lastMinuteReset);
    return { allowed: false, retryAfter };
  }

  if (learningRequestTracker.dayCount >= LEARNING_RATE_LIMITS.perDay) {
    return { allowed: false, retryAfter: 86400000 };
  }

  return { allowed: true };
}

function incrementLearningRequestCount() {
  learningRequestTracker.minuteCount++;
  learningRequestTracker.dayCount++;
}

/**
 * Generate content using the Learning Gemini API
 * Includes rate limiting and error handling
 */
export async function generateLearningContent(prompt: string): Promise<string> {
  // Check rate limit
  const rateCheck = checkLearningRateLimit();
  if (!rateCheck.allowed) {
    throw new Error(
      `Learning API rate limit exceeded. Please try again in ${Math.ceil((rateCheck.retryAfter || 60000) / 1000)} seconds.`
    );
  }

  try {
    const genAI = getLearningGeminiClient();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.3,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    });

    incrementLearningRequestCount();
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("[Learning Gemini] Generation error:", error);
    throw error;
  }
}

/**
 * Generate JSON content with parsing
 */
export async function generateLearningJSON<T>(prompt: string): Promise<T> {
  const text = await generateLearningContent(prompt);
  
  console.log("[Learning Gemini] Raw AI response:", text);
  
  // Extract JSON from the response (handle markdown code blocks)
  let jsonStr = text.trim();
  
  // Remove markdown code blocks if present
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
    console.log("[Learning Gemini] Extracted from markdown code blocks:", jsonStr);
  }
  
  // Try to find JSON object if wrapped in extra text
  if (!jsonStr.startsWith('{')) {
    const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
      jsonStr = jsonObjectMatch[0];
      console.log("[Learning Gemini] Extracted JSON object from text:", jsonStr);
    }
  }
  
  try {
    const parsed = JSON.parse(jsonStr) as T;
    console.log("[Learning Gemini] Successfully parsed JSON:", parsed);
    return parsed;
  } catch (error) {
    console.error("[Learning Gemini] JSON parse error:", error);
    console.error("[Learning Gemini] Raw response (first 500 chars):", text.substring(0, 500));
    console.error("[Learning Gemini] Extracted JSON string (first 500 chars):", jsonStr.substring(0, 500));
    throw new Error("Failed to parse AI response as JSON. The AI may have returned invalid JSON format.");
  }
}

// ==================== PROMPT TEMPLATES ====================

/**
 * Generate a subject roadmap and chapter outline
 */
export function createRoadmapPrompt(subjectName: string, difficulty: string): string {
  return `You are an expert educator creating a comprehensive learning roadmap for "${subjectName}" at ${difficulty} level.

Generate a structured learning path with chapters. Return ONLY valid JSON in this exact format:

{
  "roadmap": {
    "overview": "A 2-3 paragraph overview of what the student will learn and why it's important",
    "learningPath": ["Step 1 description", "Step 2 description", ...],
    "tips": ["Tip 1 for success", "Tip 2", ...],
    "estimatedTotalHours": 40
  },
  "chapters": [
    {
      "chapterNumber": 1,
      "title": "Chapter title",
      "description": "2-3 sentence description of what this chapter covers",
      "estimatedMinutes": 60,
      "keyTopics": ["Topic 1", "Topic 2", ...]
    },
    ...
  ]
}

Requirements:
- Create 6-10 chapters that cover the subject comprehensively
- Each chapter should build on the previous one
- Include practical, hands-on content
- Make it suitable for ${difficulty} learners
- Be specific and actionable
- Ensure JSON is valid (no trailing commas, proper escaping)`;
}

/**
 * Generate chapter overview and concepts
 */
export function createChapterOverviewPrompt(
  subjectName: string,
  chapterTitle: string,
  chapterDescription: string
): string {
  return `You are an expert educator creating detailed content for a chapter in a "${subjectName}" course.

Chapter: "${chapterTitle}"
Description: ${chapterDescription}

Generate comprehensive chapter content. Return ONLY valid JSON in this exact format:

{
  "overview": "A detailed 3-4 paragraph overview of this chapter. Explain what will be covered, why it's important, and how it connects to the broader subject. Use clear, engaging language suitable for learners.",
  "concepts": [
    "Concept 1: Brief explanation",
    "Concept 2: Brief explanation",
    ...
  ],
  "prerequisites": ["What students should know before this chapter"],
  "learningObjectives": ["By the end, students will be able to..."]
}

Requirements:
- The overview should be detailed and educational (300-500 words)
- List 5-10 key concepts with brief explanations
- Include 2-4 prerequisites
- Include 3-5 clear learning objectives
- Use markdown formatting in the overview for readability
- Ensure JSON is valid`;
}

/**
 * Generate AI study notes for a chapter
 */
export function createStudyNotesPrompt(
  subjectName: string,
  chapterTitle: string,
  concepts: string[]
): string {
  return `You are an expert educator creating comprehensive study notes for a chapter in a "${subjectName}" course.

Chapter: "${chapterTitle}"
Key Concepts to Cover: ${concepts.join(", ")}

Generate detailed study notes. Return ONLY valid JSON in this exact format (no markdown code blocks):

{
  "notes": "Comprehensive markdown-formatted study notes here"
}

The "notes" field should contain markdown-formatted content with:
- ## Introduction section
- ## Key Concepts section (explain each concept: ${concepts.join(", ")})
- ## Examples section (practical examples)
- ## Key Takeaways section (5-8 bullet points)
- ## Practice Questions section (3-5 questions for self-assessment)
- ## Summary section

Requirements:
- Notes should be 800-1500 words total
- Use proper markdown formatting (headers, bullet points, code blocks if relevant)
- Include practical examples where applicable
- Make it easy to review and study from
- Return ONLY the JSON object, no extra text or markdown code blocks`;
}

/**
 * Determine difficulty level from skill context
 */
export function inferDifficulty(skillName: string, learningType?: string): "beginner" | "intermediate" | "advanced" {
  const advancedKeywords = ["advanced", "senior", "expert", "architecture", "system design", "optimization"];
  const intermediateKeywords = ["intermediate", "professional", "production", "best practices"];
  
  const lowerName = skillName.toLowerCase();
  
  if (advancedKeywords.some(k => lowerName.includes(k))) {
    return "advanced";
  }
  if (intermediateKeywords.some(k => lowerName.includes(k))) {
    return "intermediate";
  }
  
  // Default based on learning type
  if (learningType === "practice") {
    return "intermediate";
  }
  
  return "beginner";
}

/**
 * Estimate hours based on subject and difficulty
 */
export function estimateHours(difficulty: "beginner" | "intermediate" | "advanced"): number {
  switch (difficulty) {
    case "beginner":
      return 30;
    case "intermediate":
      return 50;
    case "advanced":
      return 80;
    default:
      return 40;
  }
}
