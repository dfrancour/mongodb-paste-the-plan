"use client";

import { Github } from "lucide-react";

const REPO_URL = "https://github.com/dfrancour/mongodb-paste-the-plan";

export function ContributeLink() {
  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
    >
      <Github className="h-3 w-3" />
      Contribute
    </a>
  );
}
