import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize R2 client
const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

export interface UploadResult {
  fileId: string;
  downloadUrl: string;
  fullPath: string;
}

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
}

/**
 * Upload a resume file to Cloudflare R2
 */
export async function uploadResume(
  file: File,
  studentId: string
): Promise<UploadResult> {
  // Create a unique filename with student ID and timestamp
  const timestamp = Date.now();
  const extension = file.name.split('.').pop();
  const fileName = `resume_${studentId}_${timestamp}.${extension}`;
  const fullPath = `resumes/${studentId}/${fileName}`;

  // Convert file to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to R2
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fullPath,
    Body: buffer,
    ContentType: file.type,
    Metadata: {
      originalName: file.name,
      studentId: studentId,
      uploadedAt: new Date().toISOString(),
    },
  });

  await r2Client.send(command);

  // Generate public URL or signed URL
  const downloadUrl = PUBLIC_URL 
    ? `${PUBLIC_URL}/${fullPath}`
    : await getSignedUrl(r2Client, new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fullPath,
      }), { expiresIn: 31536000 }); // 1 year expiry

  return {
    fileId: fileName,
    downloadUrl,
    fullPath,
  };
}

/**
 * Get download URL for a file
 */
export async function getResumeUrl(fullPath: string): Promise<string> {
  if (PUBLIC_URL) {
    return `${PUBLIC_URL}/${fullPath}`;
  }
  
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fullPath,
  });

  return getSignedUrl(r2Client, command, { expiresIn: 3600 }); // 1 hour
}

/**
 * Delete a resume file from R2
 */
export async function deleteResume(fullPath: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fullPath,
  });

  await r2Client.send(command);
}

/**
 * List all resumes for a student
 */
export async function listStudentResumes(studentId: string) {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: `resumes/${studentId}/`,
  });

  const response = await r2Client.send(command);

  const files = await Promise.all(
    (response.Contents || []).map(async (item) => {
      const url = await getResumeUrl(item.Key || "");
      return {
        name: item.Key?.split('/').pop() || "",
        fullPath: item.Key || "",
        downloadUrl: url,
      };
    })
  );

  return files;
}

/**
 * Get file as ArrayBuffer for AI analysis
 */
export async function getResumeAsBuffer(fullPath: string): Promise<ArrayBuffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fullPath,
  });

  const response = await r2Client.send(command);
  const stream = response.Body;

  if (!stream) {
    throw new Error("No file content received");
  }

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  // @ts-expect-error - AWS SDK stream type compatibility
  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  const buffer = Buffer.concat(chunks);
  return buffer.buffer;
}
