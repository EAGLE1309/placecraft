"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Shield,
  Bell,
  Database,
  Info
} from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <ContentLayout title="Settings">
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* System Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="size-5" />
                System Information
              </CardTitle>
              <CardDescription>Platform configuration details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Platform Version</span>
                <Badge variant="outline">v1.0.0</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Environment</span>
                <Badge variant="secondary">{process.env.NODE_ENV || "development"}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Database</span>
                <Badge className="bg-green-100 text-green-800">Connected</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Access Control */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-5" />
                Access Control
              </CardTitle>
              <CardDescription>User authentication settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Authentication</span>
                <Badge className="bg-green-100 text-green-800">Firebase Auth</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Email Allowlist</span>
                <Badge variant="outline">Enabled</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Session Management</span>
                <Badge variant="outline">Cookie-based</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-5" />
                Notifications
              </CardTitle>
              <CardDescription>Notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Email Notifications</span>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Push Notifications</span>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Storage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="size-5" />
                Storage
              </CardTitle>
              <CardDescription>File storage configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Resume Storage</span>
                <Badge className="bg-green-100 text-green-800">Cloudflare R2</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Max File Size</span>
                <Badge variant="outline">5 MB</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Allowed Types</span>
                <Badge variant="outline">PDF, DOC, DOCX</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Flags - Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="size-5" />
              Feature Configuration
            </CardTitle>
            <CardDescription>
              Advanced settings and feature toggles will be available here in future updates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This section will include configurable options for resume analysis, drive management, 
              and other platform features. Stay tuned for updates!
            </p>
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}
