import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Timestamp } from "firebase/firestore"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toDate(timestamp: Timestamp | { seconds: number; nanoseconds: number } | Date | string | undefined): Date {
  if (!timestamp) return new Date();

  if (timestamp instanceof Date) return timestamp;

  if (typeof timestamp === "string") return new Date(timestamp);

  if (timestamp instanceof Timestamp) return timestamp.toDate();

  if (typeof timestamp === "object" && "seconds" in timestamp) {
    return new Date(timestamp.seconds * 1000);
  }

  // Handle any other object types by converting to string first, then to Date
  if (typeof timestamp === "object" && timestamp !== null) {
    try {
      // Try to convert object to Date if it has a toDate method
      const objWithToDate = timestamp as { toDate?: () => Date };
      if (objWithToDate.toDate && typeof objWithToDate.toDate === "function") {
        return objWithToDate.toDate();
      }
      // Fallback: try to convert to string then to Date
      return new Date(String(timestamp));
    } catch {
      return new Date();
    }
  }

  return new Date();
}
