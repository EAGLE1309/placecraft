"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSearchParams } from "next/navigation";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  getEligibleDrivesForStudent,
  hasAppliedToDrive,
  createApplication,
  getDriveById
} from "@/lib/firebase/firestore";
import { StudentProfile, PlacementDrive } from "@/types";
import {
  Building2,
  MapPin,
  Calendar,
  IndianRupee,
  Search,
  Filter,
  Clock,
  CheckCircle,
  Briefcase
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toDate } from "@/lib/utils";

export default function StudentDrivesPage() {
  const { profile, refreshProfile } = useAuth();
  const studentProfile = profile as StudentProfile | null;
  const searchParams = useSearchParams();
  const driveIdFromUrl = searchParams.get("driveId");

  const [drives, setDrives] = useState<PlacementDrive[]>([]);
  const [filteredDrives, setFilteredDrives] = useState<PlacementDrive[]>([]);
  const [appliedDrives, setAppliedDrives] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "fulltime" | "internship">("all");
  const [selectedDrive, setSelectedDrive] = useState<PlacementDrive | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    async function fetchDrives() {
      if (!studentProfile) return;

      try {
        const eligibleDrives = await getEligibleDrivesForStudent(studentProfile);
        setDrives(eligibleDrives);
        setFilteredDrives(eligibleDrives);

        // Check which drives student has already applied to
        const applied = new Set<string>();
        for (const drive of eligibleDrives) {
          const hasApplied = await hasAppliedToDrive(studentProfile.id, drive.id);
          if (hasApplied) applied.add(drive.id);
        }
        setAppliedDrives(applied);

        // Auto-open dialog if driveId is in URL query params
        if (driveIdFromUrl) {
          const driveToOpen = eligibleDrives.find((d) => d.id === driveIdFromUrl);
          if (driveToOpen && !applied.has(driveIdFromUrl)) {
            setSelectedDrive(driveToOpen);
          }
        }
      } catch (error) {
        console.error("Failed to fetch drives:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDrives();
  }, [studentProfile, driveIdFromUrl]);

  useEffect(() => {
    let filtered = drives;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.company.toLowerCase().includes(query) ||
          d.role.toLowerCase().includes(query) ||
          d.requiredSkills.some((s) => s.toLowerCase().includes(query))
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((d) => d.type === typeFilter);
    }

    setFilteredDrives(filtered);
  }, [searchQuery, typeFilter, drives]);

  const handleApply = async () => {
    if (!studentProfile || !selectedDrive) return;

    if (!studentProfile.resumeFileId) {
      alert("Please upload your resume before applying to drives.");
      return;
    }

    setApplying(true);
    try {
      // Calculate skill match
      const studentSkills = new Set(studentProfile.skills.map((s) => s.toLowerCase()));
      const requiredSkills = selectedDrive.requiredSkills.map((s) => s.toLowerCase());
      const matchedSkills = requiredSkills.filter((s) => studentSkills.has(s));
      const skillMatch = requiredSkills.length > 0
        ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
        : 100;

      await createApplication(studentProfile, selectedDrive.id, skillMatch);
      setAppliedDrives((prev) => new Set([...prev, selectedDrive.id]));
      setSelectedDrive(null);
      await refreshProfile();
    } catch (error) {
      console.error("Failed to apply:", error);
      alert("Failed to submit application. Please try again.");
    } finally {
      setApplying(false);
    }
  };

  if (loading || !studentProfile) {
    return (
      <ContentLayout title="Opportunities">
        <div className="flex items-center justify-center h-64">
          <Spinner className="size-8" />
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title="Opportunities">
      <div className="space-y-6">
        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by company, role, or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={typeFilter === "all" ? "default" : "outline"}
              onClick={() => setTypeFilter("all")}
              size="sm"
            >
              All
            </Button>
            <Button
              variant={typeFilter === "fulltime" ? "default" : "outline"}
              onClick={() => setTypeFilter("fulltime")}
              size="sm"
            >
              Full-time
            </Button>
            <Button
              variant={typeFilter === "internship" ? "default" : "outline"}
              onClick={() => setTypeFilter("internship")}
              size="sm"
            >
              Internship
            </Button>
          </div>
        </div>

        {/* Drives grid */}
        {filteredDrives.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium">No opportunities found</h3>
              <p className="text-muted-foreground">
                {searchQuery || typeFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Check back later for new opportunities"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDrives.map((drive) => {
              const hasApplied = appliedDrives.has(drive.id);
              const deadline = toDate(drive.applicationDeadline);
              const isUrgent = deadline.getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;

              return (
                <Card key={drive.id} className="flex flex-col hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <Building2 className="size-6 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{drive.role}</CardTitle>
                          <CardDescription>{drive.company}</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={drive.type === "fulltime" ? "default" : "secondary"}>
                        {drive.type === "fulltime" ? "Full-time" : "Internship"}
                      </Badge>
                      {isUrgent && (
                        <Badge variant="destructive">Closing Soon</Badge>
                      )}
                      {hasApplied && (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="size-3 mr-1" />
                          Applied
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="size-4" />
                        {drive.location}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <IndianRupee className="size-4" />
                        {drive.type === "fulltime" ? drive.ctc : `${drive.stipend}/month`}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="size-4" />
                        Deadline: {deadline.toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {drive.requiredSkills.slice(0, 4).map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {drive.requiredSkills.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{drive.requiredSkills.length - 4}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                  <div className="p-4 pt-0">
                    <Button
                      className="w-full"
                      disabled={hasApplied}
                      onClick={() => setSelectedDrive(drive)}
                    >
                      {hasApplied ? "Applied" : "View & Apply"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Application Dialog */}
      <Dialog open={!!selectedDrive} onOpenChange={() => setSelectedDrive(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedDrive && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Building2 className="size-7 text-blue-600" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{selectedDrive.role}</DialogTitle>
                    <DialogDescription>{selectedDrive.company}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={selectedDrive.type === "fulltime" ? "default" : "secondary"}>
                    {selectedDrive.type === "fulltime" ? "Full-time" : "Internship"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 text-muted-foreground" />
                    <span>{selectedDrive.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IndianRupee className="size-4 text-muted-foreground" />
                    <span>{selectedDrive.type === "fulltime" ? selectedDrive.ctc : `${selectedDrive.stipend}/month`}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-muted-foreground" />
                    <span>Deadline: {toDate(selectedDrive.applicationDeadline).toLocaleDateString()}</span>
                  </div>
                  {selectedDrive.duration && (
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-muted-foreground" />
                      <span>Duration: {selectedDrive.duration}</span>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedDrive.description}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Required Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedDrive.requiredSkills.map((skill) => (
                      <Badge
                        key={skill}
                        variant={studentProfile.skills.includes(skill) ? "default" : "outline"}
                      >
                        {skill}
                        {studentProfile.skills.includes(skill) && (
                          <CheckCircle className="size-3 ml-1" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>

                {selectedDrive.preferredSkills.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Preferred Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedDrive.preferredSkills.map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Eligibility</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Branches:</span>{" "}
                      {selectedDrive.eligibility.branches.join(", ")}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Min CGPA:</span>{" "}
                      {selectedDrive.eligibility.minCgpa}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Batch:</span>{" "}
                      {selectedDrive.eligibility.batches.join(", ")}
                    </div>
                  </div>
                </div>

                {!studentProfile.resumeFileId && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      ⚠️ Please upload your resume before applying to this drive.
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedDrive(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleApply}
                  disabled={applying || !studentProfile.resumeFileId || appliedDrives.has(selectedDrive.id)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {applying ? (
                    <Spinner className="size-4" />
                  ) : appliedDrives.has(selectedDrive.id) ? (
                    "Already Applied"
                  ) : (
                    "Submit Application"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </ContentLayout>
  );
}
