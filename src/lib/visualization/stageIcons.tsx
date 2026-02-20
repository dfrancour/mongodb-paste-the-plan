import {
  Activity,
  ArrowUpFromDot,
  BarChart3,
  BookA,
  Braces,
  Calculator,
  CircleOff,
  CircleQuestionMark,
  Clock,
  Cog,
  Database,
  Edit,
  FileSearch,
  Filter,
  FolderSearch,
  GitBranch,
  GitFork,
  Group,
  Layers,
  Link,
  List,
  MapPin,
  Merge,
  PenLine,
  Rows3,
  Search,
  Server,
  Shuffle,
  SortAsc,
  type LucideIcon,
} from "lucide-react";
import type { ReactElement } from "react";

/**
 * Map of icon names to Lucide icon components
 * Used for stage visualization throughout the application
 *
 * This is the single source of truth for stage icons.
 * StageIconName type is derived from these keys.
 */
export const STAGE_ICON_COMPONENTS = {
  Activity,
  ArrowUpFromDot,
  BarChart3,
  BookA,
  Braces,
  Calculator,
  CircleOff,
  CircleQuestionMark,
  Clock,
  Cog,
  Database,
  Edit,
  FileSearch,
  Filter,
  FolderSearch,
  GitBranch,
  GitFork,
  Group,
  Layers,
  Link,
  List,
  MapPin,
  Merge,
  PenLine,
  Rows3,
  Search,
  Server,
  Shuffle,
  SortAsc,
} as const satisfies Record<string, LucideIcon>;

/**
 * Valid icon names for stage visualization.
 * Derived from STAGE_ICON_COMPONENTS keys.
 */
export type StageIconName = keyof typeof STAGE_ICON_COMPONENTS;

/**
 * Icon mapping and rendering utilities for MongoDB stages
 */
export class StageIcons {
  /**
   * Get icon component by name
   */
  static getIcon(iconName: string): LucideIcon {
    return (
      STAGE_ICON_COMPONENTS[iconName as StageIconName] ?? CircleQuestionMark
    );
  }

  /**
   * Render icon with specified classes
   */
  static renderIcon(iconName: string, className: string): ReactElement {
    const IconComponent = this.getIcon(iconName);
    return <IconComponent className={className} />;
  }
}
