"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface FilterOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface ButtonFilterProps {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "default";
  className?: string;
}

export function ButtonFilter({
  options,
  value,
  onChange,
  size = "sm",
  className,
}: ButtonFilterProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <Button
            key={option.value}
            variant={value === option.value ? "default" : "outline"}
            size={size}
            onClick={() => onChange(option.value)}
          >
            {Icon && <Icon className="size-4 mr-1" />}
            {option.label}
            {option.count !== undefined && ` (${option.count})`}
          </Button>
        );
      })}
    </div>
  );
}

interface SelectFilterProps {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  width?: string;
}

export function SelectFilter({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className,
  width = "w-[180px]",
}: SelectFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn(width, className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
            {option.count !== undefined && ` (${option.count})`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row gap-4", className)}>
      {children}
    </div>
  );
}
