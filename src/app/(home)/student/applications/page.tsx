"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { getApplicationsByStudent, getDriveById } from "@/lib/firebase/firestore";
import { StudentProfile, Application, PlacementDrive, ApplicationStatus } from "@/types";
import {
  Building2,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ArrowRight
} from "lucide-react";

interface ApplicationWithDrive extends Application {
  drive?: PlacementDrive;
}

export default function StudentApplicationsPage() {
  const { profile } = useAuth();
  const studentProfile = profile as StudentProfile | null;

  const [applications, setApplications] = useState<ApplicationWithDrive[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchApplications() {
      if (!studentProfile) return;

      try {
        const apps = await getApplicationsByStudent(studentProfile.id);

        // Fetch drive details for each application
        const appsWithDrives = await Promise.all(
          apps.map(async (app) => {
            const drive = await getDriveById(app.driveId);
            return { ...app, drive: drive || undefined };
          })
        );

        setApplications(appsWithDrives);
      } catch (error) {
        console.error("Failed to fetch applications:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchApplications();
  }, [studentProfile]);

  const getStatusIcon = (status: ApplicationStatus) => {
    switch (status) {
      case "applied": return <Clock className="size-4" />;
      case "shortlisted": return <AlertCircle className="size-4" />;
      case "interview": return <Calendar className="size-4" />;
      case "selected": return <CheckCircle className="size-4" />;
      case "rejected": return <XCircle className="size-4" />;
      default: return <Clock className="size-4" />;
    }
  };

  const getStatusColor = (status: ApplicationStatus) => {
    switch (status) {
      case "applied": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "shortlisted": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "interview": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "selected": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "rejected": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const statusSteps: ApplicationStatus[] = ["applied", "shortlisted", "interview", "selected"];

  if (loading || !studentProfile) {
    return (
      <ContentLayout title="My Applications">
        <div className="flex items-center justify-center h-64">
          <Spinner className="size-8" />
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title="My Applications">
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Applied</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{applications.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Shortlisted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {applications.filter((a) => a.status === "shortlisted").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Interview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {applications.filter((a) => a.status === "interview").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Offers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {applications.filter((a) => a.status === "selected").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Applications list */}
        {applications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium">No applications yet</h3>
              <p className="text-muted-foreground">
                Start applying to opportunities to track your progress here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <Card key={app.id} className="overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Building2 className="size-7 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{app.drive?.role || "Unknown Role"}</h3>
                        <p className="text-muted-foreground">{app.drive?.company || "Unknown Company"}</p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(app.status)}>
                      {getStatusIcon(app.status)}
                      <span className="ml-1 capitalize">{app.status}</span>
                    </Badge>
                  </div>

                  {/* Progress tracker */}
                  {app.status !== "rejected" && app.status !== "withdrawn" && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between">
                        {statusSteps.map((step, index) => {
                          const currentIndex = statusSteps.indexOf(app.status);
                          const isCompleted = index <= currentIndex;
                          const isCurrent = index === currentIndex;

                          return (
                            <div key={step} className="flex items-center flex-1">
                              <div className="flex flex-col items-center">
                                <div
                                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium ${isCompleted
                                      ? "bg-blue-600 text-white"
                                      : "bg-gray-200 text-gray-500 dark:bg-gray-700"
                                    } ${isCurrent ? "ring-2 ring-blue-300" : ""}`}
                                >
                                  {index + 1}
                                </div>
                                <span className={`text-xs mt-1 capitalize ${isCompleted ? "text-blue-600 font-medium" : "text-muted-foreground"}`}>
                                  {step}
                                </span>
                              </div>
                              {index < statusSteps.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-2 ${index < currentIndex ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"}`} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Applied On</span>
                      <p className="font-medium">{app.createdAt.toDate().toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Resume Score</span>
                      <p className="font-medium">{app.resumeScore}/100</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Skill Match</span>
                      <p className="font-medium">{app.skillMatch}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type</span>
                      <p className="font-medium capitalize">{app.drive?.type || "N/A"}</p>
                    </div>
                  </div>

                  {/* Status history */}
                  {app.statusHistory.length > 1 && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="text-sm font-medium mb-2">Status History</h4>
                      <div className="space-y-2">
                        {app.statusHistory.slice().reverse().map((change, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <div className={`h-2 w-2 rounded-full ${getStatusColor(change.status)}`} />
                            <span className="capitalize font-medium">{change.status}</span>
                            <span className="text-muted-foreground">
                              - {change.changedAt.toDate().toLocaleDateString()}
                            </span>
                            {change.notes && (
                              <span className="text-muted-foreground">({change.notes})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ContentLayout>
  );
}
