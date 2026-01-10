"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createDrive } from "@/lib/firebase/firestore";
import { RecruiterProfile, PlacementDrive, BRANCHES, COMMON_SKILLS, DriveEligibility } from "@/types";
import { Timestamp } from "firebase/firestore";
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Calendar,
  DollarSign,
  GraduationCap,
  X,
} from "lucide-react";
import Link from "next/link";

const GRADUATION_YEARS = [2024, 2025, 2026, 2027, 2028];

export default function NewDrivePage() {
  const { profile } = useAuth();
  const recruiterProfile = profile as RecruiterProfile | null;
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    role: "",
    description: "",
    type: "fulltime" as "internship" | "fulltime",
    location: "",
    ctc: "",
    stipend: "",
    duration: "",
    applicationDeadline: "",
    driveDate: "",
    minCgpa: "6.0",
  });

  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedBatches, setSelectedBatches] = useState<number[]>([]);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const toggleBranch = (branch: string) => {
    setSelectedBranches((prev) =>
      prev.includes(branch) ? prev.filter((b) => b !== branch) : [...prev, branch]
    );
  };

  const toggleBatch = (year: number) => {
    setSelectedBatches((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

  const addSkill = (type: "required" | "preferred") => {
    if (!newSkill.trim()) return;
    if (type === "required") {
      if (!requiredSkills.includes(newSkill)) {
        setRequiredSkills((prev) => [...prev, newSkill]);
      }
    } else {
      if (!preferredSkills.includes(newSkill)) {
        setPreferredSkills((prev) => [...prev, newSkill]);
      }
    }
    setNewSkill("");
  };

  const removeSkill = (skill: string, type: "required" | "preferred") => {
    if (type === "required") {
      setRequiredSkills((prev) => prev.filter((s) => s !== skill));
    } else {
      setPreferredSkills((prev) => prev.filter((s) => s !== skill));
    }
  };

  const addCommonSkill = (skill: string, type: "required" | "preferred") => {
    if (type === "required") {
      if (!requiredSkills.includes(skill)) {
        setRequiredSkills((prev) => [...prev, skill]);
      }
    } else {
      if (!preferredSkills.includes(skill)) {
        setPreferredSkills((prev) => [...prev, skill]);
      }
    }
  };

  const validateForm = (): boolean => {
    if (!formData.role.trim()) {
      setError("Please enter the job role");
      return false;
    }
    if (!formData.description.trim()) {
      setError("Please enter a job description");
      return false;
    }
    if (!formData.location.trim()) {
      setError("Please enter the job location");
      return false;
    }
    if (!formData.applicationDeadline) {
      setError("Please set an application deadline");
      return false;
    }
    if (selectedBranches.length === 0) {
      setError("Please select at least one eligible branch");
      return false;
    }
    if (selectedBatches.length === 0) {
      setError("Please select at least one eligible batch");
      return false;
    }
    return true;
  };

  const handleSubmit = async (status: "draft" | "published") => {
    if (!recruiterProfile) return;
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const eligibility: DriveEligibility = {
        branches: selectedBranches,
        minCgpa: parseFloat(formData.minCgpa) || 0,
        batches: selectedBatches,
      };

      const driveData: Omit<PlacementDrive, "id" | "recruiterId" | "applicationCount" | "createdAt" | "updatedAt" | "companyLogo" | "ctc" | "stipend" | "duration" | "driveDate"> = {
        company: recruiterProfile.company,
        role: formData.role,
        description: formData.description,
        type: formData.type,
        location: formData.location,
        eligibility,
        requiredSkills,
        preferredSkills,
        applicationDeadline: Timestamp.fromDate(new Date(formData.applicationDeadline)),
        status,
      };

      // Create the final drive data with optional fields
      const finalDriveData: Omit<PlacementDrive, "id" | "recruiterId" | "applicationCount" | "createdAt" | "updatedAt"> = {
        ...driveData,
      };

      // Only include companyLogo if it exists
      if (recruiterProfile.companyLogo) {
        finalDriveData.companyLogo = recruiterProfile.companyLogo;
      }

      // Include conditional fields
      if (formData.type === "fulltime" && formData.ctc) {
        finalDriveData.ctc = formData.ctc;
      }
      if (formData.type === "internship" && formData.stipend) {
        finalDriveData.stipend = formData.stipend;
      }
      if (formData.type === "internship" && formData.duration) {
        finalDriveData.duration = formData.duration;
      }
      if (formData.driveDate) {
        finalDriveData.driveDate = Timestamp.fromDate(new Date(formData.driveDate));
      }

      await createDrive(recruiterProfile.id, finalDriveData);

      router.push("/recruiter/drives");
    } catch (err) {
      console.error("Failed to create drive:", err);
      setError("Failed to create drive. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!recruiterProfile) {
    return (
      <ContentLayout title="Create Drive">
        <div className="flex items-center justify-center h-64">
          <Spinner className="size-8" />
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title="Create Drive">
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-4">
          <Link href="/recruiter/drives">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Create New Drive</h1>
            <p className="text-muted-foreground">Post a new placement opportunity</p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="size-5" />
              Job Details
            </CardTitle>
            <CardDescription>Basic information about the position</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="role">Job Role *</Label>
                <Input
                  id="role"
                  placeholder="e.g., Software Engineer"
                  value={formData.role}
                  onChange={(e) => handleChange("role", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Job Type *</Label>
                <Select value={formData.type} onValueChange={(v) => handleChange("type", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fulltime">Full-time</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Job Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe the role, responsibilities, and requirements..."
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={5}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-1">
                  <MapPin className="size-4" />
                  Location *
                </Label>
                <Input
                  id="location"
                  placeholder="e.g., Bangalore, Remote"
                  value={formData.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                />
              </div>
              {formData.type === "fulltime" ? (
                <div className="space-y-2">
                  <Label htmlFor="ctc" className="flex items-center gap-1">
                    <DollarSign className="size-4" />
                    CTC (Annual)
                  </Label>
                  <Input
                    id="ctc"
                    placeholder="e.g., 12 LPA"
                    value={formData.ctc}
                    onChange={(e) => handleChange("ctc", e.target.value)}
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="stipend" className="flex items-center gap-1">
                      <DollarSign className="size-4" />
                      Stipend (Monthly)
                    </Label>
                    <Input
                      id="stipend"
                      placeholder="e.g., ₹30,000"
                      value={formData.stipend}
                      onChange={(e) => handleChange("stipend", e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            {formData.type === "internship" && (
              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Input
                  id="duration"
                  placeholder="e.g., 6 months"
                  value={formData.duration}
                  onChange={(e) => handleChange("duration", e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Eligibility */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="size-5" />
              Eligibility Criteria
            </CardTitle>
            <CardDescription>Define who can apply for this position</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Eligible Branches *</Label>
              <div className="flex flex-wrap gap-2">
                {BRANCHES.map((branch) => (
                  <div key={String(branch)} className="flex items-center space-x-2">
                    <Checkbox
                      id={branch}
                      checked={selectedBranches.includes(branch)}
                      onCheckedChange={() => toggleBranch(branch)}
                    />
                    <label htmlFor={branch} className="text-sm cursor-pointer">
                      {branch}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Eligible Batches (Graduation Year) *</Label>
              <div className="flex flex-wrap gap-2">
                {GRADUATION_YEARS.map((year) => (
                  <div key={String(year)} className="flex items-center space-x-2">
                    <Checkbox
                      id={`batch-${year}`}
                      checked={selectedBatches.includes(year)}
                      onCheckedChange={() => toggleBatch(year)}
                    />
                    <label htmlFor={`batch-${year}`} className="text-sm cursor-pointer">
                      {year}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minCgpa">Minimum CGPA</Label>
              <Input
                id="minCgpa"
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={formData.minCgpa}
                onChange={(e) => handleChange("minCgpa", e.target.value)}
                className="w-32"
              />
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle>Required Skills</CardTitle>
            <CardDescription>Skills candidates must have</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {requiredSkills.map((skill) => (
                <Badge key={String(skill)} variant="secondary" className="gap-1">
                  {skill}
                  <button onClick={() => removeSkill(skill, "required")}>
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add a skill..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill("required"))}
              />
              <Button type="button" variant="outline" onClick={() => addSkill("required")}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              <span className="text-sm text-muted-foreground mr-2">Quick add:</span>
              {COMMON_SKILLS.slice(0, 10).map((skill) => (
                <Button
                  key={String(skill)}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => addCommonSkill(skill, "required")}
                  disabled={requiredSkills.includes(skill)}
                >
                  + {skill}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Preferred Skills */}
        <Card>
          <CardHeader>
            <CardTitle>Preferred Skills</CardTitle>
            <CardDescription>Nice-to-have skills (optional)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {preferredSkills.map((skill) => (
                <Badge key={String(skill)} variant="outline" className="gap-1">
                  {skill}
                  <button onClick={() => removeSkill(skill, "preferred")}>
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add a preferred skill..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill("preferred"))}
              />
              <Button type="button" variant="outline" onClick={() => addSkill("preferred")}>
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="size-5" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="deadline">Application Deadline *</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.applicationDeadline}
                  onChange={(e) => handleChange("applicationDeadline", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driveDate">Drive Date (Optional)</Label>
                <Input
                  id="driveDate"
                  type="date"
                  value={formData.driveDate}
                  onChange={(e) => handleChange("driveDate", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <Button variant="outline" onClick={() => handleSubmit("draft")} disabled={loading}>
            Save as Draft
          </Button>
          <Button onClick={() => handleSubmit("published")} disabled={loading}>
            {loading ? <Spinner className="size-4 mr-2" /> : null}
            Publish Drive
          </Button>
        </div>
      </div>
    </ContentLayout>
  );
}
