"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { createStudent, updateStudent, getStudentByUid } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { COLLEGES, GRADUATION_YEARS } from "@/lib/constants";
import { BRANCHES, StudentProfile } from "@/types";
import { GraduationCap, ChevronRight, ChevronLeft, Check } from "lucide-react";

interface FormData {
  name: string;
  phone: string;
  college: string;
  branch: string;
  graduationYear: number;
  cgpa: string;
}

export default function StudentOnboardingPage() {
  const { user, loading: authLoading, role, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    phone: "",
    college: "",
    branch: "",
    graduationYear: GRADUATION_YEARS[1],
    cgpa: "",
  });

  useEffect(() => {
    if (!authLoading) {
      if (!user || role !== "student") {
        router.push("/login");
        return;
      }
      // Pre-fill name from Google account
      if (user.displayName && !formData.name) {
        setFormData((prev) => ({ ...prev, name: user.displayName || "" }));
      }
      // If already onboarded, redirect to dashboard
      const studentProfile = profile as StudentProfile | null;
      if (studentProfile?.onboardingComplete) {
        router.push("/student");
      }
    }
  }, [user, authLoading, role, profile, router, formData.name]);

  const handleChange = (field: keyof FormData, value: string | number) => {
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
        if (!formData.college) {
          setError("Please select your college");
          return false;
        }
        if (!formData.branch) {
          setError("Please select your branch");
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
      const existingProfile = await getStudentByUid(user.uid);
      const cgpaValue = formData.cgpa ? parseFloat(formData.cgpa) : undefined;

      if (existingProfile) {
        await updateStudent(existingProfile.id, {
          name: formData.name,
          phone: formData.phone,
          college: formData.college,
          branch: formData.branch,
          graduationYear: formData.graduationYear,
          cgpa: cgpaValue,
          profileComplete: true,
          onboardingComplete: true,
        });
      } else {
        await createStudent(user.uid, user.email || "", formData.name, {
          phone: formData.phone,
          college: formData.college,
          branch: formData.branch,
          graduationYear: formData.graduationYear,
          cgpa: cgpaValue,
          profileComplete: true,
          onboardingComplete: true,
        });
      }

      await refreshProfile();
      router.push("/student");
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-900 dark:to-zinc-800 p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <GraduationCap className="size-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Step {step} of 3 - {step === 1 ? "Personal Details" : step === 2 ? "Academic Info" : "Review"}
          </CardDescription>
          {/* Progress bar */}
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full transition-colors ${s <= step ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
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

          {/* Step 2: Academic Info */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>College</Label>
                <Select value={formData.college} onValueChange={(v) => handleChange("college", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your college" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLLEGES.map((college) => (
                      <SelectItem key={college} value={college}>
                        {college}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select value={formData.branch} onValueChange={(v) => handleChange("branch", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRANCHES.map((branch) => (
                      <SelectItem key={branch} value={branch}>
                        {branch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Graduation Year</Label>
                  <Select
                    value={formData.graduationYear.toString()}
                    onValueChange={(v) => handleChange("graduationYear", parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADUATION_YEARS.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cgpa">CGPA (Optional)</Label>
                  <Input
                    id="cgpa"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    placeholder="e.g., 8.5"
                    value={formData.cgpa}
                    onChange={(e) => handleChange("cgpa", e.target.value)}
                  />
                </div>
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
                  <span className="text-muted-foreground">College</span>
                  <span className="font-medium">{formData.college}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Branch</span>
                  <span className="font-medium">{formData.branch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Graduation Year</span>
                  <span className="font-medium">{formData.graduationYear}</span>
                </div>
                {formData.cgpa && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CGPA</span>
                    <span className="font-medium">{formData.cgpa}</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground text-center">
                You can update these details later from your profile.
              </p>
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
              <Button onClick={handleNext} className="flex-1 bg-blue-600 hover:bg-blue-700">
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
