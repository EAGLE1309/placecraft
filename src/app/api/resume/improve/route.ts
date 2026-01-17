import { NextRequest, NextResponse } from "next/server";
import {
  getLatestResumeAnalysis,
  getResumeAnalysisById,
  createImprovedResume,
  createResumeHistory,
  getStudentById,
} from "@/lib/firebase/firestore";
import { improveResume, getQuotaInfo, cleanUndefinedValues } from "@/lib/ai/resume-ai";
import { uploadToR2 } from "@/lib/r2/upload";
import { generatePDFFromHTML } from "@/lib/pdf/generate-pdf";
import { ExtractedResumeData, ImprovedResumeData } from "@/types/resume";
import { verifyAuth, requireAuth } from "@/lib/firebase/auth-api";

/**
 * Resume Improvement API - New Architecture
 * 
 * POST: Generate an improved resume based on stored analysis
 * 
 * Flow:
 * 1. Fetch stored extracted resume data and suggestions
 * 2. Make ONE Gemini call to improve the content based on suggestions
 * 3. Generate PDF from improved structured data
 * 4. Store improved version in history
 * 5. Return improved resume with download URL
 */

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    const authError = requireAuth(authResult);
    if (authError) return authError;

    const body = await request.json();
    const { studentId, analysisId, targetRole, focusAreas } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID required" },
        { status: 400 }
      );
    }

    // Step 1: Get the stored analysis (with extracted data and suggestions)
    let analysis;
    if (analysisId) {
      analysis = await getResumeAnalysisById(analysisId);
    } else {
      analysis = await getLatestResumeAnalysis(studentId);
    }

    if (!analysis) {
      return NextResponse.json(
        { error: "No resume analysis found. Please upload and analyze a resume first." },
        { status: 404 }
      );
    }

    // Check quota before proceeding
    const quota = getQuotaInfo();
    if (quota.minuteRemaining <= 0) {
      return NextResponse.json(
        {
          error: "Rate limit reached. Please wait before improving.",
          retryAfter: quota.resetInSeconds,
          quota
        },
        { status: 429 }
      );
    }

    console.log(`[Resume Improve] Starting improvement for student ${studentId}, analysis ${analysis.id}`);

    // Step 2: Call Gemini to improve the resume based on stored suggestions
    let improvedData: ImprovedResumeData;
    try {
      improvedData = await improveResume(
        analysis.extractedData,
        analysis.suggestions,
        targetRole || analysis.targetRole
      );
    } catch (improveError) {
      console.error("[Resume Improve] Improvement failed:", improveError);
      const errorMessage = improveError instanceof Error
        ? improveError.message
        : "Failed to improve resume";

      if (errorMessage.includes("Rate limit")) {
        return NextResponse.json(
          { error: errorMessage, retryAfter: 60, quota: getQuotaInfo() },
          { status: 429 }
        );
      }

      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    console.log(`[Resume Improve] AI improvement complete. ${improvedData.improvementSummary.length} improvements made.`);

    // Step 3: Generate PDF from improved structured data
    const htmlContent = generateResumeHTML(improvedData);
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generatePDFFromHTML(htmlContent);
    } catch (pdfError) {
      console.error("[Resume Improve] PDF generation failed:", pdfError);
      const errorMessage = pdfError instanceof Error ? pdfError.message : "Unknown PDF generation error";
      return NextResponse.json(
        {
          error: `PDF generation failed: ${errorMessage}. Please ensure you have a stable connection and try again.`,
          details: "The AI successfully improved your resume content, but we couldn't generate the PDF file."
        },
        { status: 500 }
      );
    }

    // Step 4: Upload PDF to storage
    const student = await getStudentById(studentId);
    const fileName = `resumes/${studentId}/${Date.now()}_improved_${improvedData.personalInfo.name?.replace(/\s+/g, "_") || "resume"}.pdf`;

    let uploadResult;
    try {
      uploadResult = await uploadToR2(pdfBuffer, fileName, "application/pdf");
    } catch (uploadError) {
      console.error("[Resume Improve] Upload failed:", uploadError);
      const errorMessage = uploadError instanceof Error ? uploadError.message : "Unknown upload error";
      return NextResponse.json(
        {
          error: `Failed to save the improved resume: ${errorMessage}. Please check your storage configuration and try again.`,
          details: "The PDF was generated successfully but couldn't be uploaded to storage."
        },
        { status: 500 }
      );
    }

    // Step 5: Store improved resume record
    const improvedRecord = await createImprovedResume(studentId, {
      sourceAnalysisId: analysis.id,
      improvedData: cleanUndefinedValues(improvedData),
      pdfFileId: uploadResult.fileId,
      pdfPath: uploadResult.path,
      pdfUrl: uploadResult.downloadUrl,
      estimatedScore: Math.min(100, analysis.overallScore + 15), // Estimate improved score
    });

    // Also add to resume history
    await createResumeHistory(studentId, {
      resumeFileId: uploadResult.fileId,
      resumeUrl: uploadResult.downloadUrl,
      resumePath: uploadResult.path,
      resumeScore: Math.min(100, analysis.overallScore + 15),
      atsScore: Math.min(100, analysis.atsScore + 10),
      generatedFrom: "improvement",
      improvementData: cleanUndefinedValues({
        personalInfo: {
          name: improvedData.personalInfo.name || "",
          email: improvedData.personalInfo.email || "",
          phone: improvedData.personalInfo.phone || "",
          location: improvedData.personalInfo.location,
          linkedin: improvedData.personalInfo.linkedin,
          github: improvedData.personalInfo.github,
          portfolio: improvedData.personalInfo.portfolio,
          summary: improvedData.personalInfo.summary,
        },
        education: improvedData.education.map((e, i) => ({
          id: `edu-${i}`,
          institution: e.institution,
          degree: e.degree,
          field: e.field || "",
          startYear: parseInt(e.startYear || "0") || new Date().getFullYear(),
          endYear: e.endYear ? parseInt(e.endYear) : undefined,
          grade: e.grade,
          current: e.current || false,
        })),
        experience: improvedData.experience.map((e, i) => ({
          id: `exp-${i}`,
          company: e.company,
          role: e.role,
          description: e.description || "",
          startDate: e.startDate || "",
          endDate: e.endDate,
          current: e.current || false,
          skills: [],
        })),
        projects: improvedData.projects.map((p, i) => ({
          id: `proj-${i}`,
          title: p.title,
          description: p.description || "",
          technologies: p.technologies || [],
          link: p.link,
        })),
        skills: improvedData.skills,
        certifications: improvedData.certifications.map((c, i) => ({
          id: `cert-${i}`,
          name: c.name,
          issuer: c.issuer || "",
          date: c.date || "",
        })),
        achievements: improvedData.achievements.map(a => a.title),
      }),
    });

    console.log(`[Resume Improve] Complete. Record ID: ${improvedRecord.id}`);

    return NextResponse.json({
      success: true,
      improvedResumeId: improvedRecord.id,
      pdfUrl: uploadResult.downloadUrl,
      improvedData,
      improvementSummary: improvedData.improvementSummary,
      estimatedScore: Math.min(100, analysis.overallScore + 15),
      originalScore: analysis.overallScore,
      quota: getQuotaInfo(),
    });
  } catch (error) {
    console.error("[Resume Improve] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to improve resume" },
      { status: 500 }
    );
  }
}


