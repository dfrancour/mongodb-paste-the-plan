/**
 * Unified plan parsing pipeline.
 *
 * One function call → complete result. Consumers never need to call
 * parse, detect, normalize, and extract SBE separately.
 */
import type {
  ExplainPlan,
  NormalizedPlanStage,
  NormalizedExecutionStage,
  ParsedSBEPlan,
  HybridSBEPlan,
} from "#types/explain-plan";
import { explainPlanSchema } from "#types/explain-plan";
import { PlanParseError } from "./errors";
import { transformExtendedJSON } from "./extendedJson";
import { detectPlanMode, detectExplainMode, isSBEPlan } from "./detection";
import { resolveFormat } from "./formatResolvers";
import { normalizeFromResolution } from "./normalization";
import { extractSBEPlan, extractHybridSBEPlan } from "./sbeExtractor";

// ============================================================================
// Result type
// ============================================================================

/** Complete result of parsing a MongoDB explain plan */
export type ParsedPlan = {
  /** Validated ExplainPlan (Zod-parsed, Extended JSON transformed) */
  readonly raw: ExplainPlan;
  /** Whether plan has execution data or just structure */
  readonly planMode: "plan" | "execution";
  /** Which MongoDB explain verbosity was used */
  readonly explainMode: "queryPlanner" | "executionStats" | "allPlansExecution";
  /** Whether this is an SBE plan */
  readonly isSBE: boolean;
  /** Normalized plan tree (structural only, always available) */
  readonly plan: NormalizedPlanStage;
  /** Normalized execution tree (with metrics, null if queryPlanner-only) */
  readonly execution: NormalizedExecutionStage | null;
  /** SBE plan details (null for classic engine) */
  readonly sbe: ParsedSBEPlan | null;
  /** Hybrid SBE plan (null if full SBE or classic) */
  readonly hybridSBE: HybridSBEPlan | null;
};

// ============================================================================
// Pipeline
// ============================================================================

/**
 * Parse a raw MongoDB explain plan into a complete, normalized result.
 *
 * This is the main entry point for all plan parsing. It:
 * 1. Validates and transforms Extended JSON
 * 2. Detects plan mode and explain verbosity
 * 3. Normalizes plan and execution trees
 * 4. Extracts SBE data when applicable
 */
export function parsePlan(rawInput: unknown): ParsedPlan {
  const raw = validatePlan(rawInput);
  const planMode = detectPlanMode(raw);
  const explainMode = detectExplainMode(raw);
  const isSBE = isSBEPlan(raw);

  // Resolve format once, normalize both trees from the same resolution
  const resolution = resolveFormat(raw);
  const { plan, execution } = normalizeFromResolution(resolution, raw);

  let sbe: ParsedSBEPlan | null = null;
  let hybridSBE: HybridSBEPlan | null = null;

  if (isSBE) {
    sbe = extractSBEPlan(raw);
    if (!sbe) {
      hybridSBE = extractHybridSBEPlan(raw);
    }
  }

  return { raw, planMode, explainMode, isSBE, plan, execution, sbe, hybridSBE };
}

// ============================================================================
// Validation (extracted from PlanParser.parse)
// ============================================================================

/**
 * Validate and parse raw input into an ExplainPlan.
 * Transforms Extended JSON, validates with Zod schema, and falls back
 * to lenient parsing when the structure is recognizable.
 *
 * Use this when you only need a validated ExplainPlan without normalization.
 * For the full pipeline (validate + normalize + SBE extract), use `parsePlan()`.
 */
export function validatePlan(rawInput: unknown): ExplainPlan {
  try {
    const transformed = transformExtendedJSON(rawInput);
    const parsed = explainPlanSchema.parse(transformed);

    const hasExplainStructure =
      parsed.queryPlanner !== undefined ||
      parsed.executionStats !== undefined ||
      parsed.stages !== undefined ||
      parsed.stage !== undefined ||
      parsed.shards !== undefined;

    if (!hasExplainStructure) {
      throw new PlanParseError(
        "Not a recognized MongoDB explain plan: missing queryPlanner, executionStats, stages, stage, or shards",
      );
    }

    return parsed;
  } catch (error) {
    if (error instanceof PlanParseError) throw error;

    let errorMessage = "Invalid MongoDB explain plan format";

    if (error && typeof error === "object") {
      if ("issues" in error) {
        const zodError = error as {
          issues: Array<{ path: string[]; message: string }>;
        };
        const issueDetails = zodError.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; ");
        errorMessage += `: ${issueDetails}`;
      } else if ("message" in error) {
        errorMessage += `: ${(error as Error).message}`;
      }
    }

    // Fallback: if raw input has recognizable explain structure, build minimal plan
    if (rawInput && typeof rawInput === "object") {
      const plan = rawInput as Record<string, unknown>;

      const hasExplainStructure =
        "queryPlanner" in plan ||
        "executionStats" in plan ||
        "stages" in plan ||
        "stage" in plan ||
        "shards" in plan;

      if (!hasExplainStructure) {
        throw new PlanParseError(errorMessage, error);
      }

      console.warn(
        "Using fallback plan parsing due to schema validation failure",
      );

      return {
        explainVersion:
          typeof plan.explainVersion === "string"
            ? plan.explainVersion
            : undefined,
        queryPlanner:
          plan.queryPlanner && typeof plan.queryPlanner === "object"
            ? (plan.queryPlanner as Record<string, unknown>)
            : undefined,
        executionStats:
          plan.executionStats && typeof plan.executionStats === "object"
            ? (plan.executionStats as Record<string, unknown>)
            : undefined,
        command:
          plan.command && typeof plan.command === "object"
            ? (plan.command as Record<string, unknown>)
            : undefined,
        serverInfo:
          plan.serverInfo && typeof plan.serverInfo === "object"
            ? (plan.serverInfo as Record<string, unknown>)
            : undefined,
        serverParameters:
          plan.serverParameters && typeof plan.serverParameters === "object"
            ? (plan.serverParameters as Record<string, unknown>)
            : undefined,
        stage: typeof plan.stage === "string" ? plan.stage : undefined,
        inputStage:
          plan.inputStage && typeof plan.inputStage === "object"
            ? (plan.inputStage as Record<string, unknown>)
            : undefined,
        inputStages: Array.isArray(plan.inputStages)
          ? (plan.inputStages as Record<string, unknown>[])
          : undefined,
      } as ExplainPlan;
    }

    throw new PlanParseError(errorMessage, error);
  }
}
