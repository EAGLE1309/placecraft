"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StudentProfile } from "@/types";
import {
  FileText,
  Upload,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Lightbulb,
  RefreshCw,
  HelpCircle,
  Sparkles,
  BookOpen,
  Target,
  Zap,
  GraduationCap,
  ArrowRight,
  PenTool
} from "lucide-react";
import Link from "next/link";

interface AnalysisResult {
  overallScore: number;
  atsScore: number;
  strengths: string[];
  weaknesses: string[];
  skills: string[];
  suggestions: {
    type: string;
    section: string;
    suggestion: string;
    priority: string;
  }[];
  learningSuggestions?: {
    skill: string;
    priority: string;
    learningType: string;
    estimatedTime: string;
    reason: string;
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
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(true);

  // Fetch persisted analysis on mount
  useEffect(() => {
    async function fetchStoredAnalysis() {
      if (!studentProfile?.id) {
        setLoadingAnalysis(false);
        return;
      }
      
      try {
        const res = await fetch(`/api/resume/analyze?studentId=${studentProfile.id}`);
        const data = await res.json();
        
        setQuota(data.quota);
        
        if (data.success && data.hasAnalysis) {
          setAnalysis(data.analysis);
          setAnalysisId(data.analysis.id);
        }
      } catch (err) {
        console.error("Failed to fetch stored analysis:", err);
      } finally {
        setLoadingAnalysis(false);
      }
    }
    
    fetchStoredAnalysis();
  }, [studentProfile?.id]);

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
      // Upload to Cloudflare R2 via API - now includes extraction + analysis
      const formData = new FormData();
      formData.append("file", file);
      formData.append("studentId", studentProfile.id);

      setAnalyzing(true); // Analysis happens during upload now
      
      const uploadRes = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        throw new Error(uploadData.error || "Failed to upload resume");
      }

      setUploading(false);
      setUploadProgress(0);

      // Check if analysis was included in upload response (new unified flow)
      if (uploadData.analysisStatus === "completed" && uploadData.analysis) {
        setAnalysis(uploadData.analysis);
        setAnalysisId(uploadData.analysisId);
        setQuota(uploadData.quota);
      } else if (uploadData.analysisStatus === "rate_limited") {
        setError(`Rate limit reached. Please try again in ${uploadData.retryAfter || 60} seconds.`);
        setQuota(uploadData.quota);
      } else if (uploadData.analysisStatus === "failed") {
        setError(uploadData.error || "Resume uploaded but analysis failed. You can try re-analyzing later.");
      }

