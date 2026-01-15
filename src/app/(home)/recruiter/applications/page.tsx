"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { DataTable, Column, ApplicationStatusBadge, UserAvatar, ScoreIndicator } from "@/components/shared";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getDrivesByRecruiter,
  getApplicationsByDrive,
  getStudentById,
  updateApplicationStatus
} from "@/lib/firebase/firestore";
import { RecruiterProfile, PlacementDrive, Application, StudentProfile, ApplicationStatus } from "@/types";
import {
  Mail,
  Phone,
  GraduationCap,
  CheckCircle,
  XCircle,
  Clock,
  Eye
} from "lucide-react";

interface ApplicationWithDetails extends Application {
  student?: StudentProfile;
  drive?: PlacementDrive;
}

export default function RecruiterApplicationsPage() {
  const { user, profile } = useAuth();
  const recruiterProfile = profile as RecruiterProfile | null;

  const [drives, setDrives] = useState<PlacementDrive[]>([]);
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrive, setSelectedDrive] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedApp, setSelectedApp] = useState<ApplicationWithDetails | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [recruiterProfile]);

  const fetchData = async () => {
    if (!recruiterProfile) return;

    try {
      const drivesData = await getDrivesByRecruiter(recruiterProfile.id);
      setDrives(drivesData);

      // Fetch all applications
      const allApps: ApplicationWithDetails[] = [];
      for (const drive of drivesData) {
        const apps = await getApplicationsByDrive(drive.id);
        for (const app of apps) {
          const student = await getStudentById(app.studentId);
          allApps.push({ ...app, student: student || undefined, drive });
        }
      }
      setApplications(allApps);
    } catch (error) {
      console.error("Failed to fetch applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: ApplicationStatus) => {
    if (!selectedApp || !user) return;

    setUpdating(true);
    try {
      await updateApplicationStatus(selectedApp.id, newStatus, user.uid);
      await fetchData();
      setSelectedApp(null);
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdating(false);
    }
  };

  const filteredApplications = applications.filter((app) => {
    const matchesDrive = selectedDrive === "all" || app.driveId === selectedDrive;
    const matchesStatus = selectedStatus === "all" || app.status === selectedStatus;
    return matchesDrive && matchesStatus;
  });

  if (loading || !recruiterProfile) {
    return (
      <ContentLayout title="Applications">
        <div className="flex items-center justify-center h-64">
          <Spinner className="size-8" />
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title="Applications">
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex gap-4">
          <Select value={selectedDrive} onValueChange={setSelectedDrive}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Drives" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Drives</SelectItem>
              {drives.map((drive) => (
                <SelectItem key={String(drive.id)} value={drive.id}>
                  {drive.role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="shortlisted">Shortlisted</SelectItem>
              <SelectItem value="interview">Interview</SelectItem>
              <SelectItem value="selected">Selected</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Applications Table */}
        <DataTable
          data={filteredApplications}
          keyExtractor={(app) => String(app.id)}
          emptyMessage="No applications found"
          columns={[
            {
              key: "candidate",
              header: "Candidate",
              render: (app) => (
                <div className="flex items-center gap-3">
                  <UserAvatar name={app.student?.name || "Unknown"} />
                  <div>
                    <p className="font-medium">
                      {typeof app.student?.name === "string" ? app.student.name : "Unknown"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {app.student?.branch} • {app.student?.graduationYear}
                    </p>
                  </div>
                </div>
              ),
            },
            {
              key: "role",
              header: "Role",
              render: (app) => <span className="text-sm">{app.drive?.role || "N/A"}</span>,
            },
            {
              key: "resumeScore",
              header: "Resume Score",
              render: (app) => <ScoreIndicator score={app.resumeScore} />,
            },
            {
              key: "skillMatch",
              header: "Skill Match",
              render: (app) => <ScoreIndicator score={app.skillMatch} label="%" />,
            },
            {
              key: "status",
              header: "Status",
              render: (app) => <ApplicationStatusBadge status={app.status} />,
            },
            {
              key: "actions",
              header: "Actions",
              render: (app) => (
                <Button variant="ghost" size="sm" onClick={() => setSelectedApp(app)}>
                  <Eye className="size-4 mr-1" />
                  View
                </Button>
              ),
            },
          ] as Column<ApplicationWithDetails>[]}
        />
      </div>

      {/* Application Detail Dialog */}
      <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent className="max-w-2xl">
          {selectedApp && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedApp.student?.name || "Unknown Candidate"}</DialogTitle>
                <DialogDescription>
                  Application for {selectedApp.drive?.role} at {selectedApp.drive?.company}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="size-4 text-muted-foreground" />
                    {selectedApp.student?.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="size-4 text-muted-foreground" />
                    {selectedApp.student?.phone || "N/A"}
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="size-4 text-muted-foreground" />
                    {selectedApp.student?.branch} - {selectedApp.student?.graduationYear}
                  </div>
                  <div>
                    <span className="text-muted-foreground">CGPA:</span>{" "}
                    <span className="font-medium">{selectedApp.student?.cgpa || "N/A"}</span>
                  </div>
                </div>

                {/* Scores */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Resume Score</p>
                    <p className="text-2xl font-bold">{selectedApp.resumeScore}/100</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Skill Match</p>
                    <p className="text-2xl font-bold">{selectedApp.skillMatch}%</p>
                  </div>
                </div>

                {/* Skills */}
                {selectedApp.student?.skills && selectedApp.student.skills.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedApp.student.skills.map((skill) => (
                        <Badge key={String(skill)} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current Status */}
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Current Status</p>
                  <ApplicationStatusBadge status={selectedApp.status} />
                </div>

                {/* Action Buttons */}
                {selectedApp.status !== "selected" && selectedApp.status !== "rejected" && (
                  <div className="flex gap-2">
                    {selectedApp.status === "applied" && (
                      <Button
                        onClick={() => handleStatusUpdate("shortlisted")}
                        disabled={updating}
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        <Clock className="size-4 mr-2" />
                        Shortlist
                      </Button>
                    )}
                    {selectedApp.status === "shortlisted" && (
                      <Button
                        onClick={() => handleStatusUpdate("interview")}
                        disabled={updating}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        Schedule Interview
                      </Button>
                    )}
                    {selectedApp.status === "interview" && (
                      <Button
                        onClick={() => handleStatusUpdate("selected")}
                        disabled={updating}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="size-4 mr-2" />
                        Select
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => handleStatusUpdate("rejected")}
                      disabled={updating}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <XCircle className="size-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedApp(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </ContentLayout>
  );
}
