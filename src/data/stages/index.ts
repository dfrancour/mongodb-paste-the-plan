/**
 * MongoDB Execution Stage Definitions
 *
 * Barrel export for all stage definitions, types, and utilities.
 */

// Re-export all types
export type {
  StageId,
  PipelineStageId,
  PlanningStageId,
  ExecutionStageId,
  MongosStageId,
  StageDefinition,
  PipelineStage,
  PlanningStage,
  ExecutionStage,
  MongosStage,
  ExecutionEngine,
  StageIconName,
  EngineSupportMatrix,
} from "./types";

// Re-export enums and consts
export { QuerySolutionStageType, StageIds, StageCategory } from "./types";

// Re-export type guards
export {
  isPipelineStage,
  isPlanningStage,
  isSbeStage,
  isClassicStage,
  isExecutionStage,
  isMongosStage,
  getEngineForStage,
} from "./types";

// Re-export lookup utilities
export {
  STAGES,
  QUERY_SOLUTION_TYPE_TO_EXPLAIN_NAME,
  getStage,
  getAllStages,
  getStageAnchorId,
  // Relationship utilities for stage lookups
  getImplementations,
  getPipelineStageFor,
  getStagesByEngine,
  getStagesByQuerySolutionType,
  getEngineSupport,
} from "./stage_utilities";
