"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getDrivesByRecruiter,
  getApplicationsByDrive,
  getStudentById,
  updateApplicationStatus
} from "@/lib/firebase/firestore";
import { RecruiterProfile, PlacementDrive, Application, StudentProfile, ApplicationStatus } from "@/types";
import {
  FileText,
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "applied": return "bg-blue-100 text-blue-800";
      case "shortlisted": return "bg-yellow-100 text-yellow-800";
      case "interview": return "bg-purple-100 text-purple-800";
      case "selected": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

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
                <SelectItem key={drive.id} value={drive.id}>
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
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Candidate</th>
                    <th className="text-left p-4 font-medium">Role</th>
                    <th className="text-left p-4 font-medium">Resume Score</th>
                    <th className="text-left p-4 font-medium">Skill Match</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        No applications found
                      </td>
                    </tr>
                  ) : (
                    filteredApplications.map((app) => (
                      <tr key={app.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                              <span className="font-medium text-sm">
                                {app.student?.name?.charAt(0) || "?"}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{app.student?.name || "Unknown"}</p>
                              <p className="text-sm text-muted-foreground">
                                {app.student?.branch} • {app.student?.graduationYear}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm">{app.drive?.role || "N/A"}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${app.resumeScore}%` }}
                              />
                            </div>
                            <span className="text-sm">{app.resumeScore}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${app.skillMatch}%` }}
                              />
                            </div>
                            <span className="text-sm">{app.skillMatch}%</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className={getStatusColor(app.status)}>
                            {app.status}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedApp(app)}
                          >
                            <Eye className="size-4 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
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
                        <Badge key={skill} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current Status */}
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Current Status</p>
                  <Badge className={getStatusColor(selectedApp.status)}>
                    {selectedApp.status}
                  </Badge>
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
