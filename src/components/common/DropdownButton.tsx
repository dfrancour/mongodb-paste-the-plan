"use client";

import * as Popover from "@radix-ui/react-popover";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

interface DropdownButtonProps {
  readonly label: string;
  /** Fills the trigger in while the dropdown holds a selection. */
  readonly active?: boolean;
  readonly children: ReactNode;
  readonly widthClass?: string;
}

/** A quiet text trigger with a popover body; it reads as a word in a row of filters. */
export function DropdownButton({
  label,
  active = false,
  children,
  widthClass = "min-w-64",
}: DropdownButtonProps) {
  return (
    <Popover.Root>
      <Popover.Trigger
        className={`flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-sm whitespace-nowrap transition-colors data-[state=open]:bg-neutral-100 dark:data-[state=open]:bg-neutral-700 ${
          active
            ? "bg-primary-light dark:bg-primary-dark font-medium text-neutral-900 dark:text-neutral-100"
            : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
        }`}
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className={`container-primary z-40 p-2 ${widthClass}`}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
