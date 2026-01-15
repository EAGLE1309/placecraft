"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { StatsCard, ApplicationStatusBadge, UserAvatar } from "@/components/shared";
import {
  getRecruiterStats,
  getDrivesByRecruiter,
  getApplicationsByDrive,
  getStudentById
} from "@/lib/firebase/firestore";
import { RecruiterProfile, PlacementDrive, Application, RecruiterDashboardStats, StudentProfile } from "@/types";
import {
  Briefcase,
  Users,
  CheckCircle,
  Clock,
  ArrowRight,
  Plus,
  Building2
} from "lucide-react";
import Link from "next/link";

interface ApplicationWithStudent extends Application {
  student?: StudentProfile;
}

export default function RecruiterDashboardPage() {
  const { profile } = useAuth();
  const recruiterProfile = profile as RecruiterProfile | null;

  const [stats, setStats] = useState<RecruiterDashboardStats | null>(null);
  const [drives, setDrives] = useState<PlacementDrive[]>([]);
  const [recentApplications, setRecentApplications] = useState<ApplicationWithStudent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!recruiterProfile) return;

      setLoading(true);

      try {
        const [statsData, drivesData] = await Promise.all([
          getRecruiterStats(recruiterProfile.id),
          getDrivesByRecruiter(recruiterProfile.id),
        ]);

        setStats(statsData);
        setDrives(drivesData);

        // Get recent applications from all drives
        const allApps: ApplicationWithStudent[] = [];
        for (const drive of drivesData.slice(0, 3)) {
          const apps = await getApplicationsByDrive(drive.id);
          for (const app of apps.slice(0, 5)) {
            const student = await getStudentById(app.studentId);
            allApps.push({ ...app, student: student || undefined });
          }
        }
        setRecentApplications(allApps.slice(0, 10));
      } catch (error) {
        console.error("Failed to fetch recruiter data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [recruiterProfile]);

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
    <ContentLayout title="Recruiter Dashboard">
      <div className="space-y-6">
        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {recruiterProfile?.name}!</h1>
            <p className="text-muted-foreground">{recruiterProfile?.company} - {recruiterProfile?.designation}</p>
          </div>
          <Link href="/recruiter/drives/new">
            <Button>
              <Plus className="size-4 mr-2" />
              Post New Drive
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard
            title="Active Drives"
            value={stats?.activeDrives || 0}
            subtitle="Currently open"
            icon={Briefcase}
          />
          <StatsCard
            title="Total Applications"
            value={stats?.totalApplications || 0}
            subtitle="Received"
            icon={Users}
          />
          <StatsCard
            title="Shortlisted"
            value={stats?.shortlistedCount || 0}
            subtitle="For interview"
            icon={Clock}
            valueClassName="text-yellow-600"
          />
          <StatsCard
            title="Selected"
            value={stats?.selectedCount || 0}
            subtitle="Hired"
            icon={CheckCircle}
            valueClassName="text-green-600"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Your Drives */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Your Drives</CardTitle>
                  <CardDescription>Manage your placement drives</CardDescription>
                </div>
                <Link href="/recruiter/drives">
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="size-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {drives.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="size-12 mx-auto mb-2 opacity-50" />
                  <p>No drives created yet</p>
                  <Link href="/recruiter/drives/new">
                    <Button variant="link" className="mt-2">
                      Create your first drive
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {drives.slice(0, 4).map((drive) => (
                    <div key={String(drive.id)} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <Building2 className="size-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{(drive.role).toString()}</h4>
                          <p className="text-sm text-muted-foreground">
                            {(drive.applicationCount).toString()} applications
                          </p>
                        </div>
                      </div>
                      <Badge variant={drive.status === "published" ? "default" : "secondary"}>
                        {(drive.status).toString()}
                      </Badge>
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
                  <CardTitle>Recent Applications</CardTitle>
                  <CardDescription>Latest candidates</CardDescription>
                </div>
                <Link href="/recruiter/applications">
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="size-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentApplications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="size-12 mx-auto mb-2 opacity-50" />
                  <p>No applications yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentApplications.slice(0, 5).map((app) => (
                    <div key={String(app.id)} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={app.student?.name || "Unknown"} />
                        <div>
                          <h4 className="font-medium">{typeof app.student?.name === 'string' ? app.student.name : "Unknown"}</h4>
                          <p className="text-sm text-muted-foreground">
                            Score: {app.resumeScore}/100 • Match: {app.skillMatch}%
                          </p>
                        </div>
                      </div>
                      <ApplicationStatusBadge status={app.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ContentLayout>
  );
}
