"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import AdminPanelLayout from "@/components/admin-panel/admin-panel-layout";
import { Spinner } from "@/components/ui/spinner";
import { StudentProfile } from "@/types";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthorized, role, profile, profileLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for both auth and profile to finish loading
    if (!loading && !profileLoading) {
      if (!user || !isAuthorized) {
        router.push("/login");
        return;
      }
      if (role !== "student") {
        if (role === "admin") router.push("/admin");
        else if (role === "recruiter") router.push("/recruiter");
        else router.push("/login");
        return;
      }
      // Check if student needs onboarding - only after profile is loaded
      const studentProfile = profile as StudentProfile | null;
      if (!studentProfile || !studentProfile.onboardingComplete) {
        router.push("/student/onboarding");
      }
    }
  }, [user, loading, isAuthorized, role, profile, profileLoading, router]);

  // Show spinner while auth OR profile is loading
  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!user || !isAuthorized || role !== "student") {
    return null;
  }

  return <AdminPanelLayout>{children}</AdminPanelLayout>;
}
