"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { StudentProfile } from "@/types";
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  GitMerge,
  FileText,
  User,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

interface ExtractedData {
  personalInfo: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
    summary?: string;
  };
  education: Array<{
    institution: string;
    degree: string;
    field?: string;
    startYear?: string;
    endYear?: string;
    grade?: string;
  }>;
  experience: Array<{
    company: string;
    role: string;
    description?: string;
    startDate?: string;
    endDate?: string;
  }>;
  projects: Array<{
    title: string;
    description?: string;
    technologies?: string[];
    link?: string;
  }>;
  skills: string[];
}

interface StoredAnalysis {
  id: string;
  extractedData: ExtractedData;
  createdAt: string;
}

type MergeSelection = {
  skills: "profile" | "resume" | "merge";
  education: "profile" | "resume" | "merge";
  experience: "profile" | "resume" | "merge";
  projects: "profile" | "resume" | "merge";
};

export default function ReconcileDataPage() {
  const { profile, refreshProfile } = useAuth();
  const router = useRouter();
  const studentProfile = profile as StudentProfile | null;

  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<StoredAnalysis | null>(null);
  const [mergeSelection, setMergeSelection] = useState<MergeSelection>({
    skills: "merge",
    education: "merge",
    experience: "merge",
    projects: "merge",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchAnalysis() {
      if (!studentProfile?.id) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/resume/analyze?studentId=${studentProfile.id}`);
        const data = await res.json();

        if (data.success && data.hasAnalysis) {
          setAnalysis(data.analysis);
        }
      } catch (err) {
        console.error("Failed to fetch analysis:", err);
        setError("Failed to load resume analysis.");
      } finally {
        setLoading(false);
      }
    }

    fetchAnalysis();
  }, [studentProfile?.id]);

  const handleMerge = async () => {
    if (!studentProfile || !analysis) return;

    setSaving(true);
    setError(null);

    try {
      const extractedData = analysis.extractedData;
      const updates: Partial<StudentProfile> = {};

      // Merge skills based on selection
      if (mergeSelection.skills === "resume") {
        updates.skills = extractedData.skills;
      } else if (mergeSelection.skills === "merge") {
        const existingSkills = studentProfile.skills || [];
        const newSkills = extractedData.skills || [];
        updates.skills = [...new Set([...existingSkills, ...newSkills])];
      }
      // "profile" means keep existing, no update needed

      // Merge education
      if (mergeSelection.education === "resume") {
        updates.education = extractedData.education.map((edu, i) => ({
          id: `extracted-edu-${i}`,
          institution: edu.institution,
          degree: edu.degree,
          field: edu.field || "",
          startYear: parseInt(edu.startYear || "0") || new Date().getFullYear(),
          endYear: edu.endYear ? parseInt(edu.endYear) : undefined,
          grade: edu.grade,
          current: false,
        }));
      } else if (mergeSelection.education === "merge") {
        const existingEdu = studentProfile.education || [];
        const newEdu = extractedData.education.map((edu, i) => ({
          id: `extracted-edu-${i}`,
          institution: edu.institution,
          degree: edu.degree,
          field: edu.field || "",
          startYear: parseInt(edu.startYear || "0") || new Date().getFullYear(),
          endYear: edu.endYear ? parseInt(edu.endYear) : undefined,
          grade: edu.grade,
          current: false,
        }));
        // Avoid duplicates by checking institution + degree
        const existingKeys = new Set(existingEdu.map(e => `${e.institution}-${e.degree}`));
        const uniqueNew = newEdu.filter(e => !existingKeys.has(`${e.institution}-${e.degree}`));
        updates.education = [...existingEdu, ...uniqueNew];
      }

      // Merge experience
      if (mergeSelection.experience === "resume") {
        updates.experience = extractedData.experience.map((exp, i) => ({
          id: `extracted-exp-${i}`,
          company: exp.company,
          role: exp.role,
          description: exp.description || "",
          startDate: exp.startDate || "",
          endDate: exp.endDate,
          current: false,
          skills: [],
        }));
      } else if (mergeSelection.experience === "merge") {
        const existingExp = studentProfile.experience || [];
        const newExp = extractedData.experience.map((exp, i) => ({
          id: `extracted-exp-${i}`,
          company: exp.company,
          role: exp.role,
          description: exp.description || "",
          startDate: exp.startDate || "",
          endDate: exp.endDate,
          current: false,
          skills: [],
        }));
        const existingKeys = new Set(existingExp.map(e => `${e.company}-${e.role}`));
        const uniqueNew = newExp.filter(e => !existingKeys.has(`${e.company}-${e.role}`));
        updates.experience = [...existingExp, ...uniqueNew];
      }

      // Merge projects
      if (mergeSelection.projects === "resume") {
        updates.projects = extractedData.projects.map((proj, i) => ({
          id: `extracted-proj-${i}`,
          title: proj.title,
          description: proj.description || "",
          technologies: proj.technologies || [],
          link: proj.link,
        }));
      } else if (mergeSelection.projects === "merge") {
        const existingProj = studentProfile.projects || [];
        const newProj = extractedData.projects.map((proj, i) => ({
          id: `extracted-proj-${i}`,
          title: proj.title,
          description: proj.description || "",
          technologies: proj.technologies || [],
          link: proj.link,
        }));
        const existingKeys = new Set(existingProj.map(p => p.title.toLowerCase()));
        const uniqueNew = newProj.filter(p => !existingKeys.has(p.title.toLowerCase()));
        updates.projects = [...existingProj, ...uniqueNew];
      }

      // Send update to API
      const res = await fetch("/api/student/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentProfile.id,
          updates,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update profile");
      }

      await refreshProfile();
      setSuccess(true);
    } catch (err) {
      console.error("Failed to merge data:", err);
      setError(err instanceof Error ? err.message : "Failed to merge data");
    } finally {
      setSaving(false);
    }
  };

  if (!studentProfile) {
    return (
      <ContentLayout title="Reconcile Data">
        <div className="flex items-center justify-center h-64">
          <Spinner className="size-8" />
        </div>
      </ContentLayout>
    );
  }

  if (loading) {
    return (
      <ContentLayout title="Reconcile Data">
        <div className="flex items-center justify-center h-64">
          <Spinner className="size-8" />
          <span className="ml-3">Loading data...</span>
        </div>
      </ContentLayout>
    );
  }

  if (!analysis) {
    return (
      <ContentLayout title="Reconcile Data">
        <div className="space-y-6">
          <Button variant="ghost" asChild>
            <Link href="/student/resume">
              <ArrowLeft className="size-4 mr-2" />
              Back to Resume
            </Link>
          </Button>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <FileText className="size-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-xl font-semibold mb-2">No Resume Analysis Found</h3>
                <p className="text-muted-foreground mb-6">
                  Please upload and analyze your resume first to reconcile data.
                </p>
                <Button asChild>
                  <Link href="/student/resume">Go to Resume Page</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ContentLayout>
    );
  }

  if (success) {
    return (
      <ContentLayout title="Data Merged">
        <div className="space-y-6">
          <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <CheckCircle className="size-16 mx-auto mb-4 text-green-600" />
                <h3 className="text-xl font-semibold mb-2 text-green-800 dark:text-green-200">
                  Data Merged Successfully!
                </h3>
                <p className="text-muted-foreground mb-6">
                  Your profile has been updated with the selected resume data.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button asChild>
                    <Link href="/student/profile">View Profile</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/student/resume">Back to Resume</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ContentLayout>
    );
  }

  const extractedData = analysis.extractedData;
  const profileSkills = studentProfile.skills || [];
  const extractedSkills = extractedData.skills || [];
  const newSkills = extractedSkills.filter(s => !profileSkills.includes(s));

  return (
    <ContentLayout title="Reconcile Resume Data">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link href="/student/resume">
              <ArrowLeft className="size-4 mr-2" />
              Back to Resume
            </Link>
          </Button>
        </div>

        {error && (
          <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-red-600 mt-0.5 shrink-0" />
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitMerge className="size-5 text-blue-600" />
              Merge Resume Data with Profile
            </CardTitle>
            <CardDescription>
              Choose how to handle data extracted from your resume vs your existing profile data.
              You can keep your profile data, use resume data, or merge both.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Skills Comparison */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-lg">Skills</h4>
                <div className="flex gap-2">
                  <Button
                    variant={mergeSelection.skills === "profile" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMergeSelection(s => ({ ...s, skills: "profile" }))}
                  >
                    <User className="size-3 mr-1" /> Keep Profile
                  </Button>
                  <Button
                    variant={mergeSelection.skills === "merge" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMergeSelection(s => ({ ...s, skills: "merge" }))}
                  >
                    <GitMerge className="size-3 mr-1" /> Merge
                  </Button>
                  <Button
                    variant={mergeSelection.skills === "resume" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMergeSelection(s => ({ ...s, skills: "resume" }))}
                  >
                    <FileText className="size-3 mr-1" /> Use Resume
                  </Button>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="size-4" />
                    <span className="font-medium">Profile ({profileSkills.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {profileSkills.slice(0, 15).map((skill, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                    ))}
                    {profileSkills.length > 15 && (
                      <Badge variant="outline" className="text-xs">+{profileSkills.length - 15} more</Badge>
                    )}
                    {profileSkills.length === 0 && (
                      <span className="text-sm text-muted-foreground">No skills in profile</span>
                    )}
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="size-4" />
                    <span className="font-medium">Resume ({extractedSkills.length})</span>
                    {newSkills.length > 0 && (
                      <Badge variant="default" className="text-xs bg-green-600">{newSkills.length} new</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {extractedSkills.slice(0, 15).map((skill, i) => (
                      <Badge 
                        key={i} 
                        variant={newSkills.includes(skill) ? "default" : "secondary"} 
                        className={`text-xs ${newSkills.includes(skill) ? "bg-green-600" : ""}`}
                      >
                        {skill}
                      </Badge>
                    ))}
                    {extractedSkills.length > 15 && (
                      <Badge variant="outline" className="text-xs">+{extractedSkills.length - 15} more</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Education Comparison */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-lg">Education</h4>
                <div className="flex gap-2">
                  <Button
                    variant={mergeSelection.education === "profile" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMergeSelection(s => ({ ...s, education: "profile" }))}
                  >
                    <User className="size-3 mr-1" /> Keep Profile
                  </Button>
                  <Button
                    variant={mergeSelection.education === "merge" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMergeSelection(s => ({ ...s, education: "merge" }))}
                  >
                    <GitMerge className="size-3 mr-1" /> Merge
                  </Button>
                  <Button
                    variant={mergeSelection.education === "resume" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMergeSelection(s => ({ ...s, education: "resume" }))}
                  >
                    <FileText className="size-3 mr-1" /> Use Resume
                  </Button>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="size-4" />
                    <span className="font-medium">Profile ({studentProfile.education?.length || 0})</span>
                  </div>
                  {(studentProfile.education || []).map((edu, i) => (
                    <div key={i} className="text-sm mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <p className="font-medium">{edu.institution}</p>
                      <p className="text-muted-foreground">{edu.degree} in {edu.field}</p>
                    </div>
                  ))}
                  {!studentProfile.education?.length && (
                    <span className="text-sm text-muted-foreground">No education in profile</span>
                  )}
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="size-4" />
                    <span className="font-medium">Resume ({extractedData.education.length})</span>
                  </div>
                  {extractedData.education.map((edu, i) => (
                    <div key={i} className="text-sm mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <p className="font-medium">{edu.institution}</p>
                      <p className="text-muted-foreground">{edu.degree} {edu.field ? `in ${edu.field}` : ""}</p>
                    </div>
                  ))}
                  {extractedData.education.length === 0 && (
                    <span className="text-sm text-muted-foreground">No education extracted</span>
                  )}
                </div>
              </div>
            </div>

            {/* Experience Comparison */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-lg">Experience</h4>
                <div className="flex gap-2">
                  <Button
                    variant={mergeSelection.experience === "profile" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMergeSelection(s => ({ ...s, experience: "profile" }))}
                  >
                    <User className="size-3 mr-1" /> Keep Profile
                  </Button>
                  <Button
                    variant={mergeSelection.experience === "merge" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMergeSelection(s => ({ ...s, experience: "merge" }))}
                  >
                    <GitMerge className="size-3 mr-1" /> Merge
                  </Button>
                  <Button
                    variant={mergeSelection.experience === "resume" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMergeSelection(s => ({ ...s, experience: "resume" }))}
                  >
                    <FileText className="size-3 mr-1" /> Use Resume
                  </Button>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="size-4" />
                    <span className="font-medium">Profile ({studentProfile.experience?.length || 0})</span>
                  </div>
                  {(studentProfile.experience || []).slice(0, 3).map((exp, i) => (
                    <div key={i} className="text-sm mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <p className="font-medium">{exp.role}</p>
                      <p className="text-muted-foreground">{exp.company}</p>
                    </div>
                  ))}
                  {(studentProfile.experience?.length || 0) > 3 && (
                    <p className="text-xs text-muted-foreground">+{(studentProfile.experience?.length || 0) - 3} more</p>
                  )}
                  {!studentProfile.experience?.length && (
                    <span className="text-sm text-muted-foreground">No experience in profile</span>
                  )}
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="size-4" />
                    <span className="font-medium">Resume ({extractedData.experience.length})</span>
                  </div>
                  {extractedData.experience.slice(0, 3).map((exp, i) => (
                    <div key={i} className="text-sm mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <p className="font-medium">{exp.role}</p>
                      <p className="text-muted-foreground">{exp.company}</p>
                    </div>
                  ))}
                  {extractedData.experience.length > 3 && (
                    <p className="text-xs text-muted-foreground">+{extractedData.experience.length - 3} more</p>
                  )}
                  {extractedData.experience.length === 0 && (
                    <span className="text-sm text-muted-foreground">No experience extracted</span>
                  )}
                </div>
              </div>
            </div>

            {/* Projects Comparison */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-lg">Projects</h4>
                <div className="flex gap-2">
                  <Button
                    variant={mergeSelection.projects === "profile" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMergeSelection(s => ({ ...s, projects: "profile" }))}
                  >
                    <User className="size-3 mr-1" /> Keep Profile
                  </Button>
                  <Button
                    variant={mergeSelection.projects === "merge" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMergeSelection(s => ({ ...s, projects: "merge" }))}
                  >
                    <GitMerge className="size-3 mr-1" /> Merge
                  </Button>
                  <Button
                    variant={mergeSelection.projects === "resume" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMergeSelection(s => ({ ...s, projects: "resume" }))}
                  >
                    <FileText className="size-3 mr-1" /> Use Resume
                  </Button>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="size-4" />
                    <span className="font-medium">Profile ({studentProfile.projects?.length || 0})</span>
                  </div>
                  {(studentProfile.projects || []).slice(0, 3).map((proj, i) => (
                    <div key={i} className="text-sm mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <p className="font-medium">{proj.title}</p>
                    </div>
                  ))}
                  {(studentProfile.projects?.length || 0) > 3 && (
                    <p className="text-xs text-muted-foreground">+{(studentProfile.projects?.length || 0) - 3} more</p>
                  )}
                  {!studentProfile.projects?.length && (
                    <span className="text-sm text-muted-foreground">No projects in profile</span>
                  )}
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="size-4" />
                    <span className="font-medium">Resume ({extractedData.projects.length})</span>
                  </div>
                  {extractedData.projects.slice(0, 3).map((proj, i) => (
                    <div key={i} className="text-sm mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <p className="font-medium">{proj.title}</p>
                    </div>
                  ))}
                  {extractedData.projects.length > 3 && (
                    <p className="text-xs text-muted-foreground">+{extractedData.projects.length - 3} more</p>
                  )}
                  {extractedData.projects.length === 0 && (
                    <span className="text-sm text-muted-foreground">No projects extracted</span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 border-t flex gap-3 justify-end">
              <Button variant="outline" asChild>
                <Link href="/student/resume">Cancel</Link>
              </Button>
              <Button onClick={handleMerge} disabled={saving}>
                {saving ? (
                  <>
                    <Spinner className="size-4 mr-2" />
                    Merging...
                  </>
                ) : (
                  <>
                    <GitMerge className="size-4 mr-2" />
                    Apply Selected Merges
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}
