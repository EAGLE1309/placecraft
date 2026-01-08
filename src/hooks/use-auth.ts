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
  // Tri-state: undefined = still loading, null = no profile found, object = profile loaded
  const [profile, setProfile] = useState<StudentProfile | RecruiterProfile | null | undefined>(undefined);
  const [profileLoading, setProfileLoading] = useState(true);

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
          setProfileLoading(true);
          try {
            if (userRole === "student") {
              const studentProfile = await getStudentByUid(firebaseUser.uid);
              setProfile(studentProfile); // null if not found, object if found
            } else if (userRole === "recruiter") {
              const recruiterProfile = await getRecruiterByUid(firebaseUser.uid);
              setProfile(recruiterProfile); // null if not found, object if found
            } else {
              setProfile(null); // admin or other roles
            }
          } catch (error) {
            console.error("Failed to fetch profile:", error);
            setProfile(null);
          } finally {
            setProfileLoading(false);
          }
        } else {
          setProfile(null);
          setProfileLoading(false);
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
        setProfileLoading(false);
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

  return { user, loading, isAuthorized, role, profile, profileLoading, refreshProfile };
}