      await refreshProfile();
    } catch (err) {
      console.error("Failed to upload resume:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to upload resume. Please try again.";

      // Provide helpful context based on error type
      if (errorMessage.includes("extract text") || errorMessage.includes("PDF")) {
        setError(`${errorMessage}\n\nTips:\n• Ensure your PDF contains selectable text (not just images)\n• Try re-saving your PDF from the original document\n• Avoid password-protected or encrypted PDFs`);
      } else if (errorMessage.includes("Rate limit") || errorMessage.includes("quota")) {
        setError(errorMessage);
      } else {
        setError(errorMessage);
      }
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
          studentId: studentProfile.id,
          forceReanalyze: true, // Force fresh analysis
        }),
      });

      if (!res.ok) {
        let errorMessage = "Failed to analyze resume. Please try again later.";

        try {
          const data = await res.json();
          if (res.status === 429) {
            errorMessage = `Rate limit reached. Please try again in ${data.retryAfter || 60} seconds.`;
            setQuota(data.quota);
          } else if (res.status === 400) {
            errorMessage = data.error || "Invalid resume file. Please ensure your PDF is readable.";
          } else if (res.status === 404) {
            errorMessage = data.error || "Resume file not found. Please try uploading again.";
          } else {
            errorMessage = data.error || errorMessage;
          }
        } catch {
          if (res.status === 404) {
            errorMessage = "API endpoint not found. Please check your configuration.";
          }
        }

        setError(errorMessage);
      } else {
        const data = await res.json();
        setAnalysis(data.analysis);
        setAnalysisId(data.analysisId);
        setQuota(data.quota);
        await refreshProfile();
      }
    } catch (err) {
      console.error("Failed to analyze resume:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to analyze resume";
      setError(errorMessage);
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

  // Beginner-friendly score explanations
  const getScoreExplanation = (score: number, type: "resume" | "ats") => {
    if (type === "resume") {
      if (score >= 80) return { emoji: "🎉", message: "Excellent! Your resume stands out from the crowd.", tip: "Keep it updated with new achievements!" };
      if (score >= 60) return { emoji: "👍", message: "Good start! A few tweaks can make it even better.", tip: "Focus on the high-priority suggestions below." };
      if (score >= 40) return { emoji: "💪", message: "You're on the right track. Let's improve together!", tip: "Add more projects and quantify your achievements." };
      return { emoji: "🚀", message: "Every expert was once a beginner. Let's build your resume!", tip: "Start with the basics: education, skills, and projects." };
    } else {
      if (score >= 80) return { emoji: "✅", message: "Great! Most company systems will read your resume correctly.", tip: "Your formatting is clean and professional." };
      if (score >= 60) return { emoji: "📝", message: "Good, but some systems might miss parts of your resume.", tip: "Use simple formatting and standard section headers." };
      return { emoji: "⚠️", message: "Some automated systems may struggle to read your resume.", tip: "Avoid tables, graphics, and fancy fonts." };
    }
  };

  // Get difficulty label for suggestions
  const getDifficultyLabel = (priority: string) => {
    switch (priority) {
      case "high": return { label: "Quick Win", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: <Zap className="size-3" /> };
      case "medium": return { label: "Medium Effort", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", icon: <Target className="size-3" /> };
      case "low": return { label: "Long-term Goal", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: <GraduationCap className="size-3" /> };
      default: return { label: "Suggestion", color: "bg-gray-100 text-gray-800", icon: <Lightbulb className="size-3" /> };
    }
  };


  return (
    <ContentLayout title="Resume">
      <div className="space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-red-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-red-800 dark:text-red-200 whitespace-pre-line">{error}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/40"
              >
                Dismiss
              </Button>
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
                {/* Finalized Resume Banner */}
                {studentProfile.finalResumeId && (
                  <div className="p-4 rounded-lg border-2 border-green-500 bg-green-50 dark:bg-green-900/20">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                        <CheckCircle className="size-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
                          Resume Finalized
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Active
                          </Badge>
                        </h4>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          This resume will be shown to recruiters when you apply for jobs
                        </p>
                      </div>
                      <Link href="/student/resume/history">
                        <Button variant="outline" size="sm" className="border-green-500 text-green-700 hover:bg-green-100 dark:hover:bg-green-900/50">
                          Manage Versions
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

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
            {/* Beginner-Friendly Score Cards */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="size-4" />
                      Resume Score
                    </CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="size-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>This score measures how well your resume presents your skills, experience, and achievements. Higher scores mean better chances of getting noticed!</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardHeader>
                <CardContent>
                  {analyzing ? (
                    <div className="flex items-center gap-2">
                      <Spinner className="size-4" />
                      <span className="text-muted-foreground">Analyzing with Gemini AI...</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{getScoreExplanation(studentProfile.resumeScore || 0, "resume").emoji}</span>
                        <div className="text-4xl font-bold">
                          {studentProfile.resumeScore || 0}
                          <span className="text-lg text-muted-foreground">/100</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                        <div
                          className={`h-3 rounded-full transition-all ${(studentProfile.resumeScore || 0) >= 80
                            ? "bg-green-500"
                            : (studentProfile.resumeScore || 0) >= 60
                              ? "bg-yellow-500"
                              : "bg-orange-500"
                            }`}
                          style={{ width: `${studentProfile.resumeScore || 0}%` }}
                        />
                      </div>
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          {getScoreExplanation(studentProfile.resumeScore || 0, "resume").message}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                          💡 {getScoreExplanation(studentProfile.resumeScore || 0, "resume").tip}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle className="size-4" />
                      ATS Compatibility
                    </CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="size-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p><strong>ATS = Applicant Tracking System</strong></p>
                          <p className="mt-1">Most companies use software to scan resumes before humans see them. This score shows if your resume can be read correctly by these systems.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardHeader>
                <CardContent>
                  {analyzing ? (
                    <div className="flex items-center gap-2">
                      <Spinner className="size-4" />
                      <span className="text-muted-foreground">Analyzing...</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{getScoreExplanation(studentProfile.atsScore || 0, "ats").emoji}</span>
                        <div className="text-4xl font-bold">
                          {studentProfile.atsScore || 0}
                          <span className="text-lg text-muted-foreground">%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                        <div
                          className={`h-3 rounded-full transition-all ${(studentProfile.atsScore || 0) >= 80
                            ? "bg-green-500"
                            : (studentProfile.atsScore || 0) >= 60
                              ? "bg-yellow-500"
                              : "bg-orange-500"
                            }`}
                          style={{ width: `${studentProfile.atsScore || 0}%` }}
                        />
                      </div>
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          {getScoreExplanation(studentProfile.atsScore || 0, "ats").message}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                          💡 {getScoreExplanation(studentProfile.atsScore || 0, "ats").tip}
                        </p>
                      </div>
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
                    <>
                      {analysis.suggestions.map((suggestion, i) => {
                        const difficulty = getDifficultyLabel(suggestion.priority);
                        return (
                          <div
                            key={i}
                            className={`p-4 rounded-lg border ${getPriorityColor(suggestion.priority)}`}
                          >
                            <div className="flex items-start gap-3">
                              {getPriorityIcon(suggestion.priority)}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h4 className="font-medium">{suggestion.section}</h4>
                                  <Badge className={`text-xs ${difficulty.color}`}>
                                    {difficulty.icon}
                                    <span className="ml-1">{difficulty.label}</span>
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {suggestion.suggestion}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Generate Improved Resume Button */}
                      <div className="pt-4 border-t">
                        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                          <div>
                            <h4 className="font-medium flex items-center gap-2">
                              <Sparkles className="size-4 text-purple-600" />
                              Want to improve your resume?
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Create a new version with live preview and download options
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" asChild>
                              <Link href="/student/resume/history">
                                View History
                              </Link>
                            </Button>
                            <Button asChild className="bg-purple-600 hover:bg-purple-700">
                              <Link href="/student/resume/improve">
                                <PenTool className="size-4 mr-2" />
                                Improve Resume
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </>
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

            {/* Learning Suggestions Link */}
            {analysis?.learningSuggestions && analysis.learningSuggestions.length > 0 && (
              <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                        <BookOpen className="size-6 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Skills to Learn</h3>
                        <p className="text-sm text-muted-foreground">
                          {analysis.learningSuggestions.length} personalized recommendations based on your resume
                        </p>
                      </div>
                    </div>
                    <Link href="/student/learning">
                      <Button variant="outline" className="border-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50">
                        View Learning Path
                        <ArrowRight className="size-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

      </div>
    </ContentLayout>
  );
}
