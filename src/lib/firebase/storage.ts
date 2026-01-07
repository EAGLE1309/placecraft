import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject, listAll } from "firebase/storage";
import app from "./config";

// Initialize Firebase Storage
const storage = app ? getStorage(app) : null;

function getStorageInstance() {
  if (!storage) {
    throw new Error("Firebase Storage is not initialized. Check your environment variables.");
  }
  return storage;
}

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
 * Upload a resume file to Firebase Storage with progress tracking
 */
export async function uploadResume(
  file: File,
  studentId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const storageInstance = getStorageInstance();
  
  // Create a unique filename with student ID and timestamp
  const timestamp = Date.now();
  const extension = file.name.split('.').pop();
  const fileName = `resume_${studentId}_${timestamp}.${extension}`;
  const fullPath = `resumes/${studentId}/${fileName}`;
  
  const storageRef = ref(storageInstance, fullPath);
  
  // Upload the file with progress tracking
  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      originalName: file.name,
      studentId: studentId,
      uploadedAt: new Date().toISOString(),
    },
  });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Progress callback
        if (onProgress) {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress({
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            progress,
          });
        }
      },
      (error) => {
        // Error callback
        reject(error);
      },
      async () => {
        // Success callback
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            fileId: fileName,
            downloadUrl,
            fullPath,
          });
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

/**
 * Get download URL for a file
 */
export async function getResumeUrl(fullPath: string): Promise<string> {
  const storageInstance = getStorageInstance();
  const storageRef = ref(storageInstance, fullPath);
  return getDownloadURL(storageRef);
}

/**
 * Delete a resume file from Firebase Storage
 */
export async function deleteResume(fullPath: string): Promise<void> {
  const storageInstance = getStorageInstance();
  const storageRef = ref(storageInstance, fullPath);
  await deleteObject(storageRef);
}

/**
 * List all resumes for a student
 */
export async function listStudentResumes(studentId: string) {
  const storageInstance = getStorageInstance();
  const listRef = ref(storageInstance, `resumes/${studentId}`);
  
  const result = await listAll(listRef);
  
  const files = await Promise.all(
    result.items.map(async (itemRef) => {
      const url = await getDownloadURL(itemRef);
      return {
        name: itemRef.name,
        fullPath: itemRef.fullPath,
        downloadUrl: url,
      };
    })
  );
  
  return files;
}

/**
 * Get file as ArrayBuffer for AI analysis
 */
export async function getResumeAsBuffer(downloadUrl: string): Promise<ArrayBuffer> {
  const response = await fetch(downloadUrl);
  return response.arrayBuffer();
}
