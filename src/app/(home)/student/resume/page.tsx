"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { StudentProfile } from "@/types";
import { uploadResume } from "@/lib/firebase/storage";
import { updateStudent } from "@/lib/firebase/firestore";
import {
  FileText,
  Upload,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Lightbulb,
  RefreshCw
} from "lucide-react";

interface AnalysisResult {
  overallScore: number;
  atsScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: {
    type: string;
    section: string;
    suggestion: string;
    priority: string;
  }[];
}

interface QuotaInfo {
  minuteRemaining: number;
  dayRemaining: number;
  resetInSeconds: number;
}

export default function StudentResumePage() {
  const { profile, refreshProfile } = useAuth();
  const studentProfile = profile as StudentProfile | null;

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch quota info on mount
  useEffect(() => {
    async function fetchQuota() {
      try {
        const res = await fetch("/api/resume/analyze");
        const data = await res.json();
        setQuota(data.quota);
      } catch (err) {
        console.error("Failed to fetch quota:", err);
      }
    }
    fetchQuota();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !studentProfile) return;

    // Validate file type
    const validTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!validTypes.includes(file.type)) {
      setError("Please upload a PDF or Word document");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Upload directly to Firebase Storage (client-side) with progress tracking
      const uploadResult = await uploadResume(file, studentProfile.id, (progress) => {
        setUploadProgress(Math.round(progress.progress));
      });

      // Update student record with file info
      await updateStudent(studentProfile.id, {
        resumeFileId: uploadResult.fileId,
        resumeUrl: uploadResult.downloadUrl,
        resumePath: uploadResult.fullPath,
      });

      await refreshProfile();
      setUploading(false);
      setUploadProgress(0);

      // Trigger AI analysis
      setAnalyzing(true);
      const analyzeRes = await fetch("/api/resume/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          downloadUrl: uploadResult.downloadUrl,
          studentId: studentProfile.id,
        }),
      });

      const analyzeData = await analyzeRes.json();

      if (!analyzeRes.ok) {
        if (analyzeRes.status === 429) {
          setError(`Rate limit reached. Please try again in ${analyzeData.retryAfter || 60} seconds.`);
        } else {
          throw new Error(analyzeData.error || "Failed to analyze resume");
        }
      } else {
        setAnalysis(analyzeData.analysis);
        setQuota(analyzeData.quota);
      }

      await refreshProfile();
    } catch (err) {
      console.error("Failed to upload resume:", err);
      setError(err instanceof Error ? err.message : "Failed to upload resume. Please try again.");
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const handleReanalyze = async () => {
    if (!studentProfile?.resumeUrl) return;

    setAnalyzing(true);
    setError(null);

    try {
      const res = await fetch("/api/resume/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          downloadUrl: studentProfile.resumeUrl,
          studentId: studentProfile.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setError(`Rate limit reached. Please try again in ${data.retryAfter || 60} seconds.`);
        } else {
          throw new Error(data.error || "Failed to analyze resume");
        }
      } else {
        setAnalysis(data.analysis);
        setQuota(data.quota);
        await refreshProfile();
      }
    } catch (err) {
      console.error("Failed to analyze resume:", err);
      setError(err instanceof Error ? err.message : "Failed to analyze resume");
    } finally {
      setAnalyzing(false);
    }
  };

  if (!studentProfile) {
    return (
      <ContentLayout title="Resume">
        <div className="flex items-center justify-center h-64">
          <Spinner className="size-8" />
        </div>
      </ContentLayout>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800";
      case "medium": return "border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800";
      case "low": return "border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800";
      default: return "border-gray-200 bg-gray-50 dark:bg-gray-900/20 dark:border-gray-800";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high": return <AlertCircle className="size-5 text-red-600 mt-0.5" />;
      case "medium": return <Lightbulb className="size-5 text-yellow-600 mt-0.5" />;
      default: return <CheckCircle className="size-5 text-blue-600 mt-0.5" />;
    }
  };

  return (
    <ContentLayout title="Resume">
      <div className="space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-5 text-red-600" />
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Quota Info */}
        {quota && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>AI Analysis Quota:</span>
            <Badge variant="outline">{quota.minuteRemaining}/min</Badge>
            <Badge variant="outline">{quota.dayRemaining}/day</Badge>
          </div>
        )}

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Your Resume</CardTitle>
            <CardDescription>
              Upload your resume to apply for opportunities. We&apos;ll analyze it using Gemini AI to provide insights.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!studentProfile.resumeFileId ? (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <FileText className="size-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No resume uploaded</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload your resume in PDF or Word format (max 5MB)
                </p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                  id="resume-upload"
                />
                {uploading && uploadProgress > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Uploading...</span>
                      <span className="text-sm font-medium">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                <Button asChild disabled={uploading || analyzing}>
                  <label htmlFor="resume-upload" className="cursor-pointer">
                    {uploading ? (
                      <>
                        <Spinner className="size-4 mr-2" />
                        Uploading...
                      </>
                    ) : analyzing ? (
                      <>
                        <Spinner className="size-4 mr-2" />
                        Analyzing with Gemini AI...
                      </>
                    ) : (
                      <>
                        <Upload className="size-4 mr-2" />
                        Upload Resume
                      </>
                    )}
                  </label>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <FileText className="size-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Resume Uploaded</h4>
                      <p className="text-sm text-muted-foreground">
                        Stored securely in cloud storage
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {studentProfile.resumeUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={studentProfile.resumeUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="size-4 mr-2" />
                          View
                        </a>
                      </Button>
                    )}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading || analyzing}
                      id="resume-replace"
                    />
                    <Button variant="outline" size="sm" asChild disabled={uploading || analyzing}>
                      <label htmlFor="resume-replace" className="cursor-pointer">
                        <Upload className="size-4 mr-2" />
                        Replace
                      </label>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resume Analysis */}
        {studentProfile.resumeFileId && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="size-4" />
                    Resume Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analyzing ? (
                    <div className="flex items-center gap-2">
                      <Spinner className="size-4" />
                      <span className="text-muted-foreground">Analyzing with Gemini AI...</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-4xl font-bold">
                        {studentProfile.resumeScore || 0}
                        <span className="text-lg text-muted-foreground">/100</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className={`h-2 rounded-full transition-all ${(studentProfile.resumeScore || 0) >= 80
                            ? "bg-green-500"
                            : (studentProfile.resumeScore || 0) >= 60
                              ? "bg-yellow-500"
                              : "bg-red-500"
                            }`}
                          style={{ width: `${studentProfile.resumeScore || 0}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {(studentProfile.resumeScore || 0) >= 80
                          ? "Excellent! Your resume is well-optimized."
                          : (studentProfile.resumeScore || 0) >= 60
                            ? "Good, but there's room for improvement."
                            : "Consider improving your resume."}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="size-4" />
                    ATS Compatibility
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analyzing ? (
                    <div className="flex items-center gap-2">
                      <Spinner className="size-4" />
                      <span className="text-muted-foreground">Analyzing...</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-4xl font-bold">
                        {studentProfile.atsScore || 0}
                        <span className="text-lg text-muted-foreground">%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${studentProfile.atsScore || 0}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        ATS (Applicant Tracking System) friendly score
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Strengths & Weaknesses from AI */}
            {analysis && (
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle className="size-4 text-green-600" />
                      Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.strengths.map((strength, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="size-4 text-green-600 mt-0.5 shrink-0" />
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <AlertCircle className="size-4 text-yellow-600" />
                      Areas to Improve
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.weaknesses.map((weakness, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <AlertCircle className="size-4 text-yellow-600 mt-0.5 shrink-0" />
                          {weakness}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* AI Suggestions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="size-5" />
                      AI Suggestions
                    </CardTitle>
                    <CardDescription>
                      Powered by Gemini AI - improve your resume with these tips
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReanalyze}
                    disabled={analyzing || (quota?.minuteRemaining === 0)}
                  >
                    <RefreshCw className={`size-4 mr-2 ${analyzing ? "animate-spin" : ""}`} />
                    Re-analyze
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysis && analysis.suggestions.length > 0 ? (
                    analysis.suggestions.map((suggestion, i) => (
                      <div
                        key={i}
                        className={`p-4 rounded-lg border ${getPriorityColor(suggestion.priority)}`}
                      >
                        <div className="flex items-start gap-3">
                          {getPriorityIcon(suggestion.priority)}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{suggestion.section}</h4>
                              <Badge variant="outline" className="text-xs">{suggestion.priority}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {suggestion.suggestion}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : analyzing ? (
                    <div className="flex items-center justify-center py-8">
                      <Spinner className="size-6 mr-2" />
                      <span>Analyzing resume with Gemini AI...</span>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Lightbulb className="size-12 mx-auto mb-2 opacity-50" />
                      <p>Click &quot;Re-analyze&quot; to get AI-powered suggestions</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ContentLayout>
  );
}
