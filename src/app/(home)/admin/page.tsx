"use client";

import { useEffect, useState } from "react";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { getAdminStats, getAllDrives, getAllStudents, getAllRecruiters } from "@/lib/firebase/firestore";
import { AdminDashboardStats, PlacementDrive, StudentProfile, RecruiterProfile } from "@/types";
import {
  Users,
  Building2,
  Briefcase,
  TrendingUp,
  CheckCircle,
  Clock,
  ArrowRight,
  GraduationCap
} from "lucide-react";
import Link from "next/link";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [recentDrives, setRecentDrives] = useState<PlacementDrive[]>([]);
  const [recentStudents, setRecentStudents] = useState<StudentProfile[]>([]);
  const [pendingRecruiters, setPendingRecruiters] = useState<RecruiterProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, drives, students, recruiters] = await Promise.all([
          getAdminStats(),
          getAllDrives(),
          getAllStudents(),
          getAllRecruiters(),
        ]);

        setStats(statsData);
        setRecentDrives(drives.slice(0, 5));
        setRecentStudents(students.slice(0, 5));
        setPendingRecruiters(recruiters.filter((r) => !r.verified));
      } catch (error) {
        console.error("Failed to fetch admin data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <ContentLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <Spinner className="size-8" />
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title="Placement Cell Dashboard">
      <div className="space-y-6">
        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <GraduationCap className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalStudents || 0}</div>
              <p className="text-xs text-muted-foreground">Registered on platform</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Drives</CardTitle>
              <Briefcase className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeDrives || 0}</div>
              <p className="text-xs text-muted-foreground">Currently accepting applications</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <TrendingUp className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalApplications || 0}</div>
              <p className="text-xs text-muted-foreground">Across all drives</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Students Placed</CardTitle>
              <CheckCircle className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.placedStudents || 0}</div>
              <p className="text-xs text-muted-foreground">Successfully placed</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Drives */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Drives</CardTitle>
                  <CardDescription>Latest placement drives</CardDescription>
                </div>
                <Link href="/admin/drives">
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="size-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentDrives.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="size-12 mx-auto mb-2 opacity-50" />
                  <p>No drives created yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentDrives.map((drive) => (
                    <div key={drive.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <Building2 className="size-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{drive.role}</h4>
                          <p className="text-sm text-muted-foreground">{drive.company}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={drive.status === "published" ? "default" : "secondary"}>
                          {drive.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {drive.applicationCount} applications
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Students */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Students</CardTitle>
                  <CardDescription>Newly registered students</CardDescription>
                </div>
                <Link href="/admin/students">
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="size-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentStudents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="size-12 mx-auto mb-2 opacity-50" />
                  <p>No students registered yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentStudents.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <span className="font-medium text-sm">
                            {student.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium">{student.name}</h4>
                          <p className="text-sm text-muted-foreground">{student.branch}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {student.resumeFileId ? (
                          <Badge className="bg-green-100 text-green-800">Resume ✓</Badge>
                        ) : (
                          <Badge variant="outline">No Resume</Badge>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          CGPA: {student.cgpa || "N/A"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pending Recruiter Approvals */}
        {pendingRecruiters.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="size-5 text-yellow-500" />
                    Pending Approvals
                  </CardTitle>
                  <CardDescription>Recruiters waiting for verification</CardDescription>
                </div>
                <Link href="/admin/recruiters">
                  <Button variant="ghost" size="sm">
                    Manage <ArrowRight className="size-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingRecruiters.slice(0, 3).map((recruiter) => (
                  <div key={recruiter.id} className="flex items-center justify-between p-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
                    <div>
                      <h4 className="font-medium">{recruiter.name}</h4>
                      <p className="text-sm text-muted-foreground">{recruiter.company} - {recruiter.designation}</p>
                    </div>
                    <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                      Pending
                    </Badge>
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
