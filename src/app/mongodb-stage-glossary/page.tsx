import { type Metadata } from "next";
import { GlossaryContainer } from "#components/stage-glossary/GlossaryContainer";

export const metadata: Metadata = {
  title: "MongoDB Stage Glossary - Paste the Plan",
  description:
    "Complete reference guide for MongoDB execution stages. Learn about COLLSCAN, IXSCAN, SBE stages, and all MongoDB query execution stage types.",
};

export default function StageGlossaryPage() {
  return (
    <div className="py-4 sm:py-8">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        <GlossaryContainer />
      </div>
    </div>
  );
}
