"use client";

import { useEffect, useState } from "react";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { DataTable, Column, SearchBar, StatsCardSimple, ResumeBadge, UserAvatar } from "@/components/shared";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getAllStudents, getApplicationsByStudent } from "@/lib/firebase/firestore";
import { StudentProfile, BRANCHES, Application } from "@/types";
import {
  Eye,
  FileText,
  Mail,
  Phone,
  GraduationCap,
  Building,
  Calendar,
  Briefcase,
  Download,
  ExternalLink
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
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search students..."
          />
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
          <StatsCardSimple value={students.length} label="Total Students" />
          <StatsCardSimple
            value={students.filter((s) => s.resumeFileId).length}
            label="With Resume"
          />
          <StatsCardSimple
            value={students.filter((s) => s.onboardingComplete).length}
            label="Profile Complete"
          />
          <StatsCardSimple
            value={students.filter((s) => (s.resumeScore || 0) >= 80).length}
            label="High Resume Score"
          />
        </div>

        {/* Students Table */}
        <DataTable
          data={filteredStudents}
          keyExtractor={(student) => student.id}
          emptyMessage="No students found"
          columns={[
            {
              key: "student",
              header: "Student",
              render: (student) => (
                <div className="flex items-center gap-3">
                  <UserAvatar name={student.name} />
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-muted-foreground">{student.email}</p>
                  </div>
                </div>
              ),
            },
            {
              key: "branch",
              header: "Branch",
              render: (student) => (
                <span className="text-sm">{student.branch || "N/A"}</span>
              ),
            },
            {
              key: "batch",
              header: "Batch",
              render: (student) => (
                <span className="text-sm">{student.graduationYear}</span>
              ),
            },
            {
              key: "cgpa",
              header: "CGPA",
              render: (student) => (
                <span className="text-sm">{student.cgpa || "N/A"}</span>
              ),
            },
            {
              key: "resume",
              header: "Resume",
              render: (student) => (
                <ResumeBadge
                  hasResume={!!student.resumeFileId}
                  score={student.resumeScore}
                />
              ),
            },
            {
              key: "actions",
              header: "Actions",
              render: (student) => (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewStudent(student)}
                >
                  <Eye className="size-4 mr-1" />
                  View
                </Button>
              ),
            },
          ] as Column<StudentProfile>[]}
        />
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
                    <div className="p-4 border rounded-lg space-y-3">
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
                      {selectedStudent.resumeUrl && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(selectedStudent.resumeUrl, '_blank')}
                          >
                            <ExternalLink className="size-4 mr-1" />
                            View Resume
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                          >
                            <a href={selectedStudent.resumeUrl} download={`${selectedStudent.name}_Resume.pdf`}>
                              <Download className="size-4 mr-1" />
                              Download
                            </a>
                          </Button>
                        </div>
                      )}
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
