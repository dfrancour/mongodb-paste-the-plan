import {
  AlertTriangle,
  Info,
  OctagonAlert,
  type LucideIcon,
} from "lucide-react";
import type { FindingSeverity } from "#types/analysis";
import { cn } from "#lib/utils";

interface SeverityIconProps {
  readonly severity: FindingSeverity;
  /** Size and layout classes; the icon has no size of its own. */
  readonly className: string;
  /** Take the surrounding text color instead of the severity color. */
  readonly inheritColor?: boolean;
}

const ICONS: Record<FindingSeverity, { icon: LucideIcon; color: string }> = {
  critical: { icon: OctagonAlert, color: "text-performance-poor" },
  warning: { icon: AlertTriangle, color: "text-performance-moderate" },
  info: { icon: Info, color: "text-primary" },
};

/** The one icon per finding severity, shared by every tool. */
export function SeverityIcon({
  severity,
  className,
  inheritColor = false,
}: SeverityIconProps) {
  const { icon: Component, color } = ICONS[severity];
  return (
    <Component
      aria-hidden="true"
      className={cn("flex-shrink-0", !inheritColor && color, className)}
    />
  );
}
