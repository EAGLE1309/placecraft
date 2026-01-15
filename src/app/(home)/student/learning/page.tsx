"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { getLearningSuggestions, markSuggestionComplete } from "@/lib/firebase/firestore";
import { StudentProfile, LearningSuggestion } from "@/types";
import { LearningSubjectProgress } from "@/types/learning";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Target,
  TrendingUp,
  Lightbulb,
  ExternalLink,
  GraduationCap,
  Code,
  Wrench,
  Play,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export default function StudentLearningPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const studentProfile = profile as StudentProfile | null;

  const [suggestions, setSuggestions] = useState<LearningSuggestion[]>([]);
  const [learningProgress, setLearningProgress] = useState<LearningSubjectProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [startingLearning, setStartingLearning] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!studentProfile) return;

      try {
        // Fetch learning suggestions
        const data = await getLearningSuggestions(studentProfile.id);
        setSuggestions(data);

        // Fetch learning progress
        const progressResponse = await fetch(
          `/api/learning-system/progress?studentId=${studentProfile.id}`
        );
        const progressData = await progressResponse.json();
        if (progressData.success && progressData.progressList) {
          setLearningProgress(progressData.progressList);
        }
      } catch (error) {
        console.error("Failed to fetch learning data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [studentProfile]);

  // Handle starting learning for a skill
  const handleStartLearning = useCallback(async (skill: string, learningType: string) => {
    if (startingLearning) return; // Prevent double-click

    setStartingLearning(skill);
    try {
      // Create/get subject with roadmap
      const response = await fetch("/api/learning-system/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillName: skill, learningType }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to create subject");
      }

      // Navigate to subject page
      router.push(`/student/learning/${data.subject.id}`);
    } catch (error) {
      console.error("Failed to start learning:", error);
      setStartingLearning(null);
    }
  }, [router, startingLearning]);

  // Check if a skill has learning progress
  const getSkillProgress = (skillName: string): LearningSubjectProgress | undefined => {
    return learningProgress.find(
      (p) => p.subjectName.toLowerCase() === skillName.toLowerCase()
    );
  };

  const handleMarkComplete = async (id: string) => {
    setCompleting(id);
    try {
      await markSuggestionComplete(id);
      setSuggestions(suggestions.map(s =>
        s.id === id ? { ...s, completed: true } : s
      ));
    } catch (error) {
      console.error("Failed to mark as complete:", error);
    } finally {
      setCompleting(null);
    }
  };

  if (loading || !studentProfile) {
    return (
      <ContentLayout title="Learning">
        <div className="flex items-center justify-center h-64">
          <Spinner className="size-8" />
        </div>
      </ContentLayout>
    );
  }

  const completedCount = suggestions.filter(s => s.completed).length;
  const totalCount = suggestions.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "low": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getLearningTypeIcon = (type: string) => {
    switch (type) {
      case "concept": return <GraduationCap className="size-4" />;
      case "tool": return <Wrench className="size-4" />;
      case "practice": return <Code className="size-4" />;
      default: return <BookOpen className="size-4" />;
    }
  };

  const getLearningTypeLabel = (type: string) => {
    switch (type) {
      case "concept": return "Learn the Concept";
      case "tool": return "Master the Tool";
      case "practice": return "Practice & Build";
      default: return "Learn";
    }
  };

  const getResourceSuggestions = (skill: string, type: string) => {
    const resources = [];
    if (type === "concept" || type === "tool") {
      resources.push({
        title: `Learn ${skill} - YouTube`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(skill + " tutorial for beginners")}`,
        type: "video"
      });
      resources.push({
        title: `${skill} Documentation`,
        url: `https://www.google.com/search?q=${encodeURIComponent(skill + " official documentation")}`,
        type: "documentation"
      });
    }

    if (type === "practice") {
      resources.push({
        title: `Practice ${skill} - LeetCode`,
        url: `https://leetcode.com/problemset/all/?search=${encodeURIComponent(skill)}`,
        type: "practice"
      });
    }

    resources.push({
      title: `${skill} Courses - Coursera`,
      url: `https://www.coursera.org/search?query=${encodeURIComponent(skill)}`,
      type: "course"
    });

    return resources;
  };

  const pendingSuggestions = suggestions.filter(s => !s.completed);
  const completedSuggestions = suggestions.filter(s => s.completed);

  return (
    <ContentLayout title="Learning">
      <div className="space-y-6">
        {/* Header with Progress */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="size-6 text-blue-600" />
              Your Learning Journey
            </h1>
            <p className="text-muted-foreground mt-1">
              Personalized skill recommendations based on your resume analysis
            </p>
          </div>
          {!studentProfile.resumeFileId && (
            <Link href="/student/resume">
              <Button>
                <BookOpen className="size-4 mr-2" />
                Upload Resume for Recommendations
              </Button>
            </Link>
          )}
        </div>

        {/* Progress Overview */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Target className="size-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Learning Progress</h3>
                  <p className="text-sm text-muted-foreground">
                    {completedCount} of {totalCount} skills completed
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-blue-600">{progressPercent}%</span>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {progressPercent === 100 && totalCount > 0 && (
              <p className="text-sm text-green-600 mt-3 flex items-center gap-2">
                <CheckCircle2 className="size-4" />
                Amazing! You&apos;ve completed all your learning goals!
              </p>
            )}
          </CardContent>
        </Card>

        {/* No Suggestions State */}
        {suggestions.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Lightbulb className="size-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Learning Suggestions Yet</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Upload your resume and get it analyzed by our AI to receive personalized
                skill recommendations tailored to your career goals.
              </p>
              <Link href="/student/resume">
                <Button>
                  <BookOpen className="size-4 mr-2" />
                  Go to Resume Section
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Pending Skills */}
        {pendingSuggestions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="size-5 text-yellow-600" />
              Skills to Learn ({pendingSuggestions.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingSuggestions.map((suggestion) => (
                <Card key={suggestion.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getLearningTypeIcon(suggestion.learningType)}
                        <Badge variant="outline" className="text-xs">
                          {getLearningTypeLabel(suggestion.learningType)}
                        </Badge>
                      </div>
                      <Badge className={getPriorityColor(suggestion.priority)}>
                        {suggestion.priority}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mt-2">{suggestion.skill}</CardTitle>
                    <CardDescription>{suggestion.reason}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="size-4" />
                      <span>Estimated: {suggestion.estimatedTime}</span>
                    </div>

                    {/* Progress indicator if learning has started */}
                    {(() => {
                      const progress = getSkillProgress(suggestion.skill);
                      if (progress && progress.progressPercentage > 0) {
                        return (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium text-blue-600">{progress.progressPercentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress.progressPercentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Start Learning Button */}
                    <Button
                      onClick={() => handleStartLearning(suggestion.skill, suggestion.learningType)}
                      disabled={startingLearning === suggestion.skill}
                      className="w-full"
                    >
                      {startingLearning === suggestion.skill ? (
                        <>
                          <Spinner className="size-4 mr-2" />
                          Starting...
                        </>
                      ) : getSkillProgress(suggestion.skill) ? (
                        <>
                          <ChevronRight className="size-4 mr-2" />
                          Continue Learning
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-4 mr-2" />
                          Start Learning
                        </>
                      )}
                    </Button>

                    {/* External Resources (collapsed) */}
                    <div className="space-y-2 pt-2 border-t">
                      <p className="text-xs font-medium text-muted-foreground">External Resources:</p>
                      <div className="space-y-1">
                        {getResourceSuggestions(suggestion.skill, suggestion.learningType).slice(0, 2).map((resource, idx) => (
                          <a
                            key={idx}
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs text-blue-600 hover:underline"
                          >
                            <ExternalLink className="size-3" />
                            {resource.title}
                          </a>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={() => handleMarkComplete(suggestion.id)}
                      disabled={completing === suggestion.id}
                      className="w-full"
                      variant="outline"
                      size="sm"
                    >
                      {completing === suggestion.id ? (
                        <Spinner className="size-4" />
                      ) : (
                        <>
                          <CheckCircle2 className="size-4 mr-2" />
                          Mark as Learned
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Completed Skills */}
        {completedSuggestions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle2 className="size-5 text-green-600" />
              Completed ({completedSuggestions.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedSuggestions.map((suggestion) => (
                <Card key={suggestion.id} className="bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CheckCircle2 className="size-5 text-green-600" />
                        {suggestion.skill}
                      </CardTitle>
                    </div>
                    <CardDescription>{suggestion.reason}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Great job! You&apos;ve learned this skill.
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Tips Section */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="size-5 text-yellow-500" />
              Pro Tips for Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Play className="size-4 mt-0.5 text-blue-600" />
                <span><strong>Start with high-priority skills</strong> - These are most in-demand by recruiters</span>
              </li>
              <li className="flex items-start gap-2">
                <Play className="size-4 mt-0.5 text-blue-600" />
                <span><strong>Build projects</strong> - Apply what you learn in real projects to add to your resume</span>
              </li>
              <li className="flex items-start gap-2">
                <Play className="size-4 mt-0.5 text-blue-600" />
                <span><strong>Update your resume</strong> - After learning new skills, re-upload your resume for fresh analysis</span>
              </li>
              <li className="flex items-start gap-2">
                <Play className="size-4 mt-0.5 text-blue-600" />
                <span><strong>Practice consistently</strong> - 30 minutes daily is better than 5 hours once a week</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}
