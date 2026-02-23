/**
 * Field declaration lookup and composition utilities.
 */
import type {
  ExecutionStage,
  PlanningStage,
  MongosStage,
  StageDefinition,
  ExplainFieldDeclaration,
  ExplainVerbosity,
} from "../types";
import { CLASSIC_COMMON_FIELDS, SBE_COMMON_FIELDS } from "./common";

/** Stage types that declare explainFields */
type StageWithFields = ExecutionStage | PlanningStage | MongosStage;

/** Type guard for any stage definition that has explainFields */
export function hasExplainFields(
  stage: StageDefinition,
): stage is StageWithFields {
  return "explainFields" in stage;
}

/** All fields for a stage: engine common (if execution) + stage-specific */
export function getFieldsForStage(
  stage: StageWithFields,
): readonly ExplainFieldDeclaration[] {
  if (stage.layer === "execution") {
    const common =
      stage.engine === "sbe" ? SBE_COMMON_FIELDS : CLASSIC_COMMON_FIELDS;
    return [...common, ...stage.explainFields];
  }
  return stage.explainFields;
}

/** Fields visible at a given verbosity level */
export function getFieldsAtVerbosity(
  fields: readonly ExplainFieldDeclaration[],
  verbosity: ExplainVerbosity,
): readonly ExplainFieldDeclaration[] {
  if (verbosity === "executionStats" || verbosity === "allPlansExecution")
    return fields;
  return fields.filter((f) => f.verbosity === "queryPlanner");
}

/**
 * Generate per-child indexed fields (e.g., mapAfterChild_0, mapAfterChild_1, ...).
 * Undefined values are simply not extracted — safe to declare more than needed.
 */
export function perChildFields(
  prefix: string,
  description: string,
  count: number,
): ExplainFieldDeclaration[] {
  return Array.from({ length: count }, (_, i) => ({
    bsonKey: `${prefix}${i}`,
    description: `${description} ${i}`,
    valueType: "number" as const,
    verbosity: "executionStats" as const,
    unit: "count" as const,
  }));
}

/** Fields with renamed C++ names (for "explain the explain") */
export function getRenamedFields(
  fields: readonly ExplainFieldDeclaration[],
): readonly (ExplainFieldDeclaration & { cppName: string })[] {
  return fields.filter(
    (f): f is ExplainFieldDeclaration & { cppName: string } =>
      f.cppName != null,
  );
}
