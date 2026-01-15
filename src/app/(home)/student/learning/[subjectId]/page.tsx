"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";
import { LearningSubject, LearningChapter, LearningSubjectProgress } from "@/types/learning";
import { StudentProfile } from "@/types";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  GraduationCap,
  Layers,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

export default function SubjectPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const studentProfile = profile as StudentProfile | null;
  const subjectId = params.subjectId as string;

  const [subject, setSubject] = useState<LearningSubject | null>(null);
  const [chapters, setChapters] = useState<LearningChapter[]>([]);
  const [progress, setProgress] = useState<LearningSubjectProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch subject data
  useEffect(() => {
    async function fetchSubject() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/learning-system/subjects?subjectId=${subjectId}`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to load subject");
        }

        setSubject(data.subject);

        // Fetch existing chapters (if any)
        const chaptersResponse = await fetch(`/api/learning-system/chapters?subjectId=${subjectId}`);
        const chaptersData = await chaptersResponse.json();

        if (chaptersData.success && chaptersData.chapters) {
          setChapters(chaptersData.chapters);
        }

        // Fetch progress if student is logged in
        if (studentProfile?.id) {
          const progressResponse = await fetch(
            `/api/learning-system/progress?studentId=${studentProfile.id}&subjectId=${subjectId}`
          );
          const progressData = await progressResponse.json();
          if (progressData.success && progressData.progress) {
            setProgress(progressData.progress);
          }
        }
      } catch (err) {
        console.error("Failed to fetch subject:", err);
        setError(err instanceof Error ? err.message : "Failed to load subject");
      } finally {
        setLoading(false);
      }
    }

    if (subjectId) {
      fetchSubject();
    }
  }, [subjectId, studentProfile?.id]);

  // Load/Generate chapters
  const handleLoadChapters = useCallback(async () => {
    if (isGenerating || loadingChapters) return; // Prevent double-click

    try {
      setLoadingChapters(true);
      setIsGenerating(true);
      setError(null);

      const response = await fetch("/api/learning-system/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to generate chapters");
      }

      setChapters(data.chapters);

      // Start learning progress if not already started
      if (studentProfile?.id && subject && !progress) {
        await fetch("/api/learning-system/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: studentProfile.id,
            subjectId,
            subjectName: subject.displayName,
            action: "start",
          }),
        });
      }
    } catch (err) {
      console.error("Failed to load chapters:", err);
      setError(err instanceof Error ? err.message : "Failed to load chapters");
    } finally {
      setLoadingChapters(false);
      setIsGenerating(false);
    }
  }, [subjectId, studentProfile?.id, subject, progress, isGenerating, loadingChapters]);

  // Get difficulty badge color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "advanced":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Check if chapter is completed
  const isChapterCompleted = (chapterId: string) => {
    return progress?.completedChapters.includes(chapterId) || false;
  };

  if (loading) {
    return (
      <ContentLayout title="Loading...">
        <div className="flex items-center justify-center h-64">
          <Spinner className="size-8" />
        </div>
      </ContentLayout>
    );
  }

  if (error && !subject) {
    return (
      <ContentLayout title="Error">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="size-16 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold mb-2">Failed to Load Subject</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="size-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </ContentLayout>
    );
  }

  if (!subject) {
    return (
      <ContentLayout title="Not Found">
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="size-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Subject Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The subject you&apos;re looking for doesn&apos;t exist.
            </p>
            <Link href="/student/learning">
              <Button>
                <ArrowLeft className="size-4 mr-2" />
                Back to Learning
              </Button>
            </Link>
          </CardContent>
        </Card>
      </ContentLayout>
    );
  }

  const completedCount = progress?.completedChapters.length || 0;
  const totalChapters = chapters.length;
  const progressPercent = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;

  return (
    <ContentLayout title={subject.displayName}>
      <div className="space-y-6">
        {/* Back Button */}
        <Link href="/student/learning">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4 mr-2" />
            Back to Learning
          </Button>
        </Link>

        {/* Subject Header */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <GraduationCap className="size-6 text-blue-600" />
                  <CardTitle className="text-2xl">{subject.displayName}</CardTitle>
                </div>
                <CardDescription className="text-base">
                  {subject.description}
                </CardDescription>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Badge className={getDifficultyColor(subject.difficulty)}>
                    {subject.difficulty.charAt(0).toUpperCase() + subject.difficulty.slice(1)}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {subject.estimatedHours} hours
                  </Badge>
                  {subject.chapterCount > 0 && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Layers className="size-3" />
                      {subject.chapterCount} chapters
                    </Badge>
                  )}
                </div>
              </div>

              {/* Progress Circle (if started) */}
              {progress && totalChapters > 0 && (
                <div className="flex flex-col items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{progressPercent}%</div>
                  <div className="text-sm text-muted-foreground">
                    {completedCount}/{totalChapters} completed
                  </div>
                </div>
              )}
            </div>
          </CardHeader>

          {/* Roadmap Section */}
          {subject.roadmap && (
            <CardContent className="pt-0">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Sparkles className="size-4 text-yellow-500" />
                  Learning Roadmap
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {subject.roadmap}
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="size-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Load Chapters Button (if not loaded) */}
        {chapters.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <Layers className="size-12 mx-auto mb-4 text-blue-600" />
              <h3 className="text-lg font-semibold mb-2">Ready to Start Learning?</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Click the button below to generate a structured learning path with chapters
                tailored to help you master {subject.displayName}.
              </p>
              <Button
                onClick={handleLoadChapters}
                disabled={loadingChapters || isGenerating}
                size="lg"
              >
                {loadingChapters ? (
                  <>
                    <Spinner className="size-4 mr-2" />
                    Generating Chapters...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 mr-2" />
                    Load Chapters
                  </>
                )}
              </Button>
              {loadingChapters && (
                <p className="text-sm text-muted-foreground mt-3">
                  This may take a few seconds as we create your personalized learning path...
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Chapters List */}
        {chapters.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Layers className="size-5 text-blue-600" />
                Chapters ({chapters.length})
              </h2>
              {progress && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Progress value={progressPercent} className="w-24 h-2" />
                  <span>{progressPercent}% complete</span>
                </div>
              )}
            </div>

            <div className="grid gap-3">
              {chapters.map((chapter, index) => {
                const isCompleted = isChapterCompleted(chapter.id);
                return (
                  <Link
                    key={chapter.id}
                    href={`/student/learning/${subjectId}/${chapter.id}`}
                  >
                    <Card className={`hover:shadow-md transition-all cursor-pointer ${
                      isCompleted 
                        ? "bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800" 
                        : "hover:border-blue-200 dark:hover:border-blue-800"
                    }`}>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                              isCompleted
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            }`}>
                              {isCompleted ? (
                                <CheckCircle2 className="size-5" />
                              ) : (
                                chapter.chapterNumber
                              )}
                            </div>
                            <div>
                              <h3 className="font-medium">{chapter.title}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {chapter.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {chapter.estimatedMinutes} min
                            </Badge>
                            <ChevronRight className="size-5 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Refresh Button (for regenerating chapters if needed) */}
        {chapters.length > 0 && (
          <div className="text-center pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLoadChapters}
              disabled={loadingChapters}
              className="text-muted-foreground"
            >
              {loadingChapters ? (
                <Spinner className="size-4 mr-2" />
              ) : (
                <RefreshCw className="size-4 mr-2" />
              )}
              Refresh Chapters
            </Button>
          </div>
        )}
      </div>
    </ContentLayout>
  );
}
