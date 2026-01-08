"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { createRecruiter, updateRecruiter, getRecruiterByUid } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { RecruiterProfile } from "@/types";
import { Building2, ChevronRight, ChevronLeft, Check, Briefcase } from "lucide-react";

interface FormData {
  name: string;
  phone: string;
  company: string;
  designation: string;
  companyDescription: string;
}

export default function RecruiterOnboardingPage() {
  const { user, loading: authLoading, role, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    phone: "",
    company: "",
    designation: "",
    companyDescription: "",
  });

  useEffect(() => {
    if (!authLoading) {
      if (!user || role !== "recruiter") {
        router.push("/login");
        return;
      }
      // Pre-fill name from Google account
      if (user.displayName && !formData.name) {
        setFormData((prev) => ({ ...prev, name: user.displayName || "" }));
      }
      // If already has profile with company info, redirect to dashboard
      const recruiterProfile = profile as RecruiterProfile | null;
      if (recruiterProfile?.company) {
        router.push("/recruiter");
      }
    }
  }, [user, authLoading, role, profile, router, formData.name]);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        if (!formData.name.trim()) {
          setError("Please enter your name");
          return false;
        }
        if (!formData.phone.trim() || formData.phone.length < 10) {
          setError("Please enter a valid phone number");
          return false;
        }
        return true;
      case 2:
        if (!formData.company.trim()) {
          setError("Please enter your company name");
          return false;
        }
        if (!formData.designation.trim()) {
          setError("Please enter your designation");
          return false;
        }
        return true;
      case 3:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const existingProfile = await getRecruiterByUid(user.uid);

      if (existingProfile) {
        await updateRecruiter(existingProfile.id, {
          name: formData.name,
          phone: formData.phone,
          company: formData.company,
          designation: formData.designation,
        });
      } else {
        await createRecruiter(user.uid, user.email || "", formData.name, {
          phone: formData.phone,
          company: formData.company,
          designation: formData.designation,
        });
      }

      await refreshProfile();
      router.push("/recruiter");
    } catch (err) {
      console.error("Onboarding error:", err);
      setError("Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-zinc-900 dark:to-zinc-800 p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Building2 className="size-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Step {step} of 3 - {step === 1 ? "Personal Details" : step === 2 ? "Company Info" : "Review"}
          </CardDescription>
          {/* Progress bar */}
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full transition-colors ${s <= step ? "bg-purple-600" : "bg-gray-200 dark:bg-gray-700"
                  }`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md">
              {error}
            </div>
          )}

          {/* Step 1: Personal Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 2: Company Info */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <Input
                  id="company"
                  placeholder="Enter your company name"
                  value={formData.company}
                  onChange={(e) => handleChange("company", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="designation">Your Designation</Label>
                <Input
                  id="designation"
                  placeholder="e.g., HR Manager, Technical Recruiter"
                  value={formData.designation}
                  onChange={(e) => handleChange("designation", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyDescription">Company Description (Optional)</Label>
                <Textarea
                  id="companyDescription"
                  placeholder="Brief description of your company..."
                  value={formData.companyDescription}
                  onChange={(e) => handleChange("companyDescription", e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{formData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium">{formData.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Company</span>
                  <span className="font-medium">{formData.company}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Designation</span>
                  <span className="font-medium">{formData.designation}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                You can update these details later from your profile.
              </p>

              {/* What you can do prompt */}
              <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center shrink-0">
                    <Briefcase className="size-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-purple-800 dark:text-purple-200">Ready to hire?</h4>
                    <p className="text-sm text-purple-600 dark:text-purple-300 mt-1">
                      After completing setup, you can post placement drives, review applications, and connect with talented students.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ChevronLeft className="size-4 mr-1" />
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button onClick={handleNext} className="flex-1 bg-purple-600 hover:bg-purple-700">
                Next
                <ChevronRight className="size-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <Spinner className="size-4" />
                ) : (
                  <>
                    <Check className="size-4 mr-1" />
                    Complete Setup
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
