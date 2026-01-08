import { NextRequest, NextResponse } from "next/server";
import { uploadResume } from "@/lib/r2/storage";
import { updateStudent } from "@/lib/firebase/firestore";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const studentId = formData.get("studentId") as string;

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

    // Upload to Cloudflare R2
    const uploadResult = await uploadResume(file, studentId);

    // Update student record with file info
    await updateStudent(studentId, {
      resumeFileId: uploadResult.fileId,
      resumeUrl: uploadResult.downloadUrl,
      resumePath: uploadResult.fullPath,
    });

    return NextResponse.json({
      success: true,
      fileId: uploadResult.fileId,
      downloadUrl: uploadResult.downloadUrl,
      message: "Resume uploaded successfully.",
    });
  } catch (error) {
    console.error("Resume upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload resume" },
      { status: 500 }
    );
  }
}
