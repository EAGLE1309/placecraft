"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LearningChapter, LearningSubjectProgress, YouTubeVideo } from "@/types/learning";
import { StudentProfile } from "@/types";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  CheckCircle2,
  Play,
  FileText,
  Sparkles,
  AlertCircle,
  ExternalLink,
  Lightbulb,
  Target,
  Video,
  Youtube,
} from "lucide-react";
import Link from "next/link";

export default function ChapterPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const studentProfile = profile as StudentProfile | null;
  const subjectId = params.subjectId as string;
  const chapterId = params.chapterId as string;

  const [chapter, setChapter] = useState<LearningChapter | null>(null);
  const [progress, setProgress] = useState<LearningSubjectProgress | null>(null);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [totalChapters, setTotalChapters] = useState(0);

  // Fetch chapter data
  useEffect(() => {
    async function fetchChapter() {
      try {
        setLoading(true);
        setError(null);

        // Fetch chapter with content
        const response = await fetch(`/api/learning-system/chapters/${chapterId}`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to load chapter");
        }

        setChapter(data.chapter);

        // If notes are already cached, load them
        if (data.chapter.aiNotes) {
          setNotes(data.chapter.aiNotes);
        }

        // If videos are already cached, load them
        if (data.chapter.videos && data.chapter.videos.length > 0) {
          setVideos(data.chapter.videos);
        }

        // Fetch all chapters to get total count
        const chaptersResponse = await fetch(`/api/learning-system/chapters?subjectId=${subjectId}`);
        const chaptersData = await chaptersResponse.json();
        if (chaptersData.success && chaptersData.chapters) {
          setTotalChapters(chaptersData.chapters.length);
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
        console.error("Failed to fetch chapter:", err);
        setError(err instanceof Error ? err.message : "Failed to load chapter");
      } finally {
        setLoading(false);
      }
    }

    if (chapterId && subjectId) {
      fetchChapter();
    }
  }, [chapterId, subjectId, studentProfile?.id]);

  // Load videos
  const handleLoadVideos = useCallback(async () => {
    if (loadingVideos || videos.length > 0) return;

    try {
      setLoadingVideos(true);
      setError(null);

      const response = await fetch(`/api/learning-system/chapters/${chapterId}/videos`, {
        method: "POST",
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch videos");
      }

      setVideos(data.videos);
      if (data.fallbackUrl) {
        setFallbackUrl(data.fallbackUrl);
      }

      // Track video view
      if (studentProfile?.id) {
        await fetch("/api/learning-system/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: studentProfile.id,
            subjectId,
            chapterId,
            action: "track-videos",
          }),
        });
      }
    } catch (err) {
      console.error("Failed to load videos:", err);
      setError(err instanceof Error ? err.message : "Failed to load videos");
    } finally {
      setLoadingVideos(false);
    }
  }, [chapterId, subjectId, studentProfile?.id, loadingVideos, videos.length]);

  // Generate notes
  const handleGenerateNotes = useCallback(async () => {
    if (loadingNotes || notes) return;

    try {
      setLoadingNotes(true);
      setError(null);

      const response = await fetch(`/api/learning-system/chapters/${chapterId}/notes`, {
        method: "POST",
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to generate notes");
      }

      setNotes(data.notes);

      // Track notes view
      if (studentProfile?.id) {
        await fetch("/api/learning-system/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: studentProfile.id,
            subjectId,
            chapterId,
            action: "track-notes",
          }),
        });
      }
    } catch (err) {
      console.error("Failed to generate notes:", err);
      setError(err instanceof Error ? err.message : "Failed to generate notes");
    } finally {
      setLoadingNotes(false);
    }
  }, [chapterId, subjectId, studentProfile?.id, loadingNotes, notes]);

  // Mark chapter as complete/incomplete
  const handleToggleComplete = useCallback(async () => {
    if (markingComplete || !studentProfile?.id || totalChapters === 0) return;

    try {
      setMarkingComplete(true);
      const isCompleted = progress?.completedChapters.includes(chapterId);
      const action = isCompleted ? "uncomplete-chapter" : "complete-chapter";

      const response = await fetch("/api/learning-system/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentProfile.id,
          subjectId,
          chapterId,
          totalChapters,
          action,
        }),
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to update progress");
      }

      setProgress(data.progress);
    } catch (err) {
      console.error("Failed to toggle completion:", err);
      setError(err instanceof Error ? err.message : "Failed to update progress");
    } finally {
      setMarkingComplete(false);
    }
  }, [chapterId, subjectId, studentProfile?.id, progress, totalChapters, markingComplete]);

  // Auto-load videos when switching to videos tab
  useEffect(() => {
    if (activeTab === "videos" && videos.length === 0 && !loadingVideos) {
      handleLoadVideos();
    }
  }, [activeTab, videos.length, loadingVideos, handleLoadVideos]);

  const isCompleted = progress?.completedChapters.includes(chapterId) || false;

  if (loading) {
    return (
      <ContentLayout title="Loading...">
        <div className="flex items-center justify-center h-64">
          <Spinner className="size-8" />
        </div>
      </ContentLayout>
    );
  }

  if (error && !chapter) {
    return (
      <ContentLayout title="Error">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="size-16 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold mb-2">Failed to Load Chapter</h3>
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

  if (!chapter) {
    return (
      <ContentLayout title="Not Found">
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="size-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Chapter Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The chapter you&apos;re looking for doesn&apos;t exist.
            </p>
            <Link href={`/student/learning/${subjectId}`}>
              <Button>
                <ArrowLeft className="size-4 mr-2" />
                Back to Subject
              </Button>
            </Link>
          </CardContent>
        </Card>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title={chapter.title}>
      <div className="space-y-6">
        {/* Back Button */}
        <Link href={`/student/learning/${subjectId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4 mr-2" />
            Back to {chapter.subjectName}
          </Button>
        </Link>

        {/* Chapter Header */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Chapter {chapter.chapterNumber}</span>
                  <span>•</span>
                  <span>{chapter.subjectName}</span>
                </div>
                <CardTitle className="text-2xl">{chapter.title}</CardTitle>
                <CardDescription className="text-base">
                  {chapter.description}
                </CardDescription>
                <div className="flex items-center gap-2 pt-2">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {chapter.estimatedMinutes} min
                  </Badge>
                  {isCompleted && (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle2 className="size-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                </div>
              </div>

              {/* Complete Button */}
              <Button
                onClick={handleToggleComplete}
                disabled={markingComplete || !studentProfile}
                variant={isCompleted ? "outline" : "default"}
                className={isCompleted ? "border-green-500 text-green-600" : ""}
              >
                {markingComplete ? (
                  <Spinner className="size-4 mr-2" />
                ) : isCompleted ? (
                  <>
                    <CheckCircle2 className="size-4 mr-2" />
                    Completed
                  </>
                ) : (
                  <>
                    <Target className="size-4 mr-2" />
                    Mark Complete
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
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

        {/* Tabs */}
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BookOpen className="size-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <Video className="size-4" />
              Videos
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <FileText className="size-4" />
              AI Notes
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {chapter.overview ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="size-5 text-yellow-500" />
                    What You&apos;ll Learn
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {chapter.overview}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <Spinner className="size-8 mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading overview...</p>
                </CardContent>
              </Card>
            )}

            {/* Concepts */}
            {chapter.concepts && chapter.concepts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="size-5 text-blue-500" />
                    Key Concepts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {chapter.concepts.map((concept, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="size-4 mt-1 text-green-500 shrink-0" />
                        <span>{concept}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos" className="space-y-4">
            {loadingVideos ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Spinner className="size-8 mx-auto mb-4" />
                  <p className="text-muted-foreground">Finding the best videos for you...</p>
                </CardContent>
              </Card>
            ) : videos.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {videos.map((video) => (
                  <Card key={video.videoId} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <a
                      href={`https://www.youtube.com/watch?v=${video.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <div className="relative aspect-video">
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <Play className="size-16 text-white" />
                        </div>
                        {video.duration && (
                          <Badge className="absolute bottom-2 right-2 bg-black/80 text-white">
                            {video.duration}
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-medium line-clamp-2 mb-1">{video.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Youtube className="size-4 text-red-500" />
                          <span>{video.channelTitle}</span>
                          {video.viewCount && (
                            <>
                              <span>•</span>
                              <span>{video.viewCount}</span>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </a>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Video className="size-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Videos Found</h3>
                  <p className="text-muted-foreground mb-4">
                    We couldn&apos;t find curated videos for this topic.
                  </p>
                  {fallbackUrl && (
                    <a href={fallbackUrl} target="_blank" rel="noopener noreferrer">
                      <Button>
                        <ExternalLink className="size-4 mr-2" />
                        Search on YouTube
                      </Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* AI Notes Tab */}
          <TabsContent value="notes" className="space-y-4">
            {notes ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="size-5 text-purple-500" />
                    AI-Generated Study Notes
                  </CardTitle>
                  <CardDescription>
                    Personalized notes generated by AI to help you understand this chapter
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {notes}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="size-16 mx-auto mb-4 text-purple-500 opacity-70" />
                  <h3 className="text-lg font-semibold mb-2">Generate AI Study Notes</h3>
                  <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                    Click the button below to generate comprehensive study notes for this chapter using AI.
                  </p>
                  <Button
                    onClick={handleGenerateNotes}
                    disabled={loadingNotes}
                    size="lg"
                  >
                    {loadingNotes ? (
                      <>
                        <Spinner className="size-4 mr-2" />
                        Generating Notes...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4 mr-2" />
                        Generate Notes
                      </>
                    )}
                  </Button>
                  {loadingNotes && (
                    <p className="text-sm text-muted-foreground mt-3">
                      This may take a few seconds...
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ContentLayout>
  );
}
