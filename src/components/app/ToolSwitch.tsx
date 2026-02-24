"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TOOLS = [
  { href: "/mongodb-paste-the-plan", label: "Paste the Plan" },
  { href: "/mongodb-stage-glossary", label: "Stage Glossary" },
] as const;

export function ToolSwitch() {
  const pathname = usePathname();
  const target = TOOLS.find((t) => t.href !== pathname);

  if (!target) return null;

  return (
    <nav aria-label="Tool navigation" className="flex justify-end">
      <Link
        href={target.href}
        className="text-xs text-neutral-400 transition-colors hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300"
      >
        Switch to {target.label}
      </Link>
    </nav>
  );
}
