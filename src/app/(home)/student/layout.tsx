"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import AdminPanelLayout from "@/components/admin-panel/admin-panel-layout";
import { Spinner } from "@/components/ui/spinner";
import { StudentProfile } from "@/types";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthorized, role, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
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
      // Check if student needs onboarding
      const studentProfile = profile as StudentProfile | null;
      if (!studentProfile || !studentProfile.onboardingComplete) {
        router.push("/student/onboarding");
      }
    }
  }, [user, loading, isAuthorized, role, profile, router]);

  if (loading) {
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
