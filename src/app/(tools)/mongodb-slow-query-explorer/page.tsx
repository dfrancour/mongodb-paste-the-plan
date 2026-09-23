import { type Metadata } from "next";
import { ToolPage } from "#components/app/ToolPage";
import { SlowQueryExplorerContainer } from "#components/slow-query-explorer/SlowQueryExplorerContainer";

export const metadata: Metadata = {
  title: "MongoDB Slow Query Explorer",
  description:
    "Browser-based tool to explore MongoDB slow query logs: group by query shape, find the operations that dominate time, and inspect each entry. Nothing leaves your browser.",
};

export default function SlowQueryExplorerPage() {
  return (
    <ToolPage maxWidthClass="max-w-7xl">
      <SlowQueryExplorerContainer />
    </ToolPage>
  );
}
