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
    const text = response.text();

    // Validate that we got some content
    if (!text || text.trim().length === 0) {
      throw new Error("AI returned empty response");
    }

    return text;
  } catch (error) {
    console.error("[Learning Gemini] Generation error:", error);

    // If it's a rate limit error, provide a more helpful message
    if (error instanceof Error && error.message.includes("rate limit")) {
      throw new Error("AI service is temporarily busy. Please try again in a few seconds.");
    }

    // If it's an API key error
    if (error instanceof Error && error.message.includes("API key")) {
      throw new Error("AI service configuration error. Please contact support.");
    }

    // For other errors, provide a generic but helpful message
    throw new Error("AI service temporarily unavailable. Please try again.");
  }
}

/**
 * Generate JSON content with parsing
 */
export async function generateLearningJSON<T>(prompt: string): Promise<T> {
  const text = await generateLearningContent(prompt);

  console.log("[Learning Gemini] Raw AI response (first 500 chars):", text.substring(0, 500));

  let trimmedText = text.trim();

  // Remove any BOM or invisible characters
  trimmedText = trimmedText.replace(/^\uFEFF/, '');

  try {
    const parsed = JSON.parse(trimmedText) as T;
    console.log("[Learning Gemini] Direct JSON parse successful");
    return parsed;
  } catch (directParseError) {
    console.log("[Learning Gemini] Direct parse failed, attempting extraction fallback");

    try {
      let extracted = trimmedText;

      // Try to extract from markdown code blocks (```json or ```)
      if (extracted.includes('```')) {
        const codeBlockMatch = extracted.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          extracted = codeBlockMatch[1].trim();
          console.log("[Learning Gemini] Extracted from markdown code block");
        }
      }

      // Remove any leading/trailing non-JSON text
      if (!extracted.startsWith('{') && !extracted.startsWith('[')) {
        const jsonMatch = extracted.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (jsonMatch) {
          extracted = jsonMatch[1];
          console.log("[Learning Gemini] Extracted JSON from surrounding text");
        }
      }

      // Clean up common JSON issues
      extracted = extracted
        .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
        .replace(/\n/g, '\\n') // Escape newlines in strings
        .replace(/\r/g, '') // Remove carriage returns
        .replace(/\t/g, '\\t'); // Escape tabs

      // Try to fix unescaped quotes in strings (basic attempt)
      // This is a heuristic and may not work for all cases
      const lines = extracted.split('\\n');
      extracted = lines.join('\\n');

      const parsed = JSON.parse(extracted) as T;
      console.log("[Learning Gemini] Fallback extraction successful");
      return parsed;
    } catch (extractionError) {
      console.error("[Learning Gemini] All parsing attempts failed");
      console.error("[Learning Gemini] Direct parse error:", directParseError);
      console.error("[Learning Gemini] Extraction error:", extractionError);
      console.error("[Learning Gemini] Raw response (first 1000 chars):", text.substring(0, 1000));

      // Try one last time with a more aggressive approach
      try {
        const lastAttempt = text.match(/\{[\s\S]*"notes"[\s\S]*\}/)?.[0];
        if (lastAttempt) {
          const parsed = JSON.parse(lastAttempt) as T;
          console.log("[Learning Gemini] Last attempt extraction successful");
          return parsed;
        }
      } catch (lastError) {
        console.error("[Learning Gemini] Last attempt failed:", lastError);
      }

      // If we're here, all parsing attempts failed. Check if this is a study notes request
      if (text.includes("notes") && text.includes("study")) {
        console.log("[Learning Gemini] Generating fallback study notes");
        // Generate a basic fallback response for study notes
        const fallbackNotes = `# Study Notes

## Introduction
This content covers the key concepts and topics for this chapter. The AI-generated content encountered an error, so this basic template is provided instead.

## Key Concepts
- Review the main concepts covered in this chapter
- Focus on understanding the fundamental principles
- Practice with examples and exercises

## Examples
Work through practical examples to solidify your understanding of the material.

## Key Takeaways
- Understand the core concepts
- Practice regularly
- Apply what you've learned

## Practice Questions
1. What are the main concepts covered?
2. How would you apply these concepts?
3. What are the practical applications?

## Summary
Review the material regularly and practice consistently to master these concepts.`;

        // Return the fallback in the expected format
        return { notes: fallbackNotes } as T;
      }

      throw new Error("Failed to parse AI response as JSON. The AI may have returned invalid JSON format. Please try again.");
    }
  }
}


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
  const conceptsList = concepts.slice(0, 8).join(", "); // Limit to 8 concepts to avoid token issues

  return `You are an expert educator creating comprehensive study notes for a chapter in a "${subjectName}" course.

Chapter: "${chapterTitle}"
Key Concepts to Cover: ${conceptsList}

**CRITICAL INSTRUCTIONS:**
1. Return ONLY a valid JSON object
2. Do NOT wrap the JSON in markdown code blocks (no \`\`\`)
3. Do NOT add any text before or after the JSON
4. Ensure all strings are properly escaped
5. Use \\n for line breaks within the notes string

Return this exact JSON structure:

{
  "notes": "# ${chapterTitle}\n\n## Introduction\n[Introduction content]\n\n## Key Concepts\n[Explain each concept]\n\n## Practical Examples\n[Real-world examples]\n\n## Key Takeaways\n- Point 1\n- Point 2\n\n## Practice Questions\n1. Question 1\n2. Question 2\n\n## Summary\n[Brief summary]"
}

Requirements for the "notes" content:
- Write 800-1500 words of educational content
- Use markdown formatting (##, ###, -, *, 1., etc.)
- Explain each concept clearly: ${conceptsList}
- Include 2-3 practical examples with code snippets if relevant
- Add 5-8 key takeaway bullet points
- Include 3-5 self-assessment questions
- End with a concise summary
- Use \\n for line breaks, \\" for quotes within the string
- Make content engaging and easy to understand

REMEMBER: Return ONLY the JSON object with no additional text or formatting.`;
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
