import { type Metadata } from "next";
import { ToolPage } from "#components/app/ToolPage";
import { PasteThePlanContainer } from "#components/paste-the-plan/PasteThePlanContainer";

export const metadata: Metadata = {
  title: "MongoDB Paste the Plan",
  description:
    "Browser-based tool to analyze and share MongoDB explain plans with execution flow diagrams, SBE support, and indexing insights.",
};

export default function PasteThePlanPage() {
  return (
    <ToolPage maxWidthClass="max-w-4xl">
      <PasteThePlanContainer />
    </ToolPage>
  );
}
