"use client";

import { useEffect, useState } from "react";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DataTable, Column, SearchBar, StatsCardSimple, RecruiterStatusBadge, UserAvatar } from "@/components/shared";
import { getAllRecruiters, updateRecruiter } from "@/lib/firebase/firestore";
import { RecruiterProfile } from "@/types";
import {
  Building2,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";

export default function AdminRecruitersPage() {
  const [recruiters, setRecruiters] = useState<RecruiterProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "verified">("all");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchRecruiters();
  }, []);

  const fetchRecruiters = async () => {
    try {
      const data = await getAllRecruiters();
      setRecruiters(data);
    } catch (error) {
      console.error("Failed to fetch recruiters:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (recruiterId: string) => {
    setUpdating(recruiterId);
    try {
      await updateRecruiter(recruiterId, { verified: true });
      await fetchRecruiters();
    } catch (error) {
      console.error("Failed to approve recruiter:", error);
    } finally {
      setUpdating(null);
    }
  };

  const handleReject = async (recruiterId: string) => {
    setUpdating(recruiterId);
    try {
      await updateRecruiter(recruiterId, { verified: false });
      await fetchRecruiters();
    } catch (error) {
      console.error("Failed to reject recruiter:", error);
    } finally {
      setUpdating(null);
    }
  };

  const filteredRecruiters = recruiters.filter((recruiter) => {
    const matchesSearch =
      recruiter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recruiter.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recruiter.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && !recruiter.verified) ||
      (statusFilter === "verified" && recruiter.verified);

    return matchesSearch && matchesStatus;
  });

  const pendingCount = recruiters.filter((r) => !r.verified).length;
  const verifiedCount = recruiters.filter((r) => r.verified).length;

  if (loading) {
    return (
      <ContentLayout title="Recruiters">
        <div className="flex items-center justify-center h-64">
          <Spinner className="size-8" />
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title="Recruiters">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search recruiters..."
          />
          <div className="flex gap-2">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              onClick={() => setStatusFilter("all")}
              size="sm"
            >
              All ({recruiters.length})
            </Button>
            <Button
              variant={statusFilter === "pending" ? "default" : "outline"}
              onClick={() => setStatusFilter("pending")}
              size="sm"
            >
              <Clock className="size-4 mr-1" />
              Pending ({pendingCount})
            </Button>
            <Button
              variant={statusFilter === "verified" ? "default" : "outline"}
              onClick={() => setStatusFilter("verified")}
              size="sm"
            >
              <CheckCircle className="size-4 mr-1" />
              Verified ({verifiedCount})
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatsCardSimple value={recruiters.length} label="Total Recruiters" />
          <StatsCardSimple
            value={pendingCount}
            label="Pending Approval"
            valueClassName="text-yellow-600"
          />
          <StatsCardSimple
            value={verifiedCount}
            label="Verified"
            valueClassName="text-green-600"
          />
        </div>

        {/* Recruiters Table */}
        <DataTable
          data={filteredRecruiters}
          keyExtractor={(recruiter) => recruiter.id}
          emptyMessage="No recruiters found"
          columns={[
            {
              key: "recruiter",
              header: "Recruiter",
              render: (recruiter) => (
                <div className="flex items-center gap-3">
                  <UserAvatar name={recruiter.name} variant="blue" />
                  <div>
                    <p className="font-medium">{recruiter.name}</p>
                    <p className="text-sm text-muted-foreground">{recruiter.designation}</p>
                  </div>
                </div>
              ),
            },
            {
              key: "company",
              header: "Company",
              render: (recruiter) => (
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-muted-foreground" />
                  {recruiter.company}
                </div>
              ),
            },
            {
              key: "contact",
              header: "Contact",
              render: (recruiter) => (
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="size-3 text-muted-foreground" />
                    {recruiter.email}
                  </div>
                  {recruiter.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="size-3 text-muted-foreground" />
                      {recruiter.phone}
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (recruiter) => (
                <RecruiterStatusBadge verified={recruiter.verified} />
              ),
            },
            {
              key: "actions",
              header: "Actions",
              render: (recruiter) => (
                <div className="flex gap-2">
                  {!recruiter.verified ? (
                    <Button
                      size="sm"
                      onClick={() => handleApprove(recruiter.id)}
                      disabled={updating === recruiter.id}
                    >
                      {updating === recruiter.id ? (
                        <Spinner className="size-4" />
                      ) : (
                        <>
                          <CheckCircle className="size-4 mr-1" />
                          Approve
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(recruiter.id)}
                      disabled={updating === recruiter.id}
                    >
                      {updating === recruiter.id ? (
                        <Spinner className="size-4" />
                      ) : (
                        <>
                          <XCircle className="size-4 mr-1" />
                          Revoke
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ),
            },
          ] as Column<RecruiterProfile>[]}
        />
      </div>
    </ContentLayout>
  );
}
