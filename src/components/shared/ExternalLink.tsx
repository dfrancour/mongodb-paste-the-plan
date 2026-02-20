"use client";

import { ExternalLink as ExternalLinkIcon } from "lucide-react";

interface ExternalLinkProps {
  readonly href: string;
  readonly children: React.ReactNode;
  readonly className?: string;
}

export function ExternalLink({
  href,
  children,
  className = "",
}: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-blue-600 underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 ${className}`}
    >
      {children}
      <ExternalLinkIcon className="h-3 w-3" />
    </a>
  );
}
