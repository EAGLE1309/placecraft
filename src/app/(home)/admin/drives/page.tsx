"use client";

import { useEffect, useState } from "react";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getAllDrives, createDrive, updateDrive, getApplicationsByDrive } from "@/lib/firebase/firestore";
import { PlacementDrive, BRANCHES, Application } from "@/types";
import { GRADUATION_YEARS } from "@/lib/constants";
import { Timestamp } from "firebase/firestore";
import {
  Plus,
  Building2,
  Calendar,
  Users,
  Edit,
  Eye,
  Search,
  Filter
} from "lucide-react";
import { toDate } from "@/lib/utils";

export default function AdminDrivesPage() {
  const [drives, setDrives] = useState<PlacementDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedDrive, setSelectedDrive] = useState<PlacementDrive | null>(null);
  const [creating, setCreating] = useState(false);
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

  const filteredDrives = drives.filter((drive) => {
    const matchesSearch =
      drive.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drive.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || drive.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "published": return "bg-green-100 text-green-800";
      case "closed": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

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
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search drives..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
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
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Company / Role</th>
                    <th className="text-left p-4 font-medium">Type</th>
                    <th className="text-left p-4 font-medium">Deadline</th>
                    <th className="text-left p-4 font-medium">Applications</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrives.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        No drives found
                      </td>
                    </tr>
                  ) : (
                    filteredDrives.map((drive) => (
                      <tr key={drive.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                              <Building2 className="size-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">{drive.role}</p>
                              <p className="text-sm text-muted-foreground">{drive.company}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant={drive.type === "fulltime" ? "default" : "secondary"}>
                            {drive.type === "fulltime" ? "Full-time" : "Internship"}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm">
                          {toDate(drive.applicationDeadline).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <span className="font-medium">{typeof drive.applicationCount === 'number' ? drive.applicationCount : 0}</span>
                        </td>
                        <td className="p-4">
                          <Badge className={getStatusColor(drive.status)}>
                            {drive.status}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedDrive(drive)}
                            >
                              <Eye className="size-4" />
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
                          </div>
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
                  <Badge variant={selectedDrive.type === "fulltime" ? "default" : "secondary"}>
                    {selectedDrive.type === "fulltime" ? "Full-time" : "Internship"}
                  </Badge>
                  <Badge className={getStatusColor(selectedDrive.status)}>
                    {selectedDrive.status}
                  </Badge>
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
    </ContentLayout>
  );
}
