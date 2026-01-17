"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLearningSuggestions, markSuggestionComplete } from "@/lib/firebase/firestore";
import { StudentProfile, LearningSuggestion } from "@/types";
import { LearningSubjectProgress, LearningSubject } from "@/types/learning";
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
  Play,
  Sparkles,
  FileText,
  Wrench,
} from "lucide-react";
import Link from "next/link";

export default function StudentLearningPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const studentProfile = profile as StudentProfile | null;

  const [suggestions, setSuggestions] = useState<LearningSuggestion[]>([]);
  const [learningProgress, setLearningProgress] = useState<LearningSubjectProgress[]>([]);
  const [customCourses, setCustomCourses] = useState<LearningSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [startingLearning, setStartingLearning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Custom course creation state
  const [createCourseOpen, setCreateCourseOpen] = useState(false);
  const [customTopic, setCustomTopic] = useState("");
  const [creatingCustomCourse, setCreatingCustomCourse] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!studentProfile) return;

      setError(null);
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

          // Fetch subject details for custom courses
          const subjectPromises = progressData.progressList.map(async (progress: LearningSubjectProgress) => {
            try {
              const subjectResponse = await fetch(
                `/api/learning-system/subjects?subjectId=${progress.subjectId}`
              );
              const subjectData = await subjectResponse.json();
              return subjectData.success ? subjectData.subject : null;
            } catch (err) {
              console.error(`Failed to fetch subject ${progress.subjectId}:`, err);
              return null;
            }
          });

          const subjects = await Promise.all(subjectPromises);
          const validSubjects = subjects.filter((s): s is LearningSubject => s !== null);
          setCustomCourses(validSubjects);
        }
      } catch (error) {
        console.error("Failed to fetch learning data:", error);
        setError(error instanceof Error ? error.message : "Failed to load learning data");
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
    setError(null);
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
      setError(error instanceof Error ? error.message : "Failed to start learning. Please try again.");
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

  // Handle creating a custom course
  const handleCreateCustomCourse = useCallback(async () => {
    if (!customTopic.trim() || creatingCustomCourse) return;

    setCreatingCustomCourse(true);
    setError(null);
    try {
      const response = await fetch("/api/learning-system/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillName: customTopic.trim(), learningType: "concept" }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to create course");
      }

      // Close dialog and navigate to the new course
      setCreateCourseOpen(false);
      setCustomTopic("");
      router.push(`/student/learning/${data.subject.id}`);
    } catch (error) {
      console.error("Failed to create custom course:", error);
      setError(error instanceof Error ? error.message : "Failed to create course. Please try again.");
    } finally {
      setCreatingCustomCourse(false);
    }
  }, [customTopic, creatingCustomCourse, router]);

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

  if (loading || !studentProfile) {
    return (
      <ContentLayout title="Learning">
        <div className="flex items-center justify-center h-64">
          <Spinner className="size-8" />
        </div>
      </ContentLayout>
    );
  }

  const pendingSuggestions = suggestions.filter(s => !s.completed);
  const completedSuggestions = suggestions.filter(s => s.completed);

  // Calculate stats including both suggestions and custom courses
  const completedSuggestionsCount = completedSuggestions.length;
  const completedCoursesCount = customCourses.filter(c => {
    const progress = learningProgress.find(p => p.subjectId === c.id);
    return progress?.progressPercentage === 100;
  }).length;
  const completedCount = completedSuggestionsCount + completedCoursesCount;

  const totalCount = suggestions.length + customCourses.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const inProgressSuggestionsCount = pendingSuggestions.filter(s => getSkillProgress(s.skill) && (getSkillProgress(s.skill)?.progressPercentage || 0) > 0).length;
  const inProgressCoursesCount = customCourses.filter(c => {
    const progress = learningProgress.find(p => p.subjectId === c.id);
    return progress && progress.progressPercentage > 0 && progress.progressPercentage < 100;
  }).length;
  const inProgressCount = inProgressSuggestionsCount + inProgressCoursesCount;

  const notStartedSuggestionsCount = pendingSuggestions.length - inProgressSuggestionsCount;
  const notStartedCoursesCount = customCourses.filter(c => {
    const progress = learningProgress.find(p => p.subjectId === c.id);
    return !progress || progress.progressPercentage === 0;
  }).length;
  const notStartedCount = notStartedSuggestionsCount + notStartedCoursesCount;

  return (
    <ContentLayout title="Learning">
      <div className="space-y-8 pb-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Learning Journey</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Master the skills you need for your dream career. We&apos;ve curated a personalized learning path based on your resume and market trends.
            </p>
          </div>
          <div className="flex gap-3">
            <Dialog open={createCourseOpen} onOpenChange={setCreateCourseOpen}>
              <DialogTrigger asChild>
                <Button className="bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md">
                  <Sparkles className="size-4 mr-2" />
                  Create Custom Course
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <GraduationCap className="size-5 text-blue-600" />
                    Create Your Own Course
                  </DialogTitle>
                  <DialogDescription>
                    Enter any topic you want to learn, and our AI will generate a comprehensive course with chapters, lessons, and study materials.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="topic">What do you want to learn?</Label>
                    <Input
                      id="topic"
                      placeholder="e.g., Machine Learning, GraphQL, Docker..."
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && customTopic.trim()) {
                          handleCreateCustomCourse();
                        }
                      }}
                      disabled={creatingCustomCourse}
                    />
                    <p className="text-xs text-muted-foreground">
                      Be specific for better results. For example, &quot;React Hooks&quot; instead of just &quot;React&quot;.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCreateCourseOpen(false);
                      setCustomTopic("");
                    }}
                    disabled={creatingCustomCourse}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateCustomCourse}
                    disabled={!customTopic.trim() || creatingCustomCourse}
                    className="bg-linear-to-r from-blue-600 to-purple-600"
                  >
                    {creatingCustomCourse ? (
                      <>
                        <Spinner className="size-4 mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4 mr-2" />
                        Generate Course
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {!studentProfile.resumeFileId && (
              <Link href="/student/resume">
                <Button variant="outline">
                  <BookOpen className="size-4 mr-2" />
                  Upload Resume
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
            <div className="h-5 w-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-red-600 text-xs font-bold">!</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-200 text-sm">Error Loading Content</h3>
              <p className="text-sm text-red-800 dark:text-red-300 mt-1">{error}</p>
              <Button variant="link" size="sm" className="h-auto p-0 text-red-800 dark:text-red-300 mt-2" onClick={() => window.location.reload()}>
                Try again
              </Button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-linear-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-background border-blue-100 dark:border-blue-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Progress</p>
                  <h3 className="text-2xl font-bold mt-1 text-blue-700 dark:text-blue-400">{progressPercent}%</h3>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <TrendingUp className="size-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="mt-4 h-2 w-full bg-blue-100 dark:bg-blue-900/30 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-linear-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-background border-purple-100 dark:border-purple-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Skills</p>
                  <h3 className="text-2xl font-bold mt-1 text-purple-700 dark:text-purple-400">{inProgressCount}</h3>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                  <Clock className="size-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                {notStartedCount} skills waiting to start
              </p>
            </CardContent>
          </Card>

          <Card className="bg-linear-to-br from-green-50 to-white dark:from-green-900/20 dark:to-background border-green-100 dark:border-green-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <h3 className="text-2xl font-bold mt-1 text-green-700 dark:text-green-400">{completedCount}</h3>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                  <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Keep up the momentum!
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Empty State */}
        {suggestions.length === 0 && customCourses.length === 0 && (
          <Card className="border-dashed border-2">
            <CardContent className="py-16 text-center">
              <div className="h-20 w-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lightbulb className="size-10 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Your Learning Path is Empty</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                We can&apos;t recommend skills without your resume. Upload it to get personalized suggestions, or start a custom course manually.
              </p>
              <div className="flex justify-center gap-4">
                <Link href="/student/resume">
                  <Button size="lg" className="px-8">
                    <BookOpen className="size-4 mr-2" />
                    Upload Resume
                  </Button>
                </Link>
                <Button variant="outline" size="lg" onClick={() => setCreateCourseOpen(true)}>
                  <Sparkles className="size-4 mr-2" />
                  Create Custom Course
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* My Courses (Custom Courses) */}
        {customCourses.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <BookOpen className="size-5 text-indigo-600" />
                My Courses
              </h2>
              <p className="text-sm text-muted-foreground">
                {customCourses.length} {customCourses.length === 1 ? 'course' : 'courses'}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
              {customCourses.map((course) => {
                const progress = learningProgress.find(p => p.subjectId === course.id);
                const progressPercent = progress?.progressPercentage || 0;

                return (
                  <Card key={course.id} className="group hover:shadow-lg transition-all duration-300 flex flex-col h-full border-indigo-200 dark:border-indigo-900 bg-linear-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-background">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                          <GraduationCap className="size-3.5 mr-1" />
                          Custom Course
                        </Badge>
                        {course.difficulty && (
                          <Badge className={course.difficulty === 'beginner' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : course.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}>
                            {course.difficulty}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-xl leading-tight group-hover:text-indigo-600 transition-colors">
                        {course.displayName}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col gap-4">
                      <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                        {course.description}
                      </p>

                      {progressPercent > 0 && (
                        <div className="space-y-2 bg-indigo-50 dark:bg-indigo-900/10 p-3 rounded-lg">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-indigo-700 dark:text-indigo-300">Progress</span>
                            <span className="text-indigo-700 dark:text-indigo-300">{progressPercent}%</span>
                          </div>
                          <div className="h-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${progressPercent}%` }} />
                          </div>
                        </div>
                      )}

                      {course.estimatedHours && (
                        <div className="flex items-center text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                          <Clock className="size-3.5 mr-1.5" />
                          Est. {course.estimatedHours} hours
                        </div>
                      )}

                      <Button
                        onClick={() => router.push(`/student/learning/${course.id}`)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                      >
                        {progressPercent > 0 ? (
                          <>
                            <Play className="size-4 mr-2 fill-current" />
                            Continue Learning
                          </>
                        ) : (
                          <>
                            <BookOpen className="size-4 mr-2" />
                            Start Course
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Pending Suggestions */}
        {pendingSuggestions.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Target className="size-5 text-blue-600" />
                Recommended for You
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
              {pendingSuggestions.map((suggestion) => {
                const progress = getSkillProgress(suggestion.skill);
                const isStarted = progress && progress.progressPercentage > 0;

                return (
                  <Card key={suggestion.id} className="group hover:shadow-lg transition-all duration-300 flex flex-col h-full border-muted/60">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200">
                          {getLearningTypeIcon(suggestion.learningType)}
                          <span className="ml-1.5">{getLearningTypeLabel(suggestion.learningType)}</span>
                        </Badge>
                        <Badge className={getPriorityColor(suggestion.priority)}>
                          {suggestion.priority}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl leading-tight group-hover:text-blue-600 transition-colors">
                        {suggestion.skill}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col gap-4">
                      <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
                        {suggestion.reason}
                      </p>

                      {isStarted ? (
                        <div className="space-y-2 bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-blue-700 dark:text-blue-300">In Progress</span>
                            <span className="text-blue-700 dark:text-blue-300">{progress.progressPercentage}%</span>
                          </div>
                          <div className="h-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${progress.progressPercentage}%` }} />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                          <Clock className="size-3.5 mr-1.5" />
                          Est. {suggestion.estimatedTime}
                        </div>
                      )}

                      <Button
                        onClick={() => handleStartLearning(suggestion.skill, suggestion.learningType)}
                        disabled={startingLearning === suggestion.skill}
                        className={`w-full ${isStarted ? "bg-blue-600 hover:bg-blue-700" : "bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 hover:border-blue-300 dark:bg-transparent dark:border-blue-800 dark:hover:bg-blue-900/20"}`}
                        variant={isStarted ? "default" : "outline"}
                      >
                        {startingLearning === suggestion.skill ? (
                          <>
                            <Spinner className="size-4 mr-2" />
                            {isStarted ? "Resuming..." : "Starting..."}
                          </>
                        ) : isStarted ? (
                          <>
                            <Play className="size-4 mr-2 fill-current" />
                            Continue Learning
                          </>
                        ) : (
                          <>
                            <Sparkles className="size-4 mr-2" />
                            Start Learning
                          </>
                        )}
                      </Button>

                      {/* Secondary Actions Row */}
                      <div className="flex items-center justify-between pt-2 border-t border-dashed">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-muted-foreground hover:text-foreground text-xs"
                          onClick={() => window.open(getResourceSuggestions(suggestion.skill, suggestion.learningType)[0]?.url, '_blank')}
                        >
                          <ExternalLink className="size-3 mr-1.5" />
                          Resources
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkComplete(suggestion.id)}
                          disabled={completing === suggestion.id}
                          className="h-8 px-2 text-muted-foreground hover:text-green-600 text-xs"
                        >
                          {completing === suggestion.id ? (
                            <Spinner className="size-3" />
                          ) : (
                            <>
                              <CheckCircle2 className="size-3 mr-1.5" />
                              Mark Done
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed Skills */}
        {completedSuggestions.length > 0 && (
          <div className="space-y-6 pt-8 border-t">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="size-5" />
              Completed Skills
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 opacity-75 hover:opacity-100 transition-opacity">
              {completedSuggestions.map((suggestion) => (
                <Card key={suggestion.id} className="bg-muted/30 border-muted">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg line-through decoration-muted-foreground/50 text-muted-foreground">
                        {suggestion.skill}
                      </CardTitle>
                      <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900">
                        Completed
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {suggestion.reason}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Pro Tips */}
        <Card className="bg-linear-to-r from-indigo-50 via-white to-blue-50 dark:from-indigo-950/40 dark:via-background dark:to-blue-950/40 border-indigo-100 dark:border-indigo-900">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row">
              <div className="p-6 md:w-1/3 border-b md:border-b-0 md:border-r border-indigo-100 dark:border-indigo-900">
                <div className="h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mb-4">
                  <Lightbulb className="size-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100">Pro Tips for Success</h3>
                <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-2">
                  Maximize your learning efficiency with these proven strategies.
                </p>
              </div>
              <div className="p-6 md:w-2/3">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 bg-white dark:bg-indigo-950 p-1 rounded-full shadow-sm">
                      <Target className="size-3 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-indigo-900 dark:text-indigo-200">Prioritize High Impact</p>
                      <p className="text-xs text-indigo-600/80 dark:text-indigo-400/80">Focus on &quot;High&quot; priority skills first as they match job requirements.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 bg-white dark:bg-indigo-950 p-1 rounded-full shadow-sm">
                      <Code className="size-3 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-indigo-900 dark:text-indigo-200">Build to Learn</p>
                      <p className="text-xs text-indigo-600/80 dark:text-indigo-400/80">Apply concepts immediately by building small projects.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 bg-white dark:bg-indigo-950 p-1 rounded-full shadow-sm">
                      <TrendingUp className="size-3 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-indigo-900 dark:text-indigo-200">Consistent Practice</p>
                      <p className="text-xs text-indigo-600/80 dark:text-indigo-400/80">30 mins daily is better than a 5-hour binge on weekends.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 bg-white dark:bg-indigo-950 p-1 rounded-full shadow-sm">
                      <FileText className="size-3 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-indigo-900 dark:text-indigo-200">Update Resume</p>
                      <p className="text-xs text-indigo-600/80 dark:text-indigo-400/80">Re-upload your resume after learning to get new suggestions.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}
