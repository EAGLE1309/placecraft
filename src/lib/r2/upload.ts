import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

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
  path: string;
}

export async function uploadToR2(
  buffer: Buffer,
  path: string,
  contentType: string
): Promise<UploadResult> {
  // Check if R2 is configured
  if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !BUCKET_NAME) {
    throw new Error(
      "Storage (R2) is not configured. Please set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME environment variables."
    );
  }

  const fileId = uuidv4();

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: path,
    Body: buffer,
    ContentType: contentType,
    Metadata: {
      fileId,
      uploadedAt: new Date().toISOString(),
    },
  });

  await r2Client.send(command);

  const downloadUrl = PUBLIC_URL
    ? `${PUBLIC_URL}/${path}`
    : await getSignedUrl(
      r2Client,
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: path,
      }),
      { expiresIn: 31536000 }
    );

  return {
    fileId,
    downloadUrl,
    path,
  };
}
