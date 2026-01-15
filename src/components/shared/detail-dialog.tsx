"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface DetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[90vw]",
};

export function DetailDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "lg",
  className,
}: DetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          sizeClasses[size],
          "max-h-[80vh] overflow-y-auto",
          className
        )}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

interface DetailSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function DetailSection({
  title,
  children,
  className,
}: DetailSectionProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <h4 className="font-medium">{title}</h4>
      {children}
    </div>
  );
}

interface DetailGridProps {
  cols?: 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
}

export function DetailGrid({ cols = 2, children, className }: DetailGridProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4 text-sm", gridCols[cols], className)}>
      {children}
    </div>
  );
}

interface DetailItemProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function DetailItem({
  label,
  value,
  icon,
  className,
}: DetailItemProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <div>
        <span className="text-muted-foreground">{label}:</span>{" "}
        <span className="font-medium">{value}</span>
      </div>
    </div>
  );
}

interface DetailDividerProps {
  className?: string;
}

export function DetailDivider({ className }: DetailDividerProps) {
  return <Separator className={className} />;
}
