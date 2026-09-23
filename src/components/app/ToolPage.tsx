import type { ReactNode } from "react";
import { ToolSwitch } from "./ToolSwitch";
import { ThemeSwitch } from "./ThemeSwitch";

interface ToolPageProps {
  /** Each tool sets its own reading width; tables want more than a flow diagram. */
  readonly maxWidthClass: string;
  readonly children: ReactNode;
}

export function ToolPage({ maxWidthClass, children }: ToolPageProps) {
  return (
    <div className={`container mx-auto px-4 sm:px-6 ${maxWidthClass}`}>
      <div className="mb-4 flex items-end justify-between gap-4 border-b border-neutral-200 sm:mb-6 dark:border-neutral-700">
        <ToolSwitch />
        <ThemeSwitch />
      </div>
      {children}
    </div>
  );
}
