"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import AdminPanelLayout from "@/components/admin-panel/admin-panel-layout";
import { Spinner } from "@/components/ui/spinner";
import { RecruiterProfile } from "@/types";

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthorized, role, profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user || !isAuthorized) {
        router.push("/login");
        return;
      }
      if (role !== "recruiter") {
        if (role === "admin") router.push("/admin");
        else if (role === "student") router.push("/student");
        else router.push("/login");
        return;
      }
      // Check if recruiter needs onboarding (no company set)
      const recruiterProfile = profile as RecruiterProfile | null;
      if ((!recruiterProfile || !recruiterProfile.company) && pathname !== "/recruiter/onboarding") {
        router.push("/recruiter/onboarding");
      }
    }
  }, [user, loading, isAuthorized, role, profile, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!user || !isAuthorized || role !== "recruiter") {
    return null;
  }

  // Allow onboarding page without AdminPanelLayout
  if (pathname === "/recruiter/onboarding") {
    return <>{children}</>;
  }

  return <AdminPanelLayout>{children}</AdminPanelLayout>;
}
