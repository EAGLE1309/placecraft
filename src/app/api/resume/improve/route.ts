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
      // Return improved data even if PDF generation fails
      return NextResponse.json({
        success: true,
        pdfGenerated: false,
        improvedData,
        improvementSummary: improvedData.improvementSummary,
        error: "PDF generation failed, but improved content is available.",
      });
    }

    // Step 4: Upload PDF to storage
    const student = await getStudentById(studentId);
    const fileName = `resumes/${studentId}/${Date.now()}_improved_${improvedData.personalInfo.name?.replace(/\s+/g, "_") || "resume"}.pdf`;

    let uploadResult;
    try {
      uploadResult = await uploadToR2(pdfBuffer, fileName, "application/pdf");
    } catch (uploadError) {
      console.error("[Resume Improve] Upload failed:", uploadError);
      return NextResponse.json({
        success: true,
        pdfGenerated: true,
        pdfUploaded: false,
        improvedData,
        improvementSummary: improvedData.improvementSummary,
        error: "PDF generated but upload failed.",
      });
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

function generateResumeHTML(data: ImprovedResumeData): string {
  const { personalInfo, education, experience, projects, skills, certifications, achievements } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
      padding: 40px;
    }
    .header {
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .name { font-size: 24pt; font-weight: bold; margin-bottom: 5px; }
    .contact { font-size: 10pt; color: #333; }
    .contact span { margin-right: 10px; }
    .section { margin-bottom: 20px; }
    .section-title {
      font-size: 14pt;
      font-weight: bold;
      border-bottom: 1px solid #333;
      padding-bottom: 3px;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .entry { margin-bottom: 12px; }
    .entry-header { display: flex; justify-content: space-between; margin-bottom: 3px; }
    .entry-title { font-weight: bold; }
    .entry-subtitle { color: #333; font-size: 10pt; }
    .entry-date { color: #666; font-size: 10pt; }
    .entry-description { margin-top: 5px; text-align: justify; }
    .highlights { margin-top: 5px; margin-left: 20px; }
    .highlights li { margin-bottom: 3px; font-size: 10pt; }
    .skills-container { display: flex; flex-wrap: wrap; gap: 8px; }
    .skill { background: #f0f0f0; padding: 4px 10px; border-radius: 3px; font-size: 10pt; }
    ul { margin-left: 20px; margin-top: 5px; }
    li { margin-bottom: 3px; }
    a { color: #0066cc; text-decoration: none; }
  </style>
</head>
<body>
  <div class="header">
    <div class="name">${personalInfo.name || "Your Name"}</div>
    <div class="contact">
      ${personalInfo.email ? `<span>${personalInfo.email}</span>` : ""}
      ${personalInfo.phone ? `<span>•</span><span>${personalInfo.phone}</span>` : ""}
      ${personalInfo.location ? `<span>•</span><span>${personalInfo.location}</span>` : ""}
    </div>
    ${personalInfo.linkedin || personalInfo.github || personalInfo.portfolio
      ? `<div class="contact" style="margin-top: 3px;">
          ${personalInfo.linkedin ? `<span><a href="${personalInfo.linkedin}">LinkedIn</a></span>` : ""}
          ${personalInfo.github ? `<span><a href="${personalInfo.github}">GitHub</a></span>` : ""}
          ${personalInfo.portfolio ? `<span><a href="${personalInfo.portfolio}">Portfolio</a></span>` : ""}
        </div>`
      : ""
    }
  </div>

  ${personalInfo.summary
      ? `<div class="section">
        <div class="section-title">Professional Summary</div>
        <p>${personalInfo.summary}</p>
      </div>`
      : ""
    }

  ${education.length > 0
      ? `<div class="section">
        <div class="section-title">Education</div>
        ${education.map(edu => `
          <div class="entry">
            <div class="entry-header">
              <div>
                <div class="entry-title">${edu.institution}</div>
                <div class="entry-subtitle">${edu.degree}${edu.field ? ` in ${edu.field}` : ""}</div>
              </div>
              <div style="text-align: right;">
                <div class="entry-date">${edu.startYear || ""} - ${edu.current ? "Present" : edu.endYear || ""}</div>
                ${edu.grade ? `<div class="entry-date">Grade: ${edu.grade}</div>` : ""}
              </div>
            </div>
          </div>
        `).join("")}
      </div>`
      : ""
    }

  ${experience.length > 0
      ? `<div class="section">
        <div class="section-title">Experience</div>
        ${experience.map(exp => `
          <div class="entry">
            <div class="entry-header">
              <div>
                <div class="entry-title">${exp.role}</div>
                <div class="entry-subtitle">${exp.company}</div>
              </div>
              <div class="entry-date">${exp.startDate || ""} - ${exp.current ? "Present" : exp.endDate || ""}</div>
            </div>
            ${exp.description ? `<div class="entry-description">${exp.description}</div>` : ""}
            ${exp.highlights && exp.highlights.length > 0
          ? `<ul class="highlights">${exp.highlights.map(h => `<li>${h}</li>`).join("")}</ul>`
          : ""
        }
          </div>
        `).join("")}
      </div>`
      : ""
    }

  ${projects.length > 0
      ? `<div class="section">
        <div class="section-title">Projects</div>
        ${projects.map(proj => `
          <div class="entry">
            <div class="entry-header">
              <div class="entry-title">${proj.title}</div>
              ${proj.link ? `<a href="${proj.link}" class="entry-date">Link</a>` : ""}
            </div>
            ${proj.description ? `<div class="entry-description">${proj.description}</div>` : ""}
            ${proj.technologies && proj.technologies.length > 0
          ? `<div class="entry-subtitle" style="margin-top: 5px;">Technologies: ${proj.technologies.join(", ")}</div>`
          : ""
        }
          </div>
        `).join("")}
      </div>`
      : ""
    }

  ${skills.length > 0
      ? `<div class="section">
        <div class="section-title">Skills</div>
        <div class="skills-container">
          ${skills.map(skill => `<span class="skill">${skill}</span>`).join("")}
        </div>
      </div>`
      : ""
    }

  ${certifications.length > 0
      ? `<div class="section">
        <div class="section-title">Certifications</div>
        ${certifications.map(cert => `
          <div class="entry">
            <div class="entry-header">
              <div>
                <div class="entry-title">${cert.name}</div>
                ${cert.issuer ? `<div class="entry-subtitle">${cert.issuer}</div>` : ""}
              </div>
              ${cert.date ? `<div class="entry-date">${cert.date}</div>` : ""}
            </div>
          </div>
        `).join("")}
      </div>`
      : ""
    }

  ${achievements.length > 0
      ? `<div class="section">
        <div class="section-title">Achievements</div>
        <ul>
          ${achievements.map(a => `<li><strong>${a.title}</strong>${a.description ? `: ${a.description}` : ""}</li>`).join("")}
        </ul>
      </div>`
      : ""
    }
</body>
</html>
  `;
}

