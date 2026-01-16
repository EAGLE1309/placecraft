"use client";

import { useEffect, useState } from "react";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable, Column, SearchBar, DriveStatusBadge, DriveTypeBadge } from "@/components/shared";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getAllDrives, createDrive, updateDrive, deleteDrive, getApplicationsByDrive, getStudentById } from "@/lib/firebase/firestore";
import { PlacementDrive, BRANCHES, Application, StudentProfile } from "@/types";
import { GRADUATION_YEARS } from "@/lib/constants";
import { Timestamp } from "firebase/firestore";
import { Plus, Building2, Eye, Pencil, Trash2, RotateCcw, Users, ExternalLink, Download } from "lucide-react";
import { toDate } from "@/lib/utils";

export default function AdminDrivesPage() {
  const [drives, setDrives] = useState<PlacementDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedDrive, setSelectedDrive] = useState<PlacementDrive | null>(null);
  const [editingDrive, setEditingDrive] = useState<PlacementDrive | null>(null);
  const [driveToDelete, setDriveToDelete] = useState<PlacementDrive | null>(null);
  const [applicantsDrive, setApplicantsDrive] = useState<PlacementDrive | null>(null);
  const [applicants, setApplicants] = useState<(Application & { student?: StudentProfile })[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingDriveId, setUpdatingDriveId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    company: "",
    role: "",
    description: "",
    type: "fulltime" as "fulltime" | "internship",
    location: "",
    ctc: "",
    stipend: "",
    duration: "",
    branches: [] as string[],
    minCgpa: 0,
    batches: [] as number[],
    requiredSkills: "",
    preferredSkills: "",
    applicationDeadline: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchDrives();
  }, []);

  const fetchDrives = async () => {
    try {
      const data = await getAllDrives();
      // Ensure all drives have required fields with proper types
      const normalizedDrives = data.map(drive => ({
        ...drive,
        applicationCount: typeof drive.applicationCount === 'number' ? drive.applicationCount : 0,
        eligibility: {
          branches: Array.isArray(drive.eligibility?.branches) ? drive.eligibility.branches : [],
          minCgpa: typeof drive.eligibility?.minCgpa === 'number' ? drive.eligibility.minCgpa : 0,
          batches: Array.isArray(drive.eligibility?.batches) ? drive.eligibility.batches : [],
        },
        requiredSkills: Array.isArray(drive.requiredSkills) ? drive.requiredSkills : [],
      }));
      setDrives(normalizedDrives);
    } catch (error) {
      console.error("Failed to fetch drives:", error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): string | null => {
    if (!formData.company.trim()) return "Company name is required";
    if (!formData.role.trim()) return "Role/Position is required";
    if (!formData.description.trim()) return "Description is required";
    if (!formData.location.trim()) return "Location is required";
    if (formData.type === "fulltime" && !formData.ctc.trim()) return "CTC is required for full-time positions";
    if (formData.type === "internship" && !formData.stipend.trim()) return "Stipend is required for internships";
    if (formData.branches.length === 0) return "Please select at least one eligible branch";
    if (formData.batches.length === 0) return "Please select at least one eligible batch";
    if (!formData.applicationDeadline) return "Application deadline is required";

    // Validate deadline is in the future
    const deadline = new Date(formData.applicationDeadline);
    if (deadline <= new Date()) return "Application deadline must be in the future";

    return null;
  };

  const handleCreateDrive = async () => {
    setFormError(null);

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setCreating(true);
    try {
      const driveData = {
        company: formData.company.trim(),
        role: formData.role.trim(),
        description: formData.description.trim(),
        type: formData.type,
        location: formData.location.trim(),
        ctc: formData.type === "fulltime" ? formData.ctc.trim() : undefined,
        stipend: formData.type === "internship" ? formData.stipend.trim() : undefined,
        duration: formData.type === "internship" ? formData.duration.trim() : undefined,
        eligibility: {
          branches: formData.branches,
          minCgpa: formData.minCgpa,
          batches: formData.batches,
        },
        requiredSkills: formData.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
        preferredSkills: formData.preferredSkills.split(",").map((s) => s.trim()).filter(Boolean),
        applicationDeadline: Timestamp.fromDate(new Date(formData.applicationDeadline)),
        status: "draft" as const,
      };

      await createDrive("admin", driveData);
      await fetchDrives();
      setShowCreateDialog(false);
      resetForm();
    } catch (error) {
      console.error("Failed to create drive:", error);
      setFormError(error instanceof Error ? error.message : "Failed to create drive. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (driveId: string, newStatus: PlacementDrive["status"]) => {
    setUpdatingDriveId(driveId);
    try {
      await updateDrive(driveId, { status: newStatus });
      await fetchDrives();
    } catch (error) {
      console.error("Failed to update drive status:", error);
    } finally {
      setUpdatingDriveId(null);
    }
  };

  const handleDeleteDrive = async () => {
    if (!driveToDelete) return;
    setDeleting(true);
    try {
      await deleteDrive(driveToDelete.id);
      await fetchDrives();
      setDriveToDelete(null);
    } catch (error) {
      console.error("Failed to delete drive:", error);
    } finally {
      setDeleting(false);
    }
  };

  const openApplicantsDialog = async (drive: PlacementDrive) => {
    setApplicantsDrive(drive);
    setLoadingApplicants(true);
    try {
      const apps = await getApplicationsByDrive(drive.id);
      const appsWithStudents = await Promise.all(
        apps.map(async (app) => {
          const student = await getStudentById(app.studentId);
          return { ...app, student: student || undefined };
        })
      );
      setApplicants(appsWithStudents);
    } catch (error) {
      console.error("Failed to fetch applicants:", error);
    } finally {
      setLoadingApplicants(false);
    }
  };

  const resetForm = () => {
    setFormData({
      company: "",
      role: "",
      description: "",
      type: "fulltime",
      location: "",
      ctc: "",
      stipend: "",
      duration: "",
      branches: [],
      minCgpa: 0,
      batches: [],
      requiredSkills: "",
      preferredSkills: "",
      applicationDeadline: "",
    });
    setFormError(null);
  };

  const openEditDialog = (drive: PlacementDrive) => {
    setEditingDrive(drive);
    setFormData({
      company: drive.company,
      role: drive.role,
      description: drive.description,
      type: drive.type,
      location: drive.location,
      ctc: drive.ctc || "",
      stipend: drive.stipend || "",
      duration: drive.duration || "",
      branches: drive.eligibility?.branches || [],
      minCgpa: drive.eligibility?.minCgpa || 0,
      batches: drive.eligibility?.batches || [],
      requiredSkills: Array.isArray(drive.requiredSkills) ? drive.requiredSkills.join(", ") : "",
      preferredSkills: Array.isArray(drive.preferredSkills) ? drive.preferredSkills.join(", ") : "",
      applicationDeadline: drive.applicationDeadline ? toDate(drive.applicationDeadline).toISOString().split('T')[0] : "",
    });
    setFormError(null);
  };

  const handleUpdateDrive = async () => {
    if (!editingDrive) return;
    setFormError(null);

    // Validate form (skip deadline validation for existing drives)
    if (!formData.company.trim()) {
      setFormError("Company name is required");
      return;
    }
    if (!formData.role.trim()) {
      setFormError("Role/Position is required");
      return;
    }
    if (!formData.description.trim()) {
      setFormError("Description is required");
      return;
    }
    if (!formData.location.trim()) {
      setFormError("Location is required");
      return;
    }
    if (formData.type === "fulltime" && !formData.ctc.trim()) {
      setFormError("CTC is required for full-time positions");
      return;
    }
    if (formData.type === "internship" && !formData.stipend.trim()) {
      setFormError("Stipend is required for internships");
      return;
    }
    if (formData.branches.length === 0) {
      setFormError("Please select at least one eligible branch");
      return;
    }
    if (formData.batches.length === 0) {
      setFormError("Please select at least one eligible batch");
      return;
    }

    setUpdating(true);
    try {
      const driveData: Partial<PlacementDrive> = {
        company: formData.company.trim(),
        role: formData.role.trim(),
        description: formData.description.trim(),
        type: formData.type,
        location: formData.location.trim(),
        ctc: formData.type === "fulltime" ? formData.ctc.trim() : undefined,
        stipend: formData.type === "internship" ? formData.stipend.trim() : undefined,
        duration: formData.type === "internship" ? formData.duration.trim() : undefined,
        eligibility: {
          branches: formData.branches,
          minCgpa: formData.minCgpa,
          batches: formData.batches,
        },
        requiredSkills: formData.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
        preferredSkills: formData.preferredSkills.split(",").map((s) => s.trim()).filter(Boolean),
      };

      // Only update deadline if changed
      if (formData.applicationDeadline) {
        driveData.applicationDeadline = Timestamp.fromDate(new Date(formData.applicationDeadline));
      }

      await updateDrive(editingDrive.id, driveData);
      await fetchDrives();
      setEditingDrive(null);
      resetForm();
    } catch (error) {
      console.error("Failed to update drive:", error);
      setFormError(error instanceof Error ? error.message : "Failed to update drive. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const filteredDrives = drives.filter((drive) => {
    const matchesSearch =
      drive.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drive.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || drive.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <ContentLayout title="Manage Drives">
        <div className="flex items-center justify-center h-64">
          <Spinner className="size-8" />
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title="Manage Drives">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex gap-2 flex-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search drives..."
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="size-4 mr-2" />
            Create Drive
          </Button>
        </div>

        {/* Drives Table */}
        <DataTable
          data={filteredDrives}
          keyExtractor={(drive) => drive.id}
          emptyMessage="No drives found"
          columns={[
            {
              key: "company",
              header: "Company / Role",
              render: (drive) => (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Building2 className="size-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{drive.role}</p>
                    <p className="text-sm text-muted-foreground">{drive.company}</p>
                  </div>
                </div>
              ),
            },
            {
              key: "type",
              header: "Type",
              render: (drive) => <DriveTypeBadge type={drive.type} />,
            },
            {
              key: "deadline",
              header: "Deadline",
              render: (drive) => (
                <span className="text-sm">
                  {toDate(drive.applicationDeadline).toLocaleDateString()}
                </span>
              ),
            },
            {
              key: "applications",
              header: "Applications",
              render: (drive) => (
                <span className="font-medium">
                  {typeof drive.applicationCount === "number" ? drive.applicationCount : 0}
                </span>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (drive) => <DriveStatusBadge status={drive.status} />,
            },
            {
              key: "actions",
              header: "Actions",
              render: (drive) => (
                <div className="flex gap-1 flex-wrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDrive(drive)}
                    title="View Details"
                  >
                    <Eye className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(drive)}
                    title="Edit"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openApplicantsDialog(drive)}
                    title="View Applicants"
                  >
                    <Users className="size-4" />
                  </Button>
                  {drive.status === "draft" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(drive.id, "published")}
                      disabled={updatingDriveId === drive.id}
                    >
                      {updatingDriveId === drive.id ? <Spinner className="size-4" /> : "Publish"}
                    </Button>
                  )}
                  {drive.status === "published" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(drive.id, "closed")}
                      disabled={updatingDriveId === drive.id}
                    >
                      {updatingDriveId === drive.id ? <Spinner className="size-4" /> : "Close"}
                    </Button>
                  )}
                  {drive.status === "closed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(drive.id, "published")}
                      disabled={updatingDriveId === drive.id}
                    >
                      <RotateCcw className="size-4 mr-1" />
                      {updatingDriveId === drive.id ? <Spinner className="size-4" /> : "Reopen"}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDriveToDelete(drive)}
                    title="Delete"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ),
            },
          ] as Column<PlacementDrive>[]}
        />
      </div>

      {/* Create Drive Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Drive</DialogTitle>
            <DialogDescription>
              Create a new placement drive for students to apply
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="e.g., Google"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g., Software Engineer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Job description and requirements..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v as "fulltime" | "internship" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fulltime">Full-time</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Bangalore"
                />
              </div>
            </div>

            {formData.type === "fulltime" ? (
              <div className="space-y-2">
                <Label>CTC</Label>
                <Input
                  value={formData.ctc}
                  onChange={(e) => setFormData({ ...formData, ctc: e.target.value })}
                  placeholder="e.g., 12 LPA"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stipend</Label>
                  <Input
                    value={formData.stipend}
                    onChange={(e) => setFormData({ ...formData, stipend: e.target.value })}
                    placeholder="e.g., ₹50,000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Input
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="e.g., 6 months"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Eligible Branches</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg">
                {BRANCHES.map((branch) => (
                  <label key={branch} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.branches.includes(branch)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({ ...formData, branches: [...formData.branches, branch] });
                        } else {
                          setFormData({ ...formData, branches: formData.branches.filter((b) => b !== branch) });
                        }
                      }}
                    />
                    <span className="text-sm">{branch}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Minimum CGPA</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={formData.minCgpa}
                  onChange={(e) => setFormData({ ...formData, minCgpa: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Eligible Batches</Label>
                <div className="flex flex-wrap gap-2">
                  {GRADUATION_YEARS.map((year) => (
                    <label key={year} className="flex items-center gap-1 cursor-pointer">
                      <Checkbox
                        checked={formData.batches.includes(year)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({ ...formData, batches: [...formData.batches, year] });
                          } else {
                            setFormData({ ...formData, batches: formData.batches.filter((b) => b !== year) });
                          }
                        }}
                      />
                      <span className="text-sm">{year}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Required Skills (comma-separated)</Label>
              <Input
                value={formData.requiredSkills}
                onChange={(e) => setFormData({ ...formData, requiredSkills: e.target.value })}
                placeholder="e.g., JavaScript, React, Node.js"
              />
            </div>

            <div className="space-y-2">
              <Label>Application Deadline</Label>
              <Input
                type="date"
                value={formData.applicationDeadline}
                onChange={(e) => setFormData({ ...formData, applicationDeadline: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDrive} disabled={creating}>
              {creating ? <Spinner className="size-4" /> : "Create Drive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Drive Dialog */}
      <Dialog open={!!selectedDrive} onOpenChange={() => setSelectedDrive(null)}>
        <DialogContent className="max-w-2xl">
          {selectedDrive && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedDrive.role}</DialogTitle>
                <DialogDescription>{selectedDrive.company}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <DriveTypeBadge type={selectedDrive.type} />
                  <DriveStatusBadge status={selectedDrive.status} />
                </div>

                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedDrive.description}
                </p>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Location:</span>{" "}
                    <span className="font-medium">{selectedDrive.location}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {selectedDrive.type === "fulltime" ? "CTC:" : "Stipend:"}
                    </span>{" "}
                    <span className="font-medium">
                      {selectedDrive.type === "fulltime" ? selectedDrive.ctc : selectedDrive.stipend}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Deadline:</span>{" "}
                    <span className="font-medium">
                      {toDate(selectedDrive.applicationDeadline).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Applications:</span>{" "}
                    <span className="font-medium">{typeof selectedDrive.applicationCount === 'number' ? selectedDrive.applicationCount : 0}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Eligibility</h4>
                  <div className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">Branches:</span> {Array.isArray(selectedDrive.eligibility.branches) ? selectedDrive.eligibility.branches.join(", ") : ""}</p>
                    <p><span className="text-muted-foreground">Min CGPA:</span> {selectedDrive.eligibility.minCgpa}</p>
                    <p><span className="text-muted-foreground">Batches:</span> {Array.isArray(selectedDrive.eligibility.batches) ? selectedDrive.eligibility.batches.join(", ") : ""}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Required Skills</h4>
                  <div className="flex flex-wrap gap-1">
                    {Array.isArray(selectedDrive.requiredSkills) ? selectedDrive.requiredSkills.map((skill) => (
                      <Badge key={skill} variant="outline">{skill}</Badge>
                    )) : null}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Drive Dialog */}
      <Dialog open={!!editingDrive} onOpenChange={(open) => { if (!open) { setEditingDrive(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Drive</DialogTitle>
            <DialogDescription>
              Update the placement drive details
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="e.g., Google"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g., Software Engineer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Job description and requirements..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v as "fulltime" | "internship" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fulltime">Full-time</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Bangalore"
                />
              </div>
            </div>

            {formData.type === "fulltime" ? (
              <div className="space-y-2">
                <Label>CTC</Label>
                <Input
                  value={formData.ctc}
                  onChange={(e) => setFormData({ ...formData, ctc: e.target.value })}
                  placeholder="e.g., 12 LPA"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stipend</Label>
                  <Input
                    value={formData.stipend}
                    onChange={(e) => setFormData({ ...formData, stipend: e.target.value })}
                    placeholder="e.g., ₹50,000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Input
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="e.g., 6 months"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Eligible Branches</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg">
                {BRANCHES.map((branch) => (
                  <label key={branch} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.branches.includes(branch)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({ ...formData, branches: [...formData.branches, branch] });
                        } else {
                          setFormData({ ...formData, branches: formData.branches.filter((b) => b !== branch) });
                        }
                      }}
                    />
                    <span className="text-sm">{branch}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Minimum CGPA</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={formData.minCgpa}
                  onChange={(e) => setFormData({ ...formData, minCgpa: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Eligible Batches</Label>
                <div className="flex flex-wrap gap-2">
                  {GRADUATION_YEARS.map((year) => (
                    <label key={year} className="flex items-center gap-1 cursor-pointer">
                      <Checkbox
                        checked={formData.batches.includes(year)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({ ...formData, batches: [...formData.batches, year] });
                          } else {
                            setFormData({ ...formData, batches: formData.batches.filter((b) => b !== year) });
                          }
                        }}
                      />
                      <span className="text-sm">{year}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Required Skills (comma-separated)</Label>
              <Input
                value={formData.requiredSkills}
                onChange={(e) => setFormData({ ...formData, requiredSkills: e.target.value })}
                placeholder="e.g., JavaScript, React, Node.js"
              />
            </div>

            <div className="space-y-2">
              <Label>Preferred Skills (comma-separated)</Label>
              <Input
                value={formData.preferredSkills}
                onChange={(e) => setFormData({ ...formData, preferredSkills: e.target.value })}
                placeholder="e.g., TypeScript, AWS"
              />
            </div>

            <div className="space-y-2">
              <Label>Application Deadline</Label>
              <Input
                type="date"
                value={formData.applicationDeadline}
                onChange={(e) => setFormData({ ...formData, applicationDeadline: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingDrive(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateDrive} disabled={updating}>
              {updating ? <Spinner className="size-4" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!driveToDelete} onOpenChange={(open) => { if (!open) setDriveToDelete(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Drive</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the drive for <strong>{driveToDelete?.role}</strong> at <strong>{driveToDelete?.company}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDriveToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteDrive} disabled={deleting}>
              {deleting ? <Spinner className="size-4" /> : "Delete Drive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Applicants Dialog */}
      <Dialog open={!!applicantsDrive} onOpenChange={(open) => { if (!open) { setApplicantsDrive(null); setApplicants([]); } }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Applicants for {applicantsDrive?.role}</DialogTitle>
            <DialogDescription>
              {applicantsDrive?.company} - {applicants.length} application(s)
            </DialogDescription>
          </DialogHeader>

          {loadingApplicants ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-8" />
            </div>
          ) : applicants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No applications yet for this drive.
            </div>
          ) : (
            <div className="space-y-4">
              {applicants.map((app) => (
                <div key={app.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{app.student?.name || "Unknown Student"}</h4>
                      <p className="text-sm text-muted-foreground">{app.student?.email}</p>
                    </div>
                    <Badge variant={
                      app.status === "selected" ? "default" :
                        app.status === "rejected" ? "destructive" :
                          app.status === "shortlisted" ? "secondary" :
                            "outline"
                    }>
                      {app.status}
                    </Badge>
                  </div>

                  {app.student && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Branch:</span>{" "}
                        <span className="font-medium">{app.student.branch}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">CGPA:</span>{" "}
                        <span className="font-medium">{app.student.cgpa || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Batch:</span>{" "}
                        <span className="font-medium">{app.student.graduationYear}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Resume Score:</span>{" "}
                        <span className="font-medium">{app.resumeScore}/100</span>
                      </div>
                    </div>
                  )}

                  {app.student?.skills && app.student.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {app.student.skills.slice(0, 5).map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                      ))}
                      {app.student.skills.length > 5 && (
                        <Badge variant="outline" className="text-xs">+{app.student.skills.length - 5} more</Badge>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t">
                    {app.student?.resumeUrl && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(app.student?.resumeUrl, '_blank')}
                        >
                          <ExternalLink className="size-4 mr-1" />
                          View Resume
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <a href={app.student.resumeUrl} download={`${app.student.name}_Resume.pdf`}>
                            <Download className="size-4 mr-1" />
                            Download
                          </a>
                        </Button>
                      </>
                    )}
                    <div className="ml-auto text-xs text-muted-foreground">
                      Applied: {toDate(app.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ContentLayout>
  );
}
