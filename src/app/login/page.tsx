"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle, getRoleRedirectPath } from "@/lib/firebase/auth";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/lib/constants";
import { Spinner } from "@/components/ui/spinner";
import { GraduationCap, Building2, Users, ArrowRight, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);

    const result = await signInWithGoogle();

    if (result.success && result.role) {
      router.push(getRoleRedirectPath(result.role));
    } else {
      setError(result.error || "Failed to sign in");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      {/* Left Panel - Branding & Visuals */}
      <div className="relative hidden h-full flex-col bg-zinc-900 p-10 text-white dark:border-r lg:flex">
        <div className="absolute inset-0 bg-zinc-900" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px]" />
        <div className="absolute inset-0 bg-linear-to-t from-zinc-900 via-zinc-900/50 to-transparent" />

        <div className="relative z-20 flex items-center gap-2 font-bold text-xl">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          {APP_CONFIG.name}
        </div>

        <div className="relative z-20 mt-auto space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
              Streamline your campus placements
            </h1>
            <p className="text-lg text-zinc-400 max-w-[80%]">
              {APP_CONFIG.description}. Connect students, recruiters, and placement cells in one unified platform.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-sm">
              <Users className="mb-2 h-5 w-5 text-blue-500" />
              <h3 className="font-semibold">For Students</h3>
              <p className="text-sm text-zinc-400 mt-1">Track applications and manage resume</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-sm">
              <Building2 className="mb-2 h-5 w-5 text-indigo-500" />
              <h3 className="font-semibold">For Recruiters</h3>
              <p className="text-sm text-zinc-400 mt-1">Post jobs and manage candidates</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-sm">
              <CheckCircle2 className="mb-2 h-5 w-5 text-emerald-500" />
              <h3 className="font-semibold">For Admin</h3>
              <p className="text-sm text-zinc-400 mt-1">Manage drives and analytics</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
          <div className="flex flex-col space-y-2 text-center">
            {/* Mobile Logo */}
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 lg:hidden">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          <div className="grid gap-6">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                {error}
              </div>
            )}

            <Button
              variant="outline"
              type="button"
              disabled={loading}
              onClick={handleSignIn}
              className="h-12 w-full gap-2 bg-background hover:bg-accent relative overflow-hidden group border-input"
            >
              {loading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                  <ArrowRight className="ml-auto h-4 w-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0 text-muted-foreground" />
                </>
              )}
            </Button>

            <div className="relative">
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Secured by Google Auth
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
