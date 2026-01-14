import { NextRequest, NextResponse } from "next/server";
import { uploadResume } from "@/lib/r2/storage";
import { updateStudent, createResumeAnalysis, createLearningSuggestion, createResumeHistory } from "@/lib/firebase/firestore";
import { extractTextFromPDF, extractAndAnalyzeResume, getQuotaInfo } from "@/lib/ai/resume-ai";

/**
 * Resume Upload API - New Architecture
 * 
 * This endpoint handles the complete upload + extraction + analysis flow:
 * 1. Upload original file to R2 storage
 * 2. Extract text from PDF
 * 3. Make ONE Gemini call to extract structured data AND analyze
 * 4. Store both extracted data and analysis in database
 * 5. Return analysis results to client
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const studentId = formData.get("studentId") as string;
    const targetRole = formData.get("targetRole") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!studentId) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 });
    }

    // Validate file type
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload PDF or Word document." },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    console.log(`[Resume Upload] Starting upload for student ${studentId}`);

    // Step 1: Upload to Cloudflare R2
    const uploadResult = await uploadResume(file, studentId);
    console.log(`[Resume Upload] File uploaded to R2: ${uploadResult.fileId}`);

    // Update student record with file info
    await updateStudent(studentId, {
      resumeFileId: uploadResult.fileId,
      resumeUrl: uploadResult.downloadUrl,
      resumePath: uploadResult.fullPath,
    });

    // Step 2: Extract text from PDF
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    let resumeText: string;

    try {
      resumeText = await extractTextFromPDF(fileBuffer);
    } catch (extractError) {
      console.error("[Resume Upload] PDF extraction failed:", extractError);
      // File is uploaded but extraction failed - return partial success
      return NextResponse.json({
        success: true,
        fileId: uploadResult.fileId,
        downloadUrl: uploadResult.downloadUrl,
        analysisStatus: "failed",
        error: extractError instanceof Error ? extractError.message : "Failed to extract text from PDF",
        message: "Resume uploaded but analysis failed. You can try re-analyzing later.",
      });
    }

    // Validate extracted text
    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json({
        success: true,
        fileId: uploadResult.fileId,
        downloadUrl: uploadResult.downloadUrl,
        analysisStatus: "failed",
        error: "Could not extract sufficient text from resume. The PDF may be image-based or corrupted.",
        message: "Resume uploaded but analysis failed due to insufficient text.",
      });
    }

    console.log(`[Resume Upload] Extracted ${resumeText.length} characters from PDF`);

    // Step 3: Extract structured data AND analyze in ONE Gemini call
    let analysisResult;
    try {
      analysisResult = await extractAndAnalyzeResume(resumeText, targetRole || undefined);
    } catch (analysisError) {
      console.error("[Resume Upload] Analysis failed:", analysisError);
      const errorMessage = analysisError instanceof Error ? analysisError.message : "Failed to analyze resume";

      // Check if it's a rate limit error
      if (errorMessage.includes("Rate limit")) {
        return NextResponse.json(
          {
            success: true,
            fileId: uploadResult.fileId,
            downloadUrl: uploadResult.downloadUrl,
            analysisStatus: "rate_limited",
            error: errorMessage,
            retryAfter: 60,
            quota: getQuotaInfo(),
            message: "Resume uploaded but analysis rate limited. Try again shortly.",
          },
          { status: 429 }
        );
      }

      return NextResponse.json({
        success: true,
        fileId: uploadResult.fileId,
        downloadUrl: uploadResult.downloadUrl,
        analysisStatus: "failed",
        error: errorMessage,
        message: "Resume uploaded but analysis failed.",
      });
    }

    console.log(`[Resume Upload] Analysis complete. Score: ${analysisResult.overallScore}`);

    // Step 4: Store both extracted data AND analysis in database
    const storedAnalysis = await createResumeAnalysis(studentId, {
      resumeFileId: uploadResult.fileId,
      resumePath: uploadResult.fullPath,
      resumeUrl: uploadResult.downloadUrl,
      extractedData: analysisResult.extractedData,
      overallScore: analysisResult.overallScore,
      atsScore: analysisResult.atsScore,
      strengths: analysisResult.strengths,
      weaknesses: analysisResult.weaknesses,
      suggestions: analysisResult.suggestions,
      learningSuggestions: analysisResult.learningSuggestions,
      targetRole: targetRole || undefined,
    });

    console.log(`[Resume Upload] Analysis stored with ID: ${storedAnalysis.id}`);

    // Step 4.5: Store extracted data in student profile for easy access in profile UI
    // This allows students to see and modify resume-extracted data alongside manual entries
    await updateStudent(studentId, {
      resumeExtractedSkills: analysisResult.extractedData.skills || [],
      resumeExtractedEducation: analysisResult.extractedData.education.map((edu, i) => ({
        id: `resume-edu-${Date.now()}-${i}`,
        institution: edu.institution,
        degree: edu.degree,
        field: edu.field || "",
        startYear: parseInt(edu.startYear || "0") || new Date().getFullYear(),
        endYear: edu.endYear ? parseInt(edu.endYear) : undefined,
        grade: edu.grade,
        current: edu.current || false,
      })),
      resumeExtractedExperience: analysisResult.extractedData.experience.map((exp, i) => ({
        id: `resume-exp-${Date.now()}-${i}`,
        company: exp.company,
        role: exp.role,
        description: exp.description || "",
        startDate: exp.startDate || "",
        endDate: exp.endDate,
        current: exp.current || false,
        skills: [],
      })),
      resumeScore: analysisResult.overallScore,
      atsScore: analysisResult.atsScore,
    });

    console.log(`[Resume Upload] Extracted data stored in student profile`);

    // Create resume history entry for the uploaded resume
    await createResumeHistory(studentId, {
      resumeFileId: uploadResult.fileId,
      resumeUrl: uploadResult.downloadUrl,
      resumePath: uploadResult.fullPath,
      resumeScore: analysisResult.overallScore,
      atsScore: analysisResult.atsScore,
      generatedFrom: "upload",
    });

    console.log(`[Resume Upload] Resume history entry created`);

    // Save learning suggestions to separate collection for learning system
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
        console.error("[Resume Upload] Failed to save learning suggestion:", err);
      }
    }

    // Step 5: Return complete response
    return NextResponse.json({
      success: true,
      fileId: uploadResult.fileId,
      downloadUrl: uploadResult.downloadUrl,
      analysisId: storedAnalysis.id,
      analysisStatus: "completed",
      analysis: {
        overallScore: analysisResult.overallScore,
        atsScore: analysisResult.atsScore,
        strengths: analysisResult.strengths,
        weaknesses: analysisResult.weaknesses,
        suggestions: analysisResult.suggestions,
        learningSuggestions: analysisResult.learningSuggestions,
        extractedSkillsCount: analysisResult.extractedData.skills.length,
        extractedEducationCount: analysisResult.extractedData.education.length,
        extractedExperienceCount: analysisResult.extractedData.experience.length,
        extractedProjectsCount: analysisResult.extractedData.projects.length,
      },
      quota: getQuotaInfo(),
      message: "Resume uploaded and analyzed successfully.",
    });
  } catch (error) {
    console.error("[Resume Upload] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload resume" },
      { status: 500 }
    );
  }
}
