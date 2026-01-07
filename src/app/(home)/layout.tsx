"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Spinner } from "@/components/ui/spinner";

function AuthLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthorized, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !isAuthorized || !role)) {
      document.cookie = "__session=; path=/; max-age=0";
      router.push("/login");
    }
  }, [user, loading, isAuthorized, role, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!user || !isAuthorized || !role) {
    return null;
  }

  return <>{children}</>;
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthLayoutContent>{children}</AuthLayoutContent>
    </AuthProvider>
  );
}
