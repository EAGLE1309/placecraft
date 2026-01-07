"use client";

import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { onTokenChange, isEmailAllowed, setSessionCookie, clearSessionCookie, getUserRole, type UserRole } from "@/lib/firebase/auth";
import { AuthUser, StudentProfile, RecruiterProfile } from "@/types";
import { getStudentByUid, getRecruiterByUid } from "@/lib/firebase/firestore";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [role, setRole] = useState<UserRole>(null);
  const [profile, setProfile] = useState<StudentProfile | RecruiterProfile | null>(null);

  useEffect(() => {
    const unsubscribe = onTokenChange(async (firebaseUser: User | null) => {
      if (firebaseUser) {
        const authUser: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        };
        setUser(authUser);
        const authorized = isEmailAllowed(firebaseUser.email);
        setIsAuthorized(authorized);
        const userRole = getUserRole(firebaseUser.email);
        setRole(userRole);

        // Fetch profile based on role
        if (authorized && userRole) {
          try {
            if (userRole === "student") {
              const studentProfile = await getStudentByUid(firebaseUser.uid);
              setProfile(studentProfile);
            } else if (userRole === "recruiter") {
              const recruiterProfile = await getRecruiterByUid(firebaseUser.uid);
              setProfile(recruiterProfile);
            }
          } catch (error) {
            console.error("Failed to fetch profile:", error);
          }
        }

        // Sync session cookie with Firebase auth state
        if (authorized) {
          try {
            const idToken = await firebaseUser.getIdToken();
            setSessionCookie(idToken);
          } catch (error) {
            console.error("Failed to get ID token:", error);
          }
        }
      } else {
        setUser(null);
        setIsAuthorized(false);
        setRole(null);
        setProfile(null);
        clearSessionCookie();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (!user || !role) return;
    
    try {
      if (role === "student") {
        const studentProfile = await getStudentByUid(user.uid);
        setProfile(studentProfile);
      } else if (role === "recruiter") {
        const recruiterProfile = await getRecruiterByUid(user.uid);
        setProfile(recruiterProfile);
      }
    } catch (error) {
      console.error("Failed to refresh profile:", error);
    }
  };

  return { user, loading, isAuthorized, role, profile, refreshProfile };
}
