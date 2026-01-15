"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  FileText,
} from "lucide-react";
import { ApplicationStatus } from "@/types";

type DriveStatus = "draft" | "published" | "closed" | "completed";
type RecruiterStatus = "pending" | "verified";

const applicationStatusConfig: Record<
  ApplicationStatus,
  { className: string; icon?: React.ReactNode }
> = {
  applied: {
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    icon: <Clock className="size-3 mr-1" />,
  },
  shortlisted: {
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    icon: <AlertCircle className="size-3 mr-1" />,
  },
  interview: {
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    icon: <Calendar className="size-3 mr-1" />,
  },
  selected: {
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    icon: <CheckCircle className="size-3 mr-1" />,
  },
  rejected: {
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    icon: <XCircle className="size-3 mr-1" />,
  },
  withdrawn: {
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    icon: <XCircle className="size-3 mr-1" />,
  },
};

const driveStatusConfig: Record<DriveStatus, { className: string }> = {
  draft: { className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300" },
  published: { className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  closed: { className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  completed: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
};

const recruiterStatusConfig: Record<
  RecruiterStatus,
  { className: string; icon?: React.ReactNode }
> = {
  pending: {
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    icon: <Clock className="size-3 mr-1" />,
  },
  verified: {
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    icon: <CheckCircle className="size-3 mr-1" />,
  },
};

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
  showIcon?: boolean;
  className?: string;
}

export function ApplicationStatusBadge({
  status,
  showIcon = false,
  className,
}: ApplicationStatusBadgeProps) {
  const config = applicationStatusConfig[status];
  return (
    <Badge className={cn(config.className, className)}>
      {showIcon && config.icon}
      <span className="capitalize">{status}</span>
    </Badge>
  );
}

interface DriveStatusBadgeProps {
  status: DriveStatus;
  className?: string;
}

export function DriveStatusBadge({ status, className }: DriveStatusBadgeProps) {
  const config = driveStatusConfig[status];
  return (
    <Badge className={cn(config.className, className)}>
      <span className="capitalize">{status}</span>
    </Badge>
  );
}

interface RecruiterStatusBadgeProps {
  verified: boolean;
  showIcon?: boolean;
  className?: string;
}

export function RecruiterStatusBadge({
  verified,
  showIcon = true,
  className,
}: RecruiterStatusBadgeProps) {
  const status: RecruiterStatus = verified ? "verified" : "pending";
  const config = recruiterStatusConfig[status];
  return (
    <Badge className={cn(config.className, className)}>
      {showIcon && config.icon}
      <span className="capitalize">{status}</span>
    </Badge>
  );
}

interface DriveTypeBadgeProps {
  type: "fulltime" | "internship";
  className?: string;
}

export function DriveTypeBadge({ type, className }: DriveTypeBadgeProps) {
  return (
    <Badge
      variant={type === "fulltime" ? "default" : "secondary"}
      className={className}
    >
      {type === "fulltime" ? "Full-time" : "Internship"}
    </Badge>
  );
}

interface ResumeBadgeProps {
  hasResume: boolean;
  score?: number;
  className?: string;
}

export function ResumeBadge({ hasResume, score, className }: ResumeBadgeProps) {
  if (!hasResume) {
    return (
      <Badge variant="outline" className={className}>
        No Resume
      </Badge>
    );
  }

  return (
    <Badge className={cn("bg-green-100 text-green-800", className)}>
      <FileText className="size-3 mr-1" />
      {score !== undefined ? `${score}/100` : "Resume ✓"}
    </Badge>
  );
}
