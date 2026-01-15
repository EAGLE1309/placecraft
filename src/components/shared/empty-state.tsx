"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
  variant?: "card" | "inline";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = "card",
}: EmptyStateProps) {
  const content = (
    <div className={cn("text-center py-8", className)}>
      {Icon && (
        <Icon className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
      )}
      <h3 className="text-lg font-medium">{title}</h3>
      {description && (
        <p className="text-muted-foreground mt-1">{description}</p>
      )}
      {action && (
        <div className="mt-4">
          {action.href ? (
            <a href={action.href}>
              <Button variant="link">{action.label}</Button>
            </a>
          ) : (
            <Button variant="link" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );

  if (variant === "inline") {
    return content;
  }

  return (
    <Card>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
