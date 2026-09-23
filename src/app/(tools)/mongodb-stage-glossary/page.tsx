import { type Metadata } from "next";
import { ToolPage } from "#components/app/ToolPage";
import { GlossaryContainer } from "#components/stage-glossary/GlossaryContainer";

export const metadata: Metadata = {
  title: "MongoDB Stage Glossary",
  description:
    "Complete reference guide for MongoDB execution stages. Learn about COLLSCAN, IXSCAN, SBE stages, and all MongoDB query execution stage types.",
};

export default function StageGlossaryPage() {
  return (
    <ToolPage maxWidthClass="max-w-6xl">
      <GlossaryContainer />
    </ToolPage>
  );
}
