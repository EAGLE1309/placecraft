"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  getStudentStats,
  getEligibleDrivesForStudent,
  getApplicationsByStudent,
  getLearningSuggestions
} from "@/lib/firebase/firestore";
import { StudentProfile, PlacementDrive, Application, LearningSuggestion, StudentDashboardStats } from "@/types";
import {
  FileText,
  Briefcase,
  TrendingUp,
  CheckCircle2,
  Clock,
  Target,
  BookOpen,
  ArrowRight,
  Building2,
  Calendar
} from "lucide-react";
import Link from "next/link";
import { toDate } from "@/lib/utils";

export default function StudentDashboardPage() {
  const { profile } = useAuth();
  const studentProfile = profile as StudentProfile | null;

  const [stats, setStats] = useState<StudentDashboardStats | null>(null);
  const [eligibleDrives, setEligibleDrives] = useState<PlacementDrive[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [suggestions, setSuggestions] = useState<LearningSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!studentProfile) return;

      try {
        const [statsData, drivesData, appsData, suggestionsData] = await Promise.all([
          getStudentStats(studentProfile.id),
          getEligibleDrivesForStudent(studentProfile),
          getApplicationsByStudent(studentProfile.id),
          getLearningSuggestions(studentProfile.id),
        ]);

        setStats(statsData);
        setEligibleDrives(drivesData.slice(0, 3));
        setApplications(appsData.slice(0, 5));
        setSuggestions(suggestionsData.filter(s => !s.completed).slice(0, 3));
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [studentProfile]);

  if (loading || !studentProfile) {
    return (
      <ContentLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <Spinner className="size-8" />
        </div>
      </ContentLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "applied": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "shortlisted": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "interview": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "selected": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "rejected": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <ContentLayout title="Dashboard">
      <div className="space-y-6">
        {/* Welcome section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {studentProfile.name.split(" ")[0]}!</h1>
            <p className="text-muted-foreground">Here&apos;s your placement journey overview</p>
          </div>
          {!studentProfile.resumeFileId && (
            <Link href="/student/resume">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <FileText className="size-4 mr-2" />
                Upload Resume
              </Button>
            </Link>
          )}
        </div>

        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profile Completion</CardTitle>
              <Target className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.profileCompletion || 0}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${stats?.profileCompletion || 0}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resume Score</CardTitle>
              <FileText className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {studentProfile.resumeScore ? `${studentProfile.resumeScore}/100` : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                {studentProfile.resumeScore ? "ATS optimized" : "Upload resume to get score"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Applications</CardTitle>
              <Briefcase className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.appliedCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.shortlistedCount || 0} shortlisted
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Offers</CardTitle>
              <CheckCircle2 className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.selectedCount || 0}</div>
              <p className="text-xs text-muted-foreground">Congratulations!</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Eligible Drives */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Eligible Opportunities</CardTitle>
                  <CardDescription>Drives matching your profile</CardDescription>
                </div>
                <Link href="/student/drives">
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="size-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {eligibleDrives.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="size-12 mx-auto mb-2 opacity-50" />
                  <p>No eligible drives at the moment</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {eligibleDrives.map((drive) => (
                    <div
                      key={drive.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <Building2 className="size-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{drive.role}</h4>
                          <p className="text-sm text-muted-foreground">{drive.company}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <Badge variant={drive.type === "fulltime" ? "default" : "secondary"}>
                            {drive.type === "fulltime" ? "Full-time" : "Internship"}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center justify-end">
                            <Calendar className="size-3 mr-1" />
                            {toDate(drive.applicationDeadline).toLocaleDateString()}
                          </p>
                        </div>
                        <Link href={`/student/drives?driveId=${drive.id}`}>
                          <Button size="sm" variant="outline">
                            Apply
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Applications */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Your Applications</CardTitle>
                  <CardDescription>Track your application status</CardDescription>
                </div>
                <Link href="/student/applications">
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="size-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {applications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="size-12 mx-auto mb-2 opacity-50" />
                  <p>No applications yet</p>
                  <Link href="/student/drives">
                    <Button variant="link" className="mt-2">
                      Browse Opportunities
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium text-sm">Application #{app.id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">
                          Applied {toDate(app.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={getStatusColor(app.status)}>
                        {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Learning Suggestions */}
        {suggestions.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="size-5" />
                    Skill Recommendations
                  </CardTitle>
                  <CardDescription>Based on your resume analysis</CardDescription>
                </div>
                <Link href="/student/learning">
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="size-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="p-4 rounded-lg border hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <BookOpen className="size-5 text-blue-600" />
                      <Badge
                        variant={
                          suggestion.priority === "high" ? "destructive" :
                            suggestion.priority === "medium" ? "default" : "secondary"
                        }
                      >
                        {suggestion.priority}
                      </Badge>
                    </div>
                    <h4 className="font-medium">{suggestion.skill}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{suggestion.reason}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Est. time: {suggestion.estimatedTime}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ContentLayout>
  );
}
