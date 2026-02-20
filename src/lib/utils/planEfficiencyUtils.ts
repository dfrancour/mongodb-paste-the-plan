/**
 * Formatting utilities for plan efficiency metrics
 */

/**
 * Format efficiency as percentage
 */
export function formatEfficiency(efficiency: number): string {
  return `${(efficiency * 100).toFixed(1)}%`;
}

/**
 * Format large numbers with locale-appropriate separators
 */
export function formatMetricNumber(num: number): string {
  return num.toLocaleString();
}
