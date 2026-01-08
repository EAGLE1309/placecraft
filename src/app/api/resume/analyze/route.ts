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

    console.log(`[Resume Analysis] Starting analysis for student ${studentId}`);

    // Fetch file content from R2 download URL
    let response;
    try {
      response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch resume from storage: ${response.status} ${response.statusText}`);
      }
    } catch (fetchError) {
      console.error("[Resume Analysis] Failed to fetch file:", fetchError);
      return NextResponse.json(
        { error: "Failed to download resume from storage. The file may have been deleted or the link expired." },
        { status: 404 }
      );
    }

    const fileBuffer = await response.arrayBuffer();
    
    if (fileBuffer.byteLength === 0) {
      return NextResponse.json(
        { error: "Downloaded file is empty. Please re-upload your resume." },
        { status: 400 }
      );
    }

    console.log(`[Resume Analysis] Downloaded ${(fileBuffer.byteLength / 1024).toFixed(2)}KB file`);
    
    // Extract text from PDF using Gemini Vision
    let resumeText: string;
    try {
      resumeText = await extractTextFromPDF(Buffer.from(fileBuffer));
    } catch (extractError) {
      console.error("[Resume Analysis] PDF extraction failed:", extractError);
      
      // Return specific error from extraction
      const errorMessage = extractError instanceof Error 
        ? extractError.message 
        : "Failed to extract text from PDF";
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }
    
    // Validate extracted text
    if (!resumeText || resumeText.trim().length < 50) {
      console.error(`[Resume Analysis] Insufficient text extracted: ${resumeText?.length || 0} characters`);
      return NextResponse.json(
        { error: "Could not extract sufficient text from resume. The PDF may be image-based, encrypted, or corrupted. Please ensure your resume contains selectable text." },
        { status: 400 }
      );
    }

    console.log(`[Resume Analysis] Successfully extracted ${resumeText.length} characters of text`);

    // Analyze resume with Gemini (single comprehensive call)
    let analysis;
    try {
      analysis = await analyzeResume(resumeText, targetRole);
    } catch (analysisError) {
      console.error("[Resume Analysis] Analysis failed:", analysisError);
      
      const errorMessage = analysisError instanceof Error 
        ? analysisError.message 
        : "Failed to analyze resume";
      
      // Check if it's a rate limit error
      if (errorMessage.includes("Rate limit") || errorMessage.includes("quota")) {
        return NextResponse.json(
          { 
            error: errorMessage,
            retryAfter: 60,
            quota: getQuotaInfo()
          },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    // Update student profile with analysis results
    // Store extracted data separately - do NOT overwrite user-curated skills
    try {
      await updateStudent(studentId, {
        resumeScore: analysis.overallScore,
        atsScore: analysis.atsScore,
        // Store extracted data in separate fields to preserve user-curated data
        resumeExtractedSkills: analysis.skills,
        resumeExtractedEducation: analysis.education,
        resumeExtractedExperience: analysis.experience,
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
      
      console.log(`[Resume Analysis] Successfully completed analysis for student ${studentId}`);
    } catch (dbError) {
      console.error("[Resume Analysis] Failed to save results to database:", dbError);
      // Don't fail the entire request if DB save fails - return the analysis anyway
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
    console.error("[Resume Analysis] Unexpected error:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Provide user-friendly error message
    const errorMessage = error instanceof Error 
      ? error.message 
      : "An unexpected error occurred while analyzing your resume";
    
    return NextResponse.json(
      { error: errorMessage },
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
