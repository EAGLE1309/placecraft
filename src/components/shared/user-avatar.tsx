"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type AvatarVariant = "gray" | "blue" | "green" | "purple";
type AvatarSize = "sm" | "md" | "lg";

const variantStyles: Record<AvatarVariant, string> = {
  gray: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
  blue: "bg-blue-100 dark:bg-blue-900 text-blue-600",
  green: "bg-green-100 dark:bg-green-900 text-green-600",
  purple: "bg-purple-100 dark:bg-purple-900 text-purple-600",
};

const sizeStyles: Record<AvatarSize, { container: string; text: string }> = {
  sm: { container: "h-8 w-8", text: "text-xs" },
  md: { container: "h-10 w-10", text: "text-sm" },
  lg: { container: "h-14 w-14", text: "text-lg" },
};

interface UserAvatarProps {
  name: string;
  variant?: AvatarVariant;
  size?: AvatarSize;
  className?: string;
  imageUrl?: string;
}

export function UserAvatar({
  name,
  variant = "gray",
  size = "md",
  className,
  imageUrl,
}: UserAvatarProps) {
  const initials = name
    ? name
      .split(" ")
      .map((n) => n.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase()
    : "?";

  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={name}
        width={size === "lg" ? 56 : size === "md" ? 40 : 32}
        height={size === "lg" ? 56 : size === "md" ? 40 : 32}
        className={cn(
          "rounded-full object-cover",
          sizeStyles[size].container,
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-medium",
        variantStyles[variant],
        sizeStyles[size].container,
        sizeStyles[size].text,
        className
      )}
    >
      {initials}
    </div>
  );
}

interface CompanyAvatarProps {
  icon?: React.ReactNode;
  size?: AvatarSize;
  className?: string;
}

export function CompanyAvatar({
  icon,
  size = "md",
  className,
}: CompanyAvatarProps) {
  return (
    <div
      className={cn(
        "rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center",
        sizeStyles[size].container,
        className
      )}
    >
      {icon}
    </div>
  );
}
