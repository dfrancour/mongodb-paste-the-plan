import {
  calculateLayout,
  calculateSBELayout,
  calculateSBELayoutForStages,
  transformToFlowStages,
} from "./layout";

/**
 * Facade preserving the original static-class API.
 * All layout logic lives in ./layout/ modules.
 */
export class FlowLayoutEngine {
  static calculateLayout = calculateLayout;
  static transformToFlowStages = transformToFlowStages;
  static calculateSBELayout = calculateSBELayout;
  static calculateSBELayoutForStages = calculateSBELayoutForStages;
}
