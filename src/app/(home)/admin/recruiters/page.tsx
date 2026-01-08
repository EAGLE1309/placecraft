"use client";

import { useEffect, useState } from "react";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { getAllRecruiters, updateRecruiter } from "@/lib/firebase/firestore";
import { RecruiterProfile } from "@/types";
import {
  Search,
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
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search recruiters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
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
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{recruiters.length}</div>
              <p className="text-xs text-muted-foreground">Total Recruiters</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">Pending Approval</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{verifiedCount}</div>
              <p className="text-xs text-muted-foreground">Verified</p>
            </CardContent>
          </Card>
        </div>

        {/* Recruiters Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Recruiter</th>
                    <th className="text-left p-4 font-medium">Company</th>
                    <th className="text-left p-4 font-medium">Contact</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecruiters.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        No recruiters found
                      </td>
                    </tr>
                  ) : (
                    filteredRecruiters.map((recruiter) => (
                      <tr key={recruiter.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                              <span className="font-medium text-sm text-blue-600">
                                {recruiter.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{recruiter.name}</p>
                              <p className="text-sm text-muted-foreground">{recruiter.designation}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="size-4 text-muted-foreground" />
                            {recruiter.company}
                          </div>
                        </td>
                        <td className="p-4">
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
                        </td>
                        <td className="p-4">
                          {recruiter.verified ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                              <CheckCircle className="size-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                              <Clock className="size-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </td>
                        <td className="p-4">
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
    </ContentLayout>
  );
}
