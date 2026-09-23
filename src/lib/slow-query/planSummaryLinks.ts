import { STAGES, getStageAnchorId } from "#data/stages";
import type { StageDefinition } from "#data/stages/types";

const GLOSSARY_PATH = "/mongodb-stage-glossary";
const LAYERS = ["execution", "planning", "mongos", "pipeline"] as const;

/** Glossary deep link for a plan-summary stage token such as `IXSCAN`, or undefined if the catalog lacks it. */
export function glossaryHrefForStage(stage: string): string | undefined {
  for (const layer of LAYERS) {
    const definition: StageDefinition | undefined = STAGES[layer][stage];
    if (definition) return `${GLOSSARY_PATH}#${getStageAnchorId(definition)}`;
  }
  return undefined;
}
