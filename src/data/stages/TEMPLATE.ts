/**
 * TEMPLATE - How to define MongoDB stages
 *
 * This file shows examples of defining stages for each layer.
 * Copy and modify these patterns when adding new stages.
 *
 * MongoDB has three layers:
 *   Pipeline ($group)  →  Planning (GROUP)  →  Execution (SBE group)
 *
 * - Pipeline stages: user-facing aggregation syntax
 * - Planning stages: what appears in queryPlanner.winningPlan.queryPlan
 * - Execution stages: engine-specific implementation (SBE or Classic)
 */

import type { PipelineStage, PlanningStage, ExecutionStage } from "./types";
import { StageIds, QuerySolutionStageType } from "./types";

// ============================================================================
// Planning Stage Example
// ============================================================================
// Use this for stages that appear in queryPlanner.winningPlan.queryPlan.
// Each corresponds to a QuerySolutionNode subclass in query_solution.h.
// Names come from nodeStageTypeToString() in stage_types.cpp.

export const examplePlanningStage: PlanningStage = {
  layer: "planning",
  id: StageIds.planning("GROUP"), // The explain output name from nodeStageTypeToString()
  querySolutionStageType: QuerySolutionStageType.STAGE_GROUP,

  fullName: "Group",
  description: "What the planner decided and why. Focus on WHAT, not HOW.",
  category: "aggregation",
  iconName: "Group",

  // Planning stages declare the pipeline-to-plan relationship
  builtFromUserSyntax: [StageIds.pipeline("$group")],

  blockingStage: true,
  canSpillToDisk: true,

  performanceNotes:
    "Planning-level performance implications. Engine-specific details belong on execution stages.",

  sourceFile:
    "src/mongo/db/query/compiler/physical_model/query_solution/query_solution.h",

  // Planning stages carry queryPlanner-level fields (index metadata, sort patterns, etc.)
  // Empty array means "no stage-specific fields".
  explainFields: [],
} as const;

// ============================================================================
// SBE Execution Stage Example
// ============================================================================
// Use this for stages in src/mongo/db/exec/sbe/stages/
// These appear in executionStats.executionStages when SBE is the engine.

export const exampleSbeStage: ExecutionStage = {
  layer: "execution",
  engine: "sbe",
  id: StageIds.execution("group"), // SBE internal name (lowercase)
  querySolutionStageType: QuerySolutionStageType.STAGE_GROUP, // Links to planning layer

  fullName: "SBE Group",
  description: "HOW this stage is implemented in the SBE engine.",
  category: "aggregation",
  iconName: "Group",

  // builtFromUserSyntax is NOT on execution stages.
  // The relationship chain is: Pipeline ← Planning (builtFromUserSyntax) ← Execution (querySolutionStageType)

  blockingStage: true,
  canSpillToDisk: true,

  performanceNotes:
    "Engine-specific implementation details. Hash tables, memory thresholds, " +
    "spill behavior, etc.",

  sourceFile: "src/mongo/db/exec/sbe/stages/hash_agg.h",

  // Declare stage-specific fields (beyond engine common fields).
  // Empty array means "investigated, no stage-specific fields".
  explainFields: [],

  // Optional fields
  introducedIn: "7.0",
  // deprecatedIn: "8.0",
  // removedIn: "9.0",
  // docsUrl: "https://...",
} as const;

// ============================================================================
// Classic Execution Stage Example
// ============================================================================
// Use this for stages in src/mongo/db/exec/classic/
// These appear in executionStats.executionStages when Classic is the engine.

export const exampleClassicStage: ExecutionStage = {
  layer: "execution",
  engine: "classic",
  id: StageIds.execution("COLLSCAN"), // Classic names match planning names (UPPER_CASE)
  querySolutionStageType: QuerySolutionStageType.STAGE_COLLSCAN,

  fullName: "Collection Scan",
  description: "HOW the classic engine implements a collection scan.",
  category: "collectionScan",
  iconName: "FolderSearch",

  blockingStage: false,
  canSpillToDisk: false,

  performanceNotes: "Classic engine implementation details.",

  sourceFile: "src/mongo/db/exec/classic/collection_scan.h",

  explainFields: [],
} as const;

// ============================================================================
// Pipeline Stage Example
// ============================================================================
// Use this for aggregation pipeline stages users write (like $group, $match)

export const examplePipelineStage: PipelineStage = {
  layer: "pipeline",
  id: StageIds.pipeline("$group"),

  fullName: "Group Aggregation Stage",
  description: "User-facing aggregation stage that groups documents.",
  category: "aggregation",
  iconName: "FolderSearch",

  // NOTE: Pipeline stages are pure abstractions - they do NOT declare:
  //   - builtFromUserSyntax (planning stages point here, not vice versa)
  //   - engine (computed from implementations via getEngineSupport())
  //
  // To find implementations: look for planning stages with builtFromUserSyntax pointing to this

  performanceNotes:
    "Performs grouping and aggregation. SBE implementation is significantly faster.",

  docsUrl:
    "https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/",
} as const;

// ============================================================================
// explainFields: Planning vs Execution
// ============================================================================
//
// Both planning and execution stages declare explainFields, but they serve
// different purposes:
//
// Planning stages (verbosity: "queryPlanner"):
//   Structural fields describing the planner's decision — indexBounds,
//   keyPattern, sortPattern, etc. These appear in queryPlanner output and
//   are currently declared for documentation and future "explain the explain"
//   features, but are NOT yet surfaced in the FlowNode UI.
//
// Execution stages (verbosity: "executionStats"):
//   Runtime metrics — keysExamined, seeks, spills, spilledBytes, etc.
//   These drive metrics extraction, display formatting, and analyzer warnings.
//   Engine common fields (works, advanced, opens, closes) are added
//   automatically by getFieldsForStage() — only declare stage-specific fields.
//
// Empty array `explainFields: []` means "investigated, no stage-specific fields
// beyond engine common fields". Add a comment explaining why.

// ============================================================================
// Best Practices
// ============================================================================

/**
 * 1. Always use StageIds helper to create IDs — this ensures type safety
 * 2. Use `as const` at the end to make the object deeply readonly
 * 3. Three-layer relationship chain:
 *    Pipeline ($group) ←builtFromUserSyntax← Planning (GROUP) ←querySolutionStageType← Execution (SBE group)
 *    - Pipeline: pure user-facing abstraction
 *    - Planning: declares builtFromUserSyntax (links to pipeline)
 *    - Execution: declares querySolutionStageType (links to planning)
 * 4. Planning stage descriptions: focus on WHAT and WHY
 * 5. Execution stage descriptions: focus on HOW (engine-specific)
 * 6. Be specific in descriptions — explain WHEN and WHY this stage appears
 * 7. Add performance notes based on real-world characteristics
 * 8. Keep sourceFile references accurate
 * 9. Planning + execution stages have blockingStage/canSpillToDisk
 * 10. QuerySolutionStageType enum has 57 values from stage_types.h
 * 11. Planning stage IDs match nodeStageTypeToString() output exactly
 */
