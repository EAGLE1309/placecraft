"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Building2, MapPin, Calendar, IndianRupee, CheckCircle } from "lucide-react";
import { PlacementDrive } from "@/types";
import { DriveTypeBadge, DriveStatusBadge } from "./status-badge";
import { CompanyAvatar } from "./user-avatar";

interface DriveListItemProps {
  drive: PlacementDrive;
  variant?: "card" | "row" | "compact";
  showStatus?: boolean;
  hasApplied?: boolean;
  isUrgent?: boolean;
  onView?: () => void;
  onApply?: () => void;
  formatDate: (date: unknown) => string;
  className?: string;
}

export function DriveListItem({
  drive,
  variant = "card",
  showStatus = false,
  hasApplied = false,
  isUrgent = false,
  onView,
  onApply,
  formatDate,
  className,
}: DriveListItemProps) {
  if (variant === "compact") {
    return (
      <div className={cn("flex items-center justify-between p-3 rounded-lg border", className)}>
        <div className="flex items-center gap-3">
          <CompanyAvatar icon={<Building2 className="size-5 text-blue-600" />} />
          <div>
            <h4 className="font-medium">{drive.role}</h4>
            <p className="text-sm text-muted-foreground">{drive.company}</p>
          </div>
        </div>
        <div className="text-right">
          {showStatus ? (
            <DriveStatusBadge status={drive.status} />
          ) : (
            <DriveTypeBadge type={drive.type} />
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {drive.applicationCount} applications
          </p>
        </div>
      </div>
    );
  }

  if (variant === "row") {
    return (
      <Card className={cn("hover:shadow-md transition-shadow", className)}>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <CompanyAvatar
                icon={<Building2 className="size-6 text-blue-600" />}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-lg">{drive.role}</h3>
                  {showStatus && <DriveStatusBadge status={drive.status} />}
                  <DriveTypeBadge type={drive.type} />
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
                </div>
              </div>
            </div>
            {(onView || onApply) && (
              <div className="flex items-center gap-2">
                {onView && (
                  <Button variant="outline" size="sm" onClick={onView}>
                    View
                  </Button>
                )}
                {onApply && !hasApplied && (
                  <Button size="sm" onClick={onApply}>
                    Apply
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("flex flex-col hover:shadow-lg transition-shadow", className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <CompanyAvatar
              icon={<Building2 className="size-6 text-blue-600" />}
              size="md"
            />
            <div>
              <CardTitle className="text-lg">{drive.role}</CardTitle>
              <CardDescription>{drive.company}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div className="flex flex-wrap gap-2">
          <DriveTypeBadge type={drive.type} />
          {isUrgent && <Badge variant="destructive">Closing Soon</Badge>}
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
            Deadline: {formatDate(drive.applicationDeadline)}
          </div>
        </div>

        {drive.requiredSkills && drive.requiredSkills.length > 0 && (
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
        )}
      </CardContent>
      {(onView || onApply) && (
        <div className="p-4 pt-0">
          <Button
            className="w-full"
            disabled={hasApplied}
            onClick={hasApplied ? undefined : (onApply || onView)}
          >
            {hasApplied ? "Applied" : onApply ? "View & Apply" : "View Details"}
          </Button>
        </div>
      )}
    </Card>
  );
}
