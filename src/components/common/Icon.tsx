import type { LucideIcon } from "lucide-react";
import { cn } from "#lib/utils";

type IconVariant =
  | "primary"
  | "secondary"
  | "muted"
  | "success"
  | "warning"
  | "error"
  | "inherit";

type IconSize = "sm" | "md" | "lg";

interface IconProps {
  icon: LucideIcon;
  variant?: IconVariant;
  size?: IconSize;
  className?: string;
}

const variantStyles: Record<IconVariant, string> = {
  primary: "text-primary",
  secondary: "text-neutral-600 dark:text-neutral-400",
  muted: "text-neutral-500 dark:text-neutral-500",
  success: "text-performance-good",
  warning: "text-performance-moderate",
  error: "text-performance-poor",
  inherit: "text-current",
};

const sizeStyles: Record<IconSize, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function Icon({
  icon: IconComponent,
  variant = "secondary",
  size = "md",
  className,
}: IconProps) {
  return (
    <IconComponent
      className={cn(variantStyles[variant], sizeStyles[size], className)}
    />
  );
}
