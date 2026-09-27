"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, type LucideIcon } from "lucide-react";
import { Icon } from "./Icon";

interface DisclosureProps {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly children: ReactNode;
}

/** A collapsed row in a help card; opens to show its children. */
export function Disclosure({ icon, label, children }: DisclosureProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-neutral-200 dark:border-neutral-600">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
      >
        {open ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <Icon icon={icon} size="sm" variant="muted" />
        {label}
      </button>
      {open && (
        <div className="space-y-3 px-2 pb-3 pl-8 text-sm text-neutral-600 dark:text-neutral-400">
          {children}
        </div>
      )}
    </div>
  );
}
