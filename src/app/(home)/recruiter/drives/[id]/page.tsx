"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { getDriveById, getApplicationsByDrive, getStudentById, updateDrive } from "@/lib/firebase/firestore";
import { RecruiterProfile, PlacementDrive, Application, StudentProfile } from "@/types";
import { toDate } from "@/lib/utils";
import {
  ArrowLeft,
  Edit,
  MapPin,
  Calendar,
  Users,
  IndianRupee,
  Building2,
  CheckCircle,
  XCircle,
  Eye,
} from "lucide-react";

interface ApplicationWithStudent extends Application {
  student?: StudentProfile;
}

export default function RecruiterDriveDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const recruiterProfile = profile as RecruiterProfile | null;
  const driveId = params.id as string;

  const [drive, setDrive] = useState<PlacementDrive | null>(null);
  const [applications, setApplications] = useState<ApplicationWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithStudent | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const driveData = await getDriveById(driveId);
        if (!driveData || driveData.recruiterId !== recruiterProfile?.id) {
          router.push("/recruiter/drives");
          return;
        }
        // Normalize drive data to ensure proper types
        const normalizedDrive = {
          ...driveData,
          applicationCount: typeof driveData.applicationCount === 'number' ? driveData.applicationCount : 0,
          eligibility: {
            branches: Array.isArray(driveData.eligibility?.branches) ? driveData.eligibility.branches : [],
            minCgpa: typeof driveData.eligibility?.minCgpa === 'number' ? driveData.eligibility.minCgpa : 0,
            batches: Array.isArray(driveData.eligibility?.batches) ? driveData.eligibility.batches : [],
          },
          requiredSkills: Array.isArray(driveData.requiredSkills) ? driveData.requiredSkills : [],
        };
        setDrive(normalizedDrive);

        const apps = await getApplicationsByDrive(driveId);
        const appsWithStudents: ApplicationWithStudent[] = [];
        for (const app of apps) {
          const student = await getStudentById(app.studentId);
          appsWithStudents.push({ ...app, student: student || undefined });
        }
        setApplications(appsWithStudents);
      } catch (error) {
        console.error("Failed to load drive:", error);
      } finally {
        setLoading(false);
      }
    }

    if (driveId && recruiterProfile) {
      fetchData();
    }
  }, [driveId, recruiterProfile, router]);

  const handleStatusChange = async (newStatus: PlacementDrive["status"]) => {
    if (!drive) return;
    setStatusLoading(true);
    try {
      await updateDrive(drive.id, { status: newStatus });
      setDrive({ ...drive, status: newStatus });
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setStatusLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "published": return "bg-green-100 text-green-800";
      case "closed": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getAppStatusColor = (status: string) => {
    switch (status) {
      case "applied": return "bg-blue-100 text-blue-800";
      case "shortlisted": return "bg-yellow-100 text-yellow-800";
      case "interview": return "bg-purple-100 text-purple-800";
      case "selected": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading || !drive) {
    return (
      <ContentLayout title="Drive Details">
        <div className="flex items-center justify-center h-64">
          <Spinner className="size-8" />
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title="Drive Details">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link href="/recruiter/drives">
              <ArrowLeft className="size-4 mr-2" />
              Back to Drives
            </Link>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/recruiter/drives/${drive.id}/edit`}>
                <Edit className="size-4 mr-2" />
                Edit Drive
              </Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Building2 className="size-8 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{drive.role}</CardTitle>
                  <CardDescription className="text-lg">{drive.company}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(drive.status)}>{drive.status}</Badge>
                <Badge variant={drive.type === "fulltime" ? "default" : "secondary"}>
                  {drive.type === "fulltime" ? "Full-time" : "Internship"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-2">
                <MapPin className="size-5 text-muted-foreground" />
                <span>{drive.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <IndianRupee className="size-5 text-muted-foreground" />
                <span>{drive.type === "fulltime" ? drive.ctc : `${drive.stipend}/month`}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="size-5 text-muted-foreground" />
                <span>Deadline: {toDate(drive.applicationDeadline).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="size-5 text-muted-foreground" />
                <span>{typeof drive.applicationCount === 'number' ? drive.applicationCount : 0} applications</span>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Description</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">{drive.description}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-2">Eligibility</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Branches:</span> {Array.isArray(drive.eligibility.branches) ? drive.eligibility.branches.join(", ") : ""}</p>
                  <p><span className="text-muted-foreground">Min CGPA:</span> {drive.eligibility.minCgpa}</p>
                  <p><span className="text-muted-foreground">Batches:</span> {Array.isArray(drive.eligibility.batches) ? drive.eligibility.batches.join(", ") : ""}</p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Required Skills</h4>
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(drive.requiredSkills) ? drive.requiredSkills.map((skill) => (
                    <Badge key={skill} variant="outline">{skill}</Badge>
                  )) : null}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              {drive.status === "draft" && (
                <Button
                  onClick={() => handleStatusChange("published")}
                  disabled={statusLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {statusLoading ? <Spinner className="size-4" /> : <CheckCircle className="size-4 mr-2" />}
                  Publish Drive
                </Button>
              )}
              {drive.status === "published" && (
                <Button
                  onClick={() => handleStatusChange("closed")}
                  disabled={statusLoading}
                  variant="outline"
                >
                  {statusLoading ? <Spinner className="size-4" /> : <XCircle className="size-4 mr-2" />}
                  Close Drive
                </Button>
              )}
              {drive.status === "closed" && (
                <Button
                  onClick={() => handleStatusChange("completed")}
                  disabled={statusLoading}
                >
                  {statusLoading ? <Spinner className="size-4" /> : <CheckCircle className="size-4 mr-2" />}
                  Mark Completed
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" />
              Applications ({applications.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {applications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No applications yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Candidate</th>
                      <th className="text-left p-3 font-medium">Branch</th>
                      <th className="text-left p-3 font-medium">CGPA</th>
                      <th className="text-left p-3 font-medium">Resume Score</th>
                      <th className="text-left p-3 font-medium">Skill Match</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => (
                      <tr key={app.id} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{app.student?.name || "Unknown"}</p>
                            <p className="text-sm text-muted-foreground">{app.student?.email}</p>
                          </div>
                        </td>
                        <td className="p-3 text-sm">{app.student?.branch || "N/A"}</td>
                        <td className="p-3 text-sm">{app.student?.cgpa || "N/A"}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-12 bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${app.resumeScore}%` }} />
                            </div>
                            <span className="text-sm">{app.resumeScore}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-12 bg-gray-200 rounded-full h-2">
                              <div className="bg-green-600 h-2 rounded-full" style={{ width: `${app.skillMatch}%` }} />
                            </div>
                            <span className="text-sm">{app.skillMatch}%</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge className={getAppStatusColor(app.status)}>{app.status}</Badge>
                        </td>
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedApplication(app)}
                          >
                            <Eye className="size-4 mr-1" />
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Applicant Dialog */}
      <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedApplication && selectedApplication.student && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedApplication.student.name}</DialogTitle>
                <DialogDescription>{selectedApplication.student.email}</DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Status and Scores Section */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-1">Application Status</p>
                        <Badge className={getAppStatusColor(selectedApplication.status)}>
                          {selectedApplication.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-1">Resume Score</p>
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${selectedApplication.resumeScore}%` }} />
                          </div>
                          <span className="text-lg font-bold">{selectedApplication.resumeScore}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-1">ATS Score</p>
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${selectedApplication.student.atsScore || 0}%` }} />
                          </div>
                          <span className="text-lg font-bold">{selectedApplication.student.atsScore || 0}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-1">Skill Match</p>
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div className="bg-green-600 h-2 rounded-full" style={{ width: `${selectedApplication.skillMatch}%` }} />
                          </div>
                          <span className="text-lg font-bold">{selectedApplication.skillMatch}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Phone:</span>{" "}
                      <span className="font-medium">{selectedApplication.student.phone || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">College:</span>{" "}
                      <span className="font-medium">{selectedApplication.student.college || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Branch:</span>{" "}
                      <span className="font-medium">{selectedApplication.student.branch || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Graduation Year:</span>{" "}
                      <span className="font-medium">{selectedApplication.student.graduationYear || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">CGPA:</span>{" "}
                      <span className="font-medium">{selectedApplication.student.cgpa || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Applied On:</span>{" "}
                      <span className="font-medium">{toDate(selectedApplication.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Skills */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(selectedApplication.student.skills) && selectedApplication.student.skills.length > 0 ? (
                      selectedApplication.student.skills.map((skill, idx) => (
                        <Badge key={idx} variant="secondary">{skill}</Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No skills listed</p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Education */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Education</h3>
                  {Array.isArray(selectedApplication.student.education) && selectedApplication.student.education.length > 0 ? (
                    <div className="space-y-3">
                      {selectedApplication.student.education.map((edu) => (
                        <Card key={edu.id}>
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold">{edu.degree} in {edu.field}</h4>
                                <p className="text-sm text-muted-foreground">{edu.institution}</p>
                                {edu.grade && <p className="text-sm">Grade: {edu.grade}</p>}
                              </div>
                              <div className="text-right text-sm text-muted-foreground">
                                <p>{edu.startYear} - {edu.current ? "Present" : edu.endYear}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No education details available</p>
                  )}
                </div>

                <Separator />

                {/* Experience */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Experience</h3>
                  {Array.isArray(selectedApplication.student.experience) && selectedApplication.student.experience.length > 0 ? (
                    <div className="space-y-3">
                      {selectedApplication.student.experience.map((exp) => (
                        <Card key={exp.id}>
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-semibold">{exp.role}</h4>
                                <p className="text-sm text-muted-foreground">{exp.company}</p>
                              </div>
                              <div className="text-right text-sm text-muted-foreground">
                                <p>{exp.startDate} - {exp.current ? "Present" : exp.endDate}</p>
                              </div>
                            </div>
                            <p className="text-sm mb-2">{exp.description}</p>
                            {Array.isArray(exp.skills) && exp.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {exp.skills.map((skill, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">{skill}</Badge>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No experience listed</p>
                  )}
                </div>

                <Separator />

                {/* Projects */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Projects</h3>
                  {Array.isArray(selectedApplication.student.projects) && selectedApplication.student.projects.length > 0 ? (
                    <div className="space-y-3">
                      {selectedApplication.student.projects.map((project) => (
                        <Card key={project.id}>
                          <CardContent className="pt-4">
                            <h4 className="font-semibold mb-1">{project.title}</h4>
                            <p className="text-sm mb-2">{project.description}</p>
                            {Array.isArray(project.technologies) && project.technologies.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {project.technologies.map((tech, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">{tech}</Badge>
                                ))}
                              </div>
                            )}
                            {project.link && (
                              <a href={project.link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                                View Project →
                              </a>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No projects listed</p>
                  )}
                </div>

                <Separator />

                {/* Certifications */}
                {Array.isArray(selectedApplication.student.certifications) && selectedApplication.student.certifications.length > 0 && (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Certifications</h3>
                      <div className="space-y-2">
                        {selectedApplication.student.certifications.map((cert) => (
                          <Card key={cert.id}>
                            <CardContent className="pt-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-semibold">{cert.name}</h4>
                                  <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                                  {cert.credentialId && (
                                    <p className="text-xs text-muted-foreground">ID: {cert.credentialId}</p>
                                  )}
                                </div>
                                <div className="text-right text-sm text-muted-foreground">
                                  <p>{cert.date}</p>
                                </div>
                              </div>
                              {cert.url && (
                                <a href={cert.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
                                  View Certificate →
                                </a>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Achievements */}
                {Array.isArray(selectedApplication.student.achievements) && selectedApplication.student.achievements.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Achievements</h3>
                    <div className="space-y-2">
                      {selectedApplication.student.achievements.map((achievement) => (
                        <Card key={achievement.id}>
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold">{achievement.title}</h4>
                                <p className="text-sm">{achievement.description}</p>
                                {achievement.category && (
                                  <Badge variant="outline" className="text-xs mt-1">{achievement.category}</Badge>
                                )}
                              </div>
                              <div className="text-right text-sm text-muted-foreground">
                                <p>{achievement.date}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resume Link */}
                {selectedApplication.student.resumeUrl && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Resume</h3>
                      <Button asChild variant="outline" className="w-full">
                        <a href={selectedApplication.student.resumeUrl} target="_blank" rel="noopener noreferrer">
                          View Resume (PDF) →
                        </a>
                      </Button>
                    </div>
                  </>
                )}

                {/* Recruiter Notes */}
                {selectedApplication.recruiterNotes && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Recruiter Notes</h3>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-sm whitespace-pre-wrap">{selectedApplication.recruiterNotes}</p>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </ContentLayout>
  );
}
