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
  
  return new Date();
}
