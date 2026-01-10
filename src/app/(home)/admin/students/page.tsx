"use client";

import { useEffect, useState } from "react";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getAllStudents, getApplicationsByStudent } from "@/lib/firebase/firestore";
import { StudentProfile, BRANCHES, Application } from "@/types";
import {
  Search,
  Eye,
  FileText,
  Mail,
  Phone,
  GraduationCap,
  Building,
  Calendar,
  Briefcase
} from "lucide-react";
import { toDate } from "@/lib/utils";

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [studentApplications, setStudentApplications] = useState<Application[]>([]);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const data = await getAllStudents();
      setStudents(data);
    } catch (error) {
      console.error("Failed to fetch students:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudent = async (student: StudentProfile) => {
    setSelectedStudent(student);
    try {
      const apps = await getApplicationsByStudent(student.id);
      setStudentApplications(apps);
    } catch (error) {
      console.error("Failed to fetch student applications:", error);
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBranch = branchFilter === "all" || student.branch === branchFilter;
    return matchesSearch && matchesBranch;
  });

  if (loading) {
    return (
      <ContentLayout title="Students">
        <div className="flex items-center justify-center h-64">
          <Spinner className="size-8" />
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title="Students">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {BRANCHES.map((branch) => (
                <SelectItem key={branch} value={branch}>{branch}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{students.length}</div>
              <p className="text-xs text-muted-foreground">Total Students</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {students.filter((s) => s.resumeFileId).length}
              </div>
              <p className="text-xs text-muted-foreground">With Resume</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {students.filter((s) => s.onboardingComplete).length}
              </div>
              <p className="text-xs text-muted-foreground">Profile Complete</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {students.filter((s) => (s.resumeScore || 0) >= 80).length}
              </div>
              <p className="text-xs text-muted-foreground">High Resume Score</p>
            </CardContent>
          </Card>
        </div>

        {/* Students Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Student</th>
                    <th className="text-left p-4 font-medium">Branch</th>
                    <th className="text-left p-4 font-medium">Batch</th>
                    <th className="text-left p-4 font-medium">CGPA</th>
                    <th className="text-left p-4 font-medium">Resume</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        No students found
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                              <span className="font-medium text-sm">
                                {student.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{student.name}</p>
                              <p className="text-sm text-muted-foreground">{student.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm">{student.branch || "N/A"}</td>
                        <td className="p-4 text-sm">{student.graduationYear}</td>
                        <td className="p-4 text-sm">{student.cgpa || "N/A"}</td>
                        <td className="p-4">
                          {student.resumeFileId ? (
                            <div className="flex items-center gap-2">
                              <Badge className="bg-green-100 text-green-800">
                                <FileText className="size-3 mr-1" />
                                {student.resumeScore || 0}/100
                              </Badge>
                            </div>
                          ) : (
                            <Badge variant="outline">No Resume</Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewStudent(student)}
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

      {/* Student Detail Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedStudent && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedStudent.name}</DialogTitle>
                <DialogDescription>Student Profile Details</DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Contact Info */}
                <div className="space-y-2">
                  <h4 className="font-medium">Contact Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="size-4 text-muted-foreground" />
                      {selectedStudent.email}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="size-4 text-muted-foreground" />
                      {selectedStudent.phone || "N/A"}
                    </div>
                  </div>
                </div>

                {/* Academic Info */}
                <div className="space-y-2">
                  <h4 className="font-medium">Academic Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Building className="size-4 text-muted-foreground" />
                      {selectedStudent.college}
                    </div>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="size-4 text-muted-foreground" />
                      {selectedStudent.branch}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="size-4 text-muted-foreground" />
                      Batch: {selectedStudent.graduationYear}
                    </div>
                    <div>
                      <span className="text-muted-foreground">CGPA:</span>{" "}
                      <span className="font-medium">{selectedStudent.cgpa || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* Skills */}
                {selectedStudent.skills.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedStudent.skills.map((skill) => (
                        <Badge key={skill} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resume */}
                <div className="space-y-2">
                  <h4 className="font-medium">Resume</h4>
                  {selectedStudent.resumeFileId ? (
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="size-5 text-blue-600" />
                          <span>Resume uploaded</span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{selectedStudent.resumeScore}/100</p>
                          <p className="text-xs text-muted-foreground">Resume Score</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No resume uploaded</p>
                  )}
                </div>

                {/* Applications */}
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Briefcase className="size-4" />
                    Applications ({studentApplications.length})
                  </h4>
                  {studentApplications.length === 0 ? (
                    <p className="text-muted-foreground">No applications yet</p>
                  ) : (
                    <div className="space-y-2">
                      {studentApplications.map((app) => (
                        <div key={app.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="text-sm font-medium">Application #{app.id.slice(0, 8)}</p>
                            <p className="text-xs text-muted-foreground">
                              Applied: {toDate(app.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge>{app.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </ContentLayout>
  );
}
