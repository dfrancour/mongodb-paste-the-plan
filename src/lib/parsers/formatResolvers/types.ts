import type {
  ExplainPlan,
  ExecutionStage,
  PlanStage,
} from "#types/explain-plan";

/** The uniform result of resolving a MongoDB explain format */
export type FormatResolution = {
  /** Raw root stage for plan visualization (from queryPlanner.winningPlan) */
  readonly planRoot: PlanStage | null;
  /** Raw root stage for execution visualization (from executionStats.executionStages) */
  readonly executionRoot: ExecutionStage | null;
};

/** A format resolver attempts to extract plan/execution roots from a specific MongoDB format */
export type FormatResolver = (plan: ExplainPlan) => FormatResolution | null;
