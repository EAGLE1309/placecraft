"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";
import { Application, PlacementDrive, StudentProfile } from "@/types";
import { ApplicationStatusBadge } from "./status-badge";
import { UserAvatar, CompanyAvatar } from "./user-avatar";

interface ApplicationWithDetails extends Application {
  student?: StudentProfile;
  drive?: PlacementDrive;
}

interface ApplicationListItemProps {
  application: ApplicationWithDetails;
  variant?: "student" | "recruiter" | "compact";
  onView?: () => void;
  formatDate: (date: unknown) => string;
  className?: string;
}

export function ApplicationListItem({
  application,
  variant = "student",
  onView,
  formatDate,
  className,
}: ApplicationListItemProps) {
  if (variant === "compact") {
    return (
      <div className={cn("flex items-center justify-between p-3 rounded-lg border", className)}>
        <div>
          <p className="font-medium text-sm">
            {application.drive?.role || `Application #${application.id.slice(0, 8)}`}
          </p>
          <p className="text-xs text-muted-foreground">
            Applied {formatDate(application.createdAt)}
          </p>
        </div>
        <ApplicationStatusBadge status={application.status} />
      </div>
    );
  }

  if (variant === "recruiter") {
    return (
      <div className={cn("flex items-center justify-between p-3 rounded-lg border", className)}>
        <div className="flex items-center gap-3">
          <UserAvatar name={application.student?.name || "Unknown"} />
          <div>
            <h4 className="font-medium">
              {application.student?.name || "Unknown"}
            </h4>
            <p className="text-sm text-muted-foreground">
              Score: {application.resumeScore}/100 • Match: {application.skillMatch}%
            </p>
          </div>
        </div>
        <ApplicationStatusBadge status={application.status} />
      </div>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <CompanyAvatar
              icon={<Building2 className="size-7 text-blue-600" />}
              size="lg"
            />
            <div>
              <h3 className="font-semibold text-lg">
                {application.drive?.role || "Unknown Role"}
              </h3>
              <p className="text-muted-foreground">
                {application.drive?.company || "Unknown Company"}
              </p>
            </div>
          </div>
          <ApplicationStatusBadge status={application.status} showIcon />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Applied On</span>
            <p className="font-medium">{formatDate(application.createdAt)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Resume Score</span>
            <p className="font-medium">{application.resumeScore}/100</p>
          </div>
          <div>
            <span className="text-muted-foreground">Skill Match</span>
            <p className="font-medium">{application.skillMatch}%</p>
          </div>
          <div>
            <span className="text-muted-foreground">Type</span>
            <p className="font-medium capitalize">{application.drive?.type || "N/A"}</p>
          </div>
        </div>

        {onView && (
          <div className="mt-4 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={onView}>
              View Details
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
