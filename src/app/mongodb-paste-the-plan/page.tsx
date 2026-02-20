import { type Metadata } from "next";
import { PasteThePlanContainer } from "#components/paste-the-plan/PasteThePlanContainer";

export const metadata: Metadata = {
  title: "MongoDB Paste the Plan",
  description:
    "Browser-based tool to analyze and share MongoDB explain plans with execution flow diagrams, SBE support, and indexing insights.",
};

export default function PasteThePlanPage() {
  return (
    <div className="py-4 sm:py-8">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6">
        <PasteThePlanContainer />
      </div>
    </div>
  );
}
