export interface LayoutConfig {
  readonly nodeWidth: number;
  readonly nodeHeight: number;
  readonly horizontalSpacing: number;
  readonly verticalSpacing: number;
  readonly containerPadding: number;
  readonly minNodeSpacing: number;
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  nodeWidth: 300,
  nodeHeight: 280,
  horizontalSpacing: 80,
  verticalSpacing: 80,
  containerPadding: 20,
  minNodeSpacing: 40,
};
