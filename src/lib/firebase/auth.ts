import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  onIdTokenChanged,
  User,
} from "firebase/auth";
import { auth } from "./config";
import { ALLOWED_ADMIN_EMAILS, ALLOWED_RECRUITER_EMAILS } from "../constants";

const googleProvider = new GoogleAuthProvider();

function getAuth() {
  if (!auth) {
    throw new Error("Firebase Auth is not initialized. Check your environment variables.");
  }
  return auth;
}

// Cookie utilities
export function setSessionCookie(token: string) {
  document.cookie = `__session=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function clearSessionCookie() {
  document.cookie = "__session=; path=/; max-age=0";
}

export type UserRole = "admin" | "recruiter" | "student" | null;

export const signInWithGoogle = async (): Promise<{
  success: boolean;
  error?: string;
  user?: User;
  role?: UserRole;
}> => {
  try {
    const authInstance = getAuth();
    const result = await signInWithPopup(authInstance, googleProvider);
    const user = result.user;

    const role = getUserRole(user.email);
    if (!user.email || !role) {
      await firebaseSignOut(authInstance);
      return {
        success: false,
        error: "You are not authorized to access this application.",
      };
    }

    // Get ID token and set cookie immediately after successful sign-in
    const idToken = await user.getIdToken();
    setSessionCookie(idToken);

    return { success: true, user, role };
  } catch (error: unknown) {
    console.error("Sign in error:", error);
    if (error && typeof error === "object" && "code" in error) {
      const firebaseError = error as { code: string };
      if (firebaseError.code === "auth/popup-closed-by-user") {
        return {
          success: false,
          error: "Sign in was cancelled. Please try again.",
        };
      }
      if (firebaseError.code === "auth/cancelled-popup-request") {
        return {
          success: false,
          error: "Another sign in is in progress.",
        };
      }
    }
    return {
      success: false,
      error: "Failed to sign in. Please try again.",
    };
  }
};

export const signOut = async (): Promise<void> => {
  try {
    clearSessionCookie();
    await firebaseSignOut(getAuth());
  } catch (error) {
    console.error("Sign out error:", error);
  }
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  if (!auth) {
    return () => { };
  }
  return onAuthStateChanged(auth, callback);
};

// Use onIdTokenChanged to keep cookie in sync with Firebase auth state
export const onTokenChange = (callback: (user: User | null) => void) => {
  if (!auth) {
    return () => { };
  }
  return onIdTokenChanged(auth, callback);
};

export const isEmailAllowed = (email: string | null): boolean => {
  // Anyone with a valid email is allowed (students are default)
  return !!email;
};

export const isAdminEmail = (email: string | null): boolean => {
  if (!email) return false;
  return ALLOWED_ADMIN_EMAILS.includes(email);
};

export const isRecruiterEmail = (email: string | null): boolean => {
  if (!email) return false;
  return ALLOWED_RECRUITER_EMAILS.includes(email);
};

export const isStudentEmail = (email: string | null): boolean => {
  if (!email) return false;
  // Anyone who is not admin or recruiter is a student
  return !ALLOWED_ADMIN_EMAILS.includes(email) && !ALLOWED_RECRUITER_EMAILS.includes(email);
};

export const getUserRole = (email: string | null): UserRole => {
  if (!email) return null;
  if (ALLOWED_ADMIN_EMAILS.includes(email)) return "admin";
  if (ALLOWED_RECRUITER_EMAILS.includes(email)) return "recruiter";
  // Anyone else is a student by default
  return "student";
};

export const getRoleRedirectPath = (role: UserRole): string => {
  switch (role) {
    case "admin":
      return "/admin";
    case "recruiter":
      return "/recruiter";
    case "student":
      return "/student";
    default:
      return "/login";
  }
};
