"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { StudentProfile, ResumeHistory } from "@/types";
import {
  ArrowLeft,
  FileText,
  Download,
  CheckCircle,
  Clock,
  Star,
  ExternalLink,
  AlertCircle,
  Trash2,
} from "lucide-react";
import Link from "next/link";

export default function ResumeHistoryPage() {
  const { profile } = useAuth();
  const studentProfile = profile as StudentProfile | null;

  const [history, setHistory] = useState<ResumeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingFinal, setSettingFinal] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (studentProfile) {
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentProfile]);

  const loadHistory = async () => {
    if (!studentProfile) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/resume/history?studentId=${studentProfile.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load resume history");
      }

      setHistory(data.history);
    } catch (err) {
      console.error("Failed to load history:", err);
      setError(err instanceof Error ? err.message : "Failed to load resume history");
    } finally {
      setLoading(false);
    }
  };

  const handleSetFinal = async (historyId: string) => {
    if (!studentProfile) return;

    setSettingFinal(historyId);
    setError(null);

    try {
      const response = await fetch("/api/resume/set-final", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentProfile.id,
          historyId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to set final resume");
      }

      await loadHistory();
    } catch (err) {
      console.error("Failed to set final resume:", err);
      setError(err instanceof Error ? err.message : "Failed to set final resume");
    } finally {
      setSettingFinal(null);
    }
  };

  const handleDelete = async (historyId: string, isFinal: boolean) => {
    if (!studentProfile) return;

    if (isFinal) {
      setError("Cannot delete the final resume. Please set another resume as final first.");
      return;
    }

    if (!confirm("Are you sure you want to delete this resume version? This action cannot be undone.")) {
      return;
    }

    setDeleting(historyId);
    setError(null);

    try {
      const response = await fetch("/api/resume/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentProfile.id,
          historyId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete resume");
      }

      await loadHistory();
    } catch (err) {
      console.error("Failed to delete resume:", err);
      setError(err instanceof Error ? err.message : "Failed to delete resume");
    } finally {
      setDeleting(null);
    }
  };

  if (!studentProfile) {
    return (
      <ContentLayout title="Resume History">
        <div className="flex items-center justify-center h-64">
          <Spinner className="size-8" />
        </div>
      </ContentLayout>
    );
  }

  const formatDate = (timestamp: { toDate?: () => Date } | string | number) => {
    if (!timestamp) return "Unknown";
    try {
      let date: Date;
      if (typeof timestamp === 'object' && timestamp.toDate) {
        date = timestamp.toDate();
      } else {
        date = new Date(timestamp as string | number);
      }
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (err) {
      console.error("Date formatting error:", err);
      return "Invalid Date";
    }
  };

  const getSourceBadge = (source?: string) => {
    switch (source) {
      case "upload":
        return <Badge variant="secondary">Uploaded</Badge>;
      case "improvement":
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">Improved</Badge>;
      case "ai-generated":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">AI Generated</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <ContentLayout title="Resume History">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link href="/student/resume">
              <ArrowLeft className="size-4 mr-2" />
              Back to Resume
            </Link>
          </Button>
          <Button asChild>
            <Link href="/student/resume/improve">
              Create New Version
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
            <CardTitle>Resume Versions</CardTitle>
            <CardDescription>
              View all your resume versions and select which one to show to recruiters
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="size-6 mr-2" />
                <span>Loading history...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Resume History</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You haven&apos;t created any resume versions yet.
                </p>
                <Button asChild>
                  <Link href="/student/resume/improve">
                    Create Your First Resume
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 border rounded-lg ${item.isFinal
                      ? "border-green-500 bg-green-50 dark:bg-green-900/10"
                      : "border-gray-200 dark:border-gray-800"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="size-5 text-muted-foreground" />
                          <h3 className="font-medium">Version {item.version}</h3>
                          {item.isFinal && (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              <Star className="size-3 mr-1" />
                              Final Resume
                            </Badge>
                          )}
                          {getSourceBadge(item.generatedFrom)}
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <Clock className="size-4" />
                            {formatDate(item.createdAt)}
                          </div>
                          {item.resumeScore !== undefined && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Score:</span>
                              <span className={`font-semibold ${item.resumeScore >= 80 ? "text-green-600" :
                                item.resumeScore >= 60 ? "text-yellow-600" :
                                  "text-orange-600"
                                }`}>
                                {item.resumeScore}/100
                              </span>
                            </div>
                          )}
                          {item.atsScore !== undefined && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">ATS:</span>
                              <span className={`font-semibold ${item.atsScore >= 80 ? "text-green-600" :
                                item.atsScore >= 60 ? "text-yellow-600" :
                                  "text-orange-600"
                                }`}>
                                {item.atsScore}%
                              </span>
                            </div>
                          )}
                        </div>

                        {item.isFinal && (
                          <p className="text-sm text-green-700 dark:text-green-400">
                            This is the resume that recruiters and admins will see when you apply to jobs.
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <a href={item.resumeUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="size-4 mr-2" />
                            View
                          </a>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // For cross-origin URLs, open in new tab and let browser handle download
                            const link = document.createElement('a');
                            link.href = item.resumeUrl;
                            link.target = '_blank';
                            link.rel = 'noopener noreferrer';
                            link.click();
                          }}
                        >
                          <Download className="size-4 mr-2" />
                          Download
                        </Button>
                        {!item.isFinal && (
                          <Button
                            size="sm"
                            onClick={() => handleSetFinal(item.id)}
                            disabled={settingFinal === item.id}
                          >
                            {settingFinal === item.id ? (
                              <>
                                <Spinner className="size-4 mr-2" />
                                Setting...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="size-4 mr-2" />
                                Set as Final
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(item.id, item.isFinal)}
                          disabled={deleting === item.id}
                        >
                          {deleting === item.id ? (
                            <>
                              <Spinner className="size-4 mr-2" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="size-4 mr-2" />
                              Delete
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
                  About Final Resume
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  Your final resume is what recruiters and placement admins see when you apply for jobs.
                  You can create multiple versions and choose the best one. Only the final resume is visible
                  to others - all other versions remain private to you.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}
