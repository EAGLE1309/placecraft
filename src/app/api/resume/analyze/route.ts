import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF, extractAndAnalyzeResume, getQuotaInfo, cleanUndefinedValues } from "@/lib/ai/resume-ai";
import { 
  getLatestResumeAnalysis, 
  getResumeAnalysisById,
  createResumeAnalysis,
  createLearningSuggestion,
  getStudentById,
} from "@/lib/firebase/firestore";

/**
 * Resume Analysis API - New Architecture
 * 
 * GET: Retrieve stored analysis for a student
 * POST: Re-analyze a resume (for when user wants fresh analysis)
 * 
 * Analysis is now persisted as a first-class record in the database.
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const analysisId = searchParams.get("analysisId");

    if (!studentId && !analysisId) {
      return NextResponse.json(
        { error: "Student ID or Analysis ID required" },
        { status: 400 }
      );
    }

    let analysis;

    if (analysisId) {
      // Get specific analysis by ID
      analysis = await getResumeAnalysisById(analysisId);
    } else if (studentId) {
      // Get latest analysis for student
      analysis = await getLatestResumeAnalysis(studentId);
    }

    if (!analysis) {
      return NextResponse.json(
        { 
          error: "No analysis found",
          hasAnalysis: false,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      hasAnalysis: true,
      analysis: {
        id: analysis.id,
        overallScore: analysis.overallScore,
        atsScore: analysis.atsScore,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        suggestions: analysis.suggestions,
        learningSuggestions: analysis.learningSuggestions,
        extractedData: analysis.extractedData,
        analyzedAt: analysis.analyzedAt,
        resumeFileId: analysis.resumeFileId,
        resumeUrl: analysis.resumeUrl,
      },
      quota: getQuotaInfo(),
    });
  } catch (error) {
    console.error("[Resume Analysis GET] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retrieve analysis" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { downloadUrl, studentId, targetRole, forceReanalyze } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID required" },
        { status: 400 }
      );
    }

    // If not forcing re-analysis, check if we have a recent analysis
    if (!forceReanalyze) {
      const existingAnalysis = await getLatestResumeAnalysis(studentId);
      if (existingAnalysis) {
        // Return existing analysis
        return NextResponse.json({
          success: true,
          cached: true,
          analysisId: existingAnalysis.id,
          analysis: {
            overallScore: existingAnalysis.overallScore,
            atsScore: existingAnalysis.atsScore,
            strengths: existingAnalysis.strengths,
            weaknesses: existingAnalysis.weaknesses,
            suggestions: existingAnalysis.suggestions,
            learningSuggestions: existingAnalysis.learningSuggestions,
            extractedData: existingAnalysis.extractedData,
          },
          quota: getQuotaInfo(),
        });
      }
    }

    // Need to perform analysis - get download URL
    let resumeUrl = downloadUrl;
    if (!resumeUrl) {
      const student = await getStudentById(studentId);
      if (!student?.resumeUrl) {
        return NextResponse.json(
          { error: "No resume found. Please upload a resume first." },
          { status: 404 }
        );
      }
      resumeUrl = student.resumeUrl;
    }

    // Validate URL format
    try {
      new URL(resumeUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid resume URL format. Please re-upload your resume." },
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

    console.log(`[Resume Analysis] Starting re-analysis for student ${studentId}`);

    // Fetch file content from R2 download URL with retry logic
    let response: Response | undefined;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Resume Analysis] Fetch attempt ${attempt}/${maxRetries} for ${resumeUrl.substring(0, 100)}...`);
        
        response = await fetch(resumeUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'User-Agent': 'Placecraft-Resume-Analyzer/1.0',
          },
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        console.log(`[Resume Analysis] Fetch successful on attempt ${attempt}`);
        break; // Success, exit retry loop
        
      } catch (fetchError) {
        console.error(`[Resume Analysis] Fetch attempt ${attempt} failed:`, fetchError instanceof Error ? fetchError.message : fetchError);
        
        if (attempt === maxRetries) {
          console.error("[Resume Analysis] All fetch attempts exhausted");
          return NextResponse.json(
            { 
              error: "Failed to download resume from storage after multiple attempts. The file may have been deleted, moved, or the link expired. Please re-upload your resume.",
              details: fetchError instanceof Error ? fetchError.message : "Unknown network error",
              url: resumeUrl.substring(0, 100) + "..."
            },
            { status: 404 }
          );
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
        console.log(`[Resume Analysis] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // At this point, response is guaranteed to be defined (otherwise we would have returned above)
    if (!response) {
      return NextResponse.json(
        { error: "Failed to fetch resume: Unexpected error" },
        { status: 500 }
      );
    }

    const fileBuffer = await response.arrayBuffer();
    
    if (fileBuffer.byteLength === 0) {
      return NextResponse.json(
        { error: "Downloaded file is empty. Please re-upload your resume." },
        { status: 400 }
      );
    }

    // Extract text from PDF
    let resumeText: string;
    try {
      resumeText = await extractTextFromPDF(Buffer.from(fileBuffer));
    } catch (extractError) {
      console.error("[Resume Analysis] PDF extraction failed:", extractError);
      const errorMessage = extractError instanceof Error 
        ? extractError.message 
        : "Failed to extract text from PDF";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    
    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json(
        { error: "Could not extract sufficient text from resume." },
        { status: 400 }
      );
    }

    // Perform unified extraction + analysis
    let analysisResult;
    try {
      analysisResult = await extractAndAnalyzeResume(resumeText, targetRole);
    } catch (analysisError) {
      console.error("[Resume Analysis] Analysis failed:", analysisError);
      const errorMessage = analysisError instanceof Error 
        ? analysisError.message 
        : "Failed to analyze resume";
      
      if (errorMessage.includes("Rate limit")) {
        return NextResponse.json(
          { error: errorMessage, retryAfter: 60, quota: getQuotaInfo() },
          { status: 429 }
        );
      }
      
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    // Get student to get file info
    const student = await getStudentById(studentId);

    // Store the new analysis
    const cleanedExtractedData = cleanUndefinedValues(analysisResult.extractedData);
    const analysisData = {
      resumeFileId: student?.resumeFileId || "",
      resumePath: student?.resumePath || "",
      resumeUrl: resumeUrl,
      extractedData: cleanedExtractedData,
      overallScore: analysisResult.overallScore,
      atsScore: analysisResult.atsScore,
      strengths: analysisResult.strengths,
      weaknesses: analysisResult.weaknesses,
      suggestions: analysisResult.suggestions,
      learningSuggestions: analysisResult.learningSuggestions,
      targetRole: targetRole || null,
    };
    
    // Clean all undefined values from the entire analysis object
    const cleanedAnalysisData = cleanUndefinedValues(analysisData);
    const storedAnalysis = await createResumeAnalysis(studentId, cleanedAnalysisData);

    // Save learning suggestions
    for (const suggestion of analysisResult.learningSuggestions.slice(0, 5)) {
      try {
        await createLearningSuggestion(studentId, {
          skill: suggestion.skill,
          priority: suggestion.priority,
          learningType: suggestion.learningType,
          estimatedTime: suggestion.estimatedTime,
          reason: suggestion.reason,
        });
      } catch (err) {
        console.error("[Resume Analysis] Failed to save learning suggestion:", err);
      }
    }

    console.log(`[Resume Analysis] Re-analysis completed. ID: ${storedAnalysis.id}`);

    return NextResponse.json({
      success: true,
      cached: false,
      analysisId: storedAnalysis.id,
      analysis: {
        overallScore: analysisResult.overallScore,
        atsScore: analysisResult.atsScore,
        strengths: analysisResult.strengths,
        weaknesses: analysisResult.weaknesses,
        suggestions: analysisResult.suggestions,
        learningSuggestions: analysisResult.learningSuggestions,
        extractedData: analysisResult.extractedData,
      },
      quota: getQuotaInfo(),
    });
  } catch (error) {
    console.error("[Resume Analysis POST] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze resume" },
      { status: 500 }
    );
  }
}
