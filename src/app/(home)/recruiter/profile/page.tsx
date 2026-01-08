"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { updateRecruiter } from "@/lib/firebase/firestore";
import { RecruiterProfile } from "@/types";
import {
  Building2,
  Mail,
  Phone,
  User,
  Briefcase,
  CheckCircle,
  AlertCircle,
  Save,
} from "lucide-react";

export default function RecruiterProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const recruiterProfile = profile as RecruiterProfile | null;

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    company: "",
    designation: "",
  });

  useEffect(() => {
    if (recruiterProfile) {
      setFormData({
        name: recruiterProfile.name || "",
        phone: recruiterProfile.phone || "",
        company: recruiterProfile.company || "",
        designation: recruiterProfile.designation || "",
      });
    }
  }, [recruiterProfile]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(false);
  };

  const handleSave = async () => {
    if (!recruiterProfile) return;

    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }
    if (!formData.company.trim()) {
      setError("Company name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await updateRecruiter(recruiterProfile.id, {
        name: formData.name,
        phone: formData.phone,
        company: formData.company,
        designation: formData.designation,
      });

      await refreshProfile();
      setSuccess(true);
      setEditing(false);
    } catch (err) {
      console.error("Failed to update profile:", err);
      setError("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (recruiterProfile) {
      setFormData({
        name: recruiterProfile.name || "",
        phone: recruiterProfile.phone || "",
        company: recruiterProfile.company || "",
        designation: recruiterProfile.designation || "",
      });
    }
    setEditing(false);
    setError(null);
  };

  if (!recruiterProfile) {
    return (
      <ContentLayout title="Company Profile">
        <div className="flex items-center justify-center h-64">
          <Spinner className="size-8" />
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title="Company Profile">
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Company Profile</h1>
            <p className="text-muted-foreground">Manage your company and contact information</p>
          </div>
          {!editing && (
            <Button onClick={() => setEditing(true)}>
              Edit Profile
            </Button>
          )}
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-5 text-red-600" />
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
            <div className="flex items-center gap-2">
              <CheckCircle className="size-5 text-green-600" />
              <p className="text-green-800 dark:text-green-200">Profile updated successfully!</p>
            </div>
          </div>
        )}

        {/* Verification Status */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${recruiterProfile.verified
                    ? "bg-green-100 dark:bg-green-900/50"
                    : "bg-yellow-100 dark:bg-yellow-900/50"
                  }`}>
                  {recruiterProfile.verified ? (
                    <CheckCircle className="size-6 text-green-600" />
                  ) : (
                    <AlertCircle className="size-6 text-yellow-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-medium">Account Status</h3>
                  <p className="text-sm text-muted-foreground">
                    {recruiterProfile.verified
                      ? "Your account is verified"
                      : "Pending verification by placement cell"}
                  </p>
                </div>
              </div>
              <Badge className={recruiterProfile.verified
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
              }>
                {recruiterProfile.verified ? "Verified" : "Pending"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-5" />
              Company Information
            </CardTitle>
            <CardDescription>Your company details visible to students</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {editing ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company">Company Name *</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => handleChange("company", e.target.value)}
                      placeholder="Enter company name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="designation">Your Designation</Label>
                    <Input
                      id="designation"
                      value={formData.designation}
                      onChange={(e) => handleChange("designation", e.target.value)}
                      placeholder="e.g., HR Manager"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-zinc-800">
                  <Building2 className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="font-medium">{recruiterProfile.company || "Not set"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-zinc-800">
                  <Briefcase className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Designation</p>
                    <p className="font-medium">{recruiterProfile.designation || "Not set"}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-5" />
              Contact Information
            </CardTitle>
            <CardDescription>Your personal contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {editing ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-zinc-800">
                  <User className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{recruiterProfile.name || "Not set"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-zinc-800">
                  <Mail className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{recruiterProfile.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-zinc-800">
                  <Phone className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{recruiterProfile.phone || "Not set"}</p>
                  </div>
                </div>
              </div>
            )}

            {editing && (
              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? (
                    <Spinner className="size-4 mr-2" />
                  ) : (
                    <Save className="size-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}
