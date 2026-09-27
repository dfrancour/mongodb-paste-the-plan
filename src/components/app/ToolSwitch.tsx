"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TOOLS = [
  { href: "/mongodb-paste-the-plan", label: "Paste the Plan" },
  { href: "/mongodb-slow-query-explorer", label: "Slow Query Explorer" },
  { href: "/mongodb-stage-glossary", label: "Stage Glossary" },
] as const;

export function ToolSwitch() {
  const pathname = usePathname();

  return (
    <nav aria-label="Tool navigation" className="-mb-px flex overflow-x-auto">
      {TOOLS.map((tool) => {
        const active = pathname === tool.href;
        return (
          <Link
            key={tool.href}
            href={tool.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              active
                ? "border-primary bg-primary-light dark:bg-primary-dark text-neutral-900 dark:text-neutral-100"
                : "border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-neutral-200"
            }`}
          >
            {tool.label}
          </Link>
        );
      })}
    </nav>
  );
}
