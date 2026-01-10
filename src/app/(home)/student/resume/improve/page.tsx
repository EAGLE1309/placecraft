"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { StudentProfile } from "@/types";
import {
  ArrowLeft,
  Download,
  CheckCircle,
  Sparkles,
  AlertCircle,
  Wand2,
  FileText,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface StoredAnalysis {
  id: string;
  overallScore: number;
  atsScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: Array<{
    id: string;
    type: string;
    section: string;
    suggestion: string;
    priority: string;
  }>;
  extractedData: {
    personalInfo: Record<string, string | undefined>;
    education: Array<Record<string, unknown>>;
    experience: Array<Record<string, unknown>>;
    projects: Array<Record<string, unknown>>;
    skills: string[];
  };
}

interface ImprovedResult {
  pdfUrl: string;
  improvementSummary: string[];
  estimatedScore: number;
  originalScore: number;
}

export default function ResumeImprovePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const studentProfile = profile as StudentProfile | null;

  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<StoredAnalysis | null>(null);
  const [improving, setImproving] = useState(false);
  const [improvedResult, setImprovedResult] = useState<ImprovedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch stored analysis on mount
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

  const handleImproveResume = async () => {
    if (!studentProfile || !analysis) return;

    setImproving(true);
    setError(null);

    try {
      const res = await fetch("/api/resume/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentProfile.id,
          analysisId: analysis.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setError(`Rate limit reached. Please try again in ${data.retryAfter || 60} seconds.`);
        } else {
          setError(data.error || "Failed to improve resume.");
        }
        return;
      }

      setImprovedResult({
        pdfUrl: data.pdfUrl,
        improvementSummary: data.improvementSummary,
        estimatedScore: data.estimatedScore,
        originalScore: data.originalScore,
      });
    } catch (err) {
      console.error("Failed to improve resume:", err);
      setError(err instanceof Error ? err.message : "Failed to improve resume.");
    } finally {
      setImproving(false);
    }
  };

  if (!studentProfile) {
    return (
      <ContentLayout title="Improve Resume">
        <div className="flex items-center justify-center h-64">
          <Spinner className="size-8" />
        </div>
      </ContentLayout>
    );
  }

  if (loading) {
    return (
      <ContentLayout title="Improve Resume">
        <div className="flex items-center justify-center h-64">
          <Spinner className="size-8" />
          <span className="ml-3">Loading your resume analysis...</span>
        </div>
      </ContentLayout>
    );
  }

  // No analysis found - prompt user to upload/analyze first
  if (!analysis) {
    return (
      <ContentLayout title="Improve Resume">
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
                  Please upload and analyze your resume first before improving it.
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

  // Show improved result
  if (improvedResult) {
    return (
      <ContentLayout title="Improved Resume">
        <div className="space-y-6">
          <Button variant="ghost" asChild>
            <Link href="/student/resume">
              <ArrowLeft className="size-4 mr-2" />
              Back to Resume
            </Link>
          </Button>

          <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <CheckCircle className="size-6" />
                Resume Improved Successfully!
              </CardTitle>
              <CardDescription>
                Your resume has been enhanced using AI based on the analysis suggestions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Original Score</p>
                  <p className="text-3xl font-bold">{improvedResult.originalScore}</p>
                </div>
                <TrendingUp className="size-8 text-green-600" />
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Estimated New Score</p>
                  <p className="text-3xl font-bold text-green-600">{improvedResult.estimatedScore}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Improvements Made:</h4>
                <ul className="space-y-2">
                  {improvedResult.improvementSummary.map((improvement, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="size-4 text-green-600 mt-0.5 shrink-0" />
                      {improvement}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-3">
                <Button asChild>
                  <a href={improvedResult.pdfUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="size-4 mr-2" />
                    Download Improved Resume
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href={improvedResult.pdfUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4 mr-2" />
                    View PDF
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/student/resume/history">
                    View Resume History
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ContentLayout>
    );
  }

  // Main improve view - show analysis and improve button
  return (
    <ContentLayout title="Improve Resume">
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
              <Wand2 className="size-5 text-purple-600" />
              AI Resume Improvement
            </CardTitle>
            <CardDescription>
              Our AI will enhance your resume based on the analysis suggestions, improving content, 
              adding action verbs, and optimizing for ATS systems.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Current Resume Score</h4>
                <p className="text-3xl font-bold">{analysis.overallScore}/100</p>
                <p className="text-sm text-muted-foreground mt-1">ATS: {analysis.atsScore}%</p>
              </div>
              <div className="p-4 border rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <h4 className="font-medium mb-2">After Improvement</h4>
                <p className="text-3xl font-bold text-purple-600">~{Math.min(100, analysis.overallScore + 15)}/100</p>
                <p className="text-sm text-muted-foreground mt-1">Estimated improvement</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Suggestions to Apply ({analysis.suggestions.length}):</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {analysis.suggestions.slice(0, 5).map((suggestion, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <Badge variant={suggestion.priority === "high" ? "destructive" : "secondary"} className="shrink-0">
                      {suggestion.priority}
                    </Badge>
                    <span><strong>{suggestion.section}:</strong> {suggestion.suggestion}</span>
                  </div>
                ))}
                {analysis.suggestions.length > 5 && (
                  <p className="text-sm text-muted-foreground">+{analysis.suggestions.length - 5} more suggestions</p>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Extracted Resume Data:</h4>
              <div className="grid gap-2 md:grid-cols-4 text-sm">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded text-center">
                  <p className="text-2xl font-bold">{analysis.extractedData.skills.length}</p>
                  <p className="text-muted-foreground">Skills</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded text-center">
                  <p className="text-2xl font-bold">{analysis.extractedData.experience.length}</p>
                  <p className="text-muted-foreground">Experiences</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded text-center">
                  <p className="text-2xl font-bold">{analysis.extractedData.education.length}</p>
                  <p className="text-muted-foreground">Education</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded text-center">
                  <p className="text-2xl font-bold">{analysis.extractedData.projects.length}</p>
                  <p className="text-muted-foreground">Projects</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button 
                onClick={handleImproveResume} 
                disabled={improving}
                className="w-full bg-purple-600 hover:bg-purple-700"
                size="lg"
              >
                {improving ? (
                  <>
                    <Spinner className="size-4 mr-2" />
                    Improving Resume with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 mr-2" />
                    Generate Improved Resume
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                This will create a new PDF with improved content based on AI suggestions
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}
