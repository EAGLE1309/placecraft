import { NextRequest, NextResponse } from "next/server";
import { analyzeResume, extractTextFromPDF, getQuotaInfo } from "@/lib/google/gemini";
import { updateStudent, createLearningSuggestion } from "@/lib/firebase/firestore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { downloadUrl, studentId, targetRole } = body;

    if (!downloadUrl || !studentId) {
      return NextResponse.json(
        { error: "Download URL and Student ID required" },
        { status: 400 }
      );
    }

    // Check quota before proceeding
    const quota = getQuotaInfo();
    if (quota.minuteRemaining <= 0) {
      return NextResponse.json(
        { 
          error: "Rate limit reached. Please wait before analyzing.",
          retryAfter: quota.resetInSeconds,
          quota 
        },
        { status: 429 }
      );
    }

    // Fetch file content from download URL
    const response = await fetch(downloadUrl);
    const fileBuffer = await response.arrayBuffer();
    
    // Extract text from PDF using Gemini Vision
    const resumeText = await extractTextFromPDF(Buffer.from(fileBuffer));
    
    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json(
        { error: "Could not extract text from resume. Please ensure the PDF is readable." },
        { status: 400 }
      );
    }

    // Analyze resume with Gemini (single comprehensive call)
    const analysis = await analyzeResume(resumeText, targetRole);

    // Update student profile with analysis results
    await updateStudent(studentId, {
      resumeScore: analysis.overallScore,
      atsScore: analysis.atsScore,
      skills: analysis.skills,
    });

    // Save learning suggestions to Firestore
    for (const suggestion of analysis.learningSuggestions.slice(0, 5)) {
      await createLearningSuggestion(studentId, {
        skill: suggestion.skill,
        priority: suggestion.priority,
        learningType: suggestion.learningType,
        estimatedTime: suggestion.estimatedTime,
        reason: suggestion.reason,
      });
    }

    return NextResponse.json({
      success: true,
      analysis: {
        overallScore: analysis.overallScore,
        atsScore: analysis.atsScore,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        skills: analysis.skills,
        suggestions: analysis.suggestions,
        experience: analysis.experience,
        education: analysis.education,
        learningSuggestions: analysis.learningSuggestions,
      },
      quota: getQuotaInfo(),
    });
  } catch (error) {
    console.error("Resume analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze resume" },
      { status: 500 }
    );
  }
}

// Get current quota status
export async function GET() {
  return NextResponse.json({
    quota: getQuotaInfo(),
  });
}
