"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getDrivesByRecruiter, updateDrive } from "@/lib/firebase/firestore";
import { RecruiterProfile, PlacementDrive } from "@/types";
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Eye,
  Trash2,
  Users,
  Calendar,
  MapPin,
  Briefcase,
  Building2,
} from "lucide-react";
import Link from "next/link";

export default function RecruiterDrivesPage() {
  const { profile } = useAuth();
  const recruiterProfile = profile as RecruiterProfile | null;

  const [drives, setDrives] = useState<PlacementDrive[]>([]);
  const [filteredDrives, setFilteredDrives] = useState<PlacementDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updatingDriveId, setUpdatingDriveId] = useState<string | null>(null);

  useEffect(() => {
    if (recruiterProfile) {
      loadDrives();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recruiterProfile]);

  useEffect(() => {
    filterDrives();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drives, searchQuery, statusFilter]);

  const loadDrives = async () => {
    if (!recruiterProfile) return;

    setLoading(true);
    try {
      const drivesData = await getDrivesByRecruiter(recruiterProfile.id);
      setDrives(drivesData);
    } catch (error) {
      console.error("Failed to load drives:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterDrives = () => {
    let filtered = [...drives];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (drive) =>
          drive.role.toLowerCase().includes(query) ||
          drive.company.toLowerCase().includes(query) ||
          drive.location.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((drive) => drive.status === statusFilter);
    }

    setFilteredDrives(filtered);
  };

  const handleStatusChange = async (driveId: string, newStatus: PlacementDrive["status"]) => {
    setUpdatingDriveId(driveId);
    try {
      await updateDrive(driveId, { status: newStatus });
      await loadDrives();
    } catch (error) {
      console.error("Failed to update drive status:", error);
    } finally {
      setUpdatingDriveId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "published":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Published</Badge>;
      case "closed":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Closed</Badge>;
      case "completed":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (timestamp: { toDate?: () => Date } | string | number) => {
    if (!timestamp) return "Not set";
    let date: Date;
    if (typeof timestamp === "object" && timestamp.toDate) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp as string | number);
    }
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!recruiterProfile) {
    return (
      <ContentLayout title="My Drives">
        <div className="flex items-center justify-center h-64">
          <Spinner className="size-8" />
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title="My Drives">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Placement Drives</h1>
            <p className="text-muted-foreground">Manage your job postings and track applications</p>
          </div>
          <Link href="/recruiter/drives/new">
            <Button>
              <Plus className="size-4 mr-2" />
              Create New Drive
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search drives..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
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

        {/* Drives List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="size-8" />
          </div>
        ) : filteredDrives.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Briefcase className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">
                  {drives.length === 0 ? "No drives created yet" : "No drives match your filters"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {drives.length === 0
                    ? "Create your first placement drive to start hiring"
                    : "Try adjusting your search or filters"}
                </p>
                {drives.length === 0 && (
                  <Link href="/recruiter/drives/new">
                    <Button>
                      <Plus className="size-4 mr-2" />
                      Create Your First Drive
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredDrives.map((drive) => (
              <Card key={String(drive.id)} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                        <Building2 className="size-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg">{drive.role}</h3>
                          {getStatusBadge(drive.status)}
                          <Badge variant="outline">
                            {drive.type === "internship" ? "Internship" : "Full-time"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{drive.company}</p>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="size-4" />
                            {drive.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="size-4" />
                            Deadline: {formatDate(drive.applicationDeadline)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="size-4" />
                            {(drive.applicationCount).toString()} applications
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/recruiter/drives/${drive.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="size-4 mr-2" />
                          View
                        </Button>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/recruiter/drives/${drive.id}/edit`}>
                              <Edit className="size-4 mr-2" />
                              Edit Drive
                            </Link>
                          </DropdownMenuItem>
                          {drive.status === "draft" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(drive.id, "published")}
                              disabled={updatingDriveId === drive.id}
                            >
                              {updatingDriveId === drive.id ? <Spinner className="size-4 mr-2" /> : <Eye className="size-4 mr-2" />}
                              {updatingDriveId === drive.id ? "Publishing..." : "Publish"}
                            </DropdownMenuItem>
                          )}
                          {drive.status === "published" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(drive.id, "closed")}
                              disabled={updatingDriveId === drive.id}
                            >
                              {updatingDriveId === drive.id ? <Spinner className="size-4 mr-2" /> : <Trash2 className="size-4 mr-2" />}
                              {updatingDriveId === drive.id ? "Closing..." : "Close Drive"}
                            </DropdownMenuItem>
                          )}
                          {drive.status === "closed" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(drive.id, "completed")}
                              disabled={updatingDriveId === drive.id}
                            >
                              {updatingDriveId === drive.id ? <Spinner className="size-4 mr-2" /> : <Briefcase className="size-4 mr-2" />}
                              {updatingDriveId === drive.id ? "Completing..." : "Mark Completed"}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ContentLayout>
  );
}
