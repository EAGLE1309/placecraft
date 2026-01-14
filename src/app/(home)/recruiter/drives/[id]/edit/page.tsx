"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { getDriveById, updateDrive } from "@/lib/firebase/firestore";
import { RecruiterProfile, BRANCHES } from "@/types";
import { GRADUATION_YEARS } from "@/lib/constants";
import { Timestamp } from "firebase/firestore";
import { ArrowLeft, Save } from "lucide-react";

export default function EditDrivePage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const recruiterProfile = profile as RecruiterProfile | null;
  const driveId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    role: "",
    description: "",
    type: "fulltime" as "fulltime" | "internship",
    location: "",
    ctc: "",
    stipend: "",
    duration: "",
    branches: [] as string[],
    minCgpa: 0,
    batches: [] as number[],
    requiredSkills: "",
    preferredSkills: "",
    applicationDeadline: "",
  });

  useEffect(() => {
    async function loadDrive() {
      if (!driveId || !recruiterProfile) return;

      setLoading(true);
      try {
        const drive = await getDriveById(driveId);
        if (!drive || drive.recruiterId !== recruiterProfile.id) {
          router.push("/recruiter/drives");
          return;
        }

        const deadline = drive.applicationDeadline.toDate();
        const formattedDeadline = deadline.toISOString().split("T")[0];

        setFormData({
          role: drive.role,
          description: drive.description,
          type: drive.type,
          location: drive.location,
          ctc: drive.ctc || "",
          stipend: drive.stipend || "",
          duration: drive.duration || "",
          branches: drive.eligibility.branches,
          minCgpa: drive.eligibility.minCgpa,
          batches: drive.eligibility.batches,
          requiredSkills: drive.requiredSkills.join(", "),
          preferredSkills: drive.preferredSkills.join(", "),
          applicationDeadline: formattedDeadline,
        });
      } catch (err) {
        console.error("Failed to load drive:", err);
        setError("Failed to load drive data");
      } finally {
        setLoading(false);
      }
    }

    loadDrive();
  }, [driveId, recruiterProfile, router]);

  const validateForm = (): string | null => {
    if (!formData.role.trim()) return "Role is required";
    if (!formData.description.trim()) return "Description is required";
    if (!formData.location.trim()) return "Location is required";
    if (formData.type === "fulltime" && !formData.ctc.trim()) return "CTC is required for full-time positions";
    if (formData.type === "internship" && !formData.stipend.trim()) return "Stipend is required for internships";
    if (formData.branches.length === 0) return "Select at least one branch";
    if (formData.batches.length === 0) return "Select at least one batch";
    if (!formData.applicationDeadline) return "Application deadline is required";
    return null;
  };

  const handleSubmit = async () => {
    setError(null);
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      await updateDrive(driveId, {
        role: formData.role.trim(),
        description: formData.description.trim(),
        type: formData.type,
        location: formData.location.trim(),
        ctc: formData.type === "fulltime" ? formData.ctc.trim() : undefined,
        stipend: formData.type === "internship" ? formData.stipend.trim() : undefined,
        duration: formData.type === "internship" ? formData.duration.trim() : undefined,
        eligibility: {
          branches: formData.branches,
          minCgpa: formData.minCgpa,
          batches: formData.batches,
        },
        requiredSkills: formData.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
        preferredSkills: formData.preferredSkills.split(",").map((s) => s.trim()).filter(Boolean),
        applicationDeadline: Timestamp.fromDate(new Date(formData.applicationDeadline)),
      });

      router.push(`/recruiter/drives/${driveId}`);
    } catch (err) {
      console.error("Failed to update drive:", err);
      setError("Failed to update drive. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ContentLayout title="Edit Drive">
        <div className="flex items-center justify-center h-64">
          <Spinner className="size-8" />
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title="Edit Drive">
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href={`/recruiter/drives/${driveId}`}>
            <ArrowLeft className="size-4 mr-2" />
            Back to Drive
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Edit Drive Details</CardTitle>
            <CardDescription>Update your placement drive information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role/Position</Label>
                <Input
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g., Software Engineer"
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Bangalore"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Job description and requirements..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v as "fulltime" | "internship" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fulltime">Full-time</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.type === "fulltime" ? (
                <div className="space-y-2">
                  <Label>CTC</Label>
                  <Input
                    value={formData.ctc}
                    onChange={(e) => setFormData({ ...formData, ctc: e.target.value })}
                    placeholder="e.g., 12 LPA"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Stipend</Label>
                    <Input
                      value={formData.stipend}
                      onChange={(e) => setFormData({ ...formData, stipend: e.target.value })}
                      placeholder="e.g., ₹50,000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Input
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      placeholder="e.g., 6 months"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Eligible Branches</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg">
                {BRANCHES.map((branch) => (
                  <label key={branch} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.branches.includes(branch)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({ ...formData, branches: [...formData.branches, branch] });
                        } else {
                          setFormData({ ...formData, branches: formData.branches.filter((b) => b !== branch) });
                        }
                      }}
                    />
                    <span className="text-sm">{branch}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Minimum CGPA</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={formData.minCgpa}
                  onChange={(e) => setFormData({ ...formData, minCgpa: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Eligible Batches</Label>
                <div className="flex flex-wrap gap-2">
                  {GRADUATION_YEARS.map((year) => (
                    <label key={year} className="flex items-center gap-1 cursor-pointer">
                      <Checkbox
                        checked={formData.batches.includes(year)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({ ...formData, batches: [...formData.batches, year] });
                          } else {
                            setFormData({ ...formData, batches: formData.batches.filter((b) => b !== year) });
                          }
                        }}
                      />
                      <span className="text-sm">{year}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Required Skills (comma-separated)</Label>
              <Input
                value={formData.requiredSkills}
                onChange={(e) => setFormData({ ...formData, requiredSkills: e.target.value })}
                placeholder="e.g., JavaScript, React, Node.js"
              />
            </div>

            <div className="space-y-2">
              <Label>Preferred Skills (comma-separated)</Label>
              <Input
                value={formData.preferredSkills}
                onChange={(e) => setFormData({ ...formData, preferredSkills: e.target.value })}
                placeholder="e.g., TypeScript, GraphQL"
              />
            </div>

            <div className="space-y-2">
              <Label>Application Deadline</Label>
              <Input
                type="date"
                value={formData.applicationDeadline}
                onChange={(e) => setFormData({ ...formData, applicationDeadline: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" asChild>
                <Link href={`/recruiter/drives/${driveId}`}>Cancel</Link>
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? <Spinner className="size-4" /> : <Save className="size-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}
