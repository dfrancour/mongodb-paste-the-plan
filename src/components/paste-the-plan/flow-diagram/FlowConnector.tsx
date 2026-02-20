"use client";

import type { FlowConnection } from "#types/flow-visualization";

interface FlowConnectorProps {
  readonly connection: FlowConnection;
  readonly fromPosition: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  readonly toPosition: { x: number; y: number; width: number; height: number };
}

/**
 * Connector component that draws arrows between flow nodes
 *
 * This component creates SVG arrows with data volume indicators,
 * supporting bottom-to-top data flow (MongoDB Compass style).
 */
export function FlowConnector({
  connection,
  fromPosition,
  toPosition,
}: FlowConnectorProps) {
  // Calculate connection points for bottom-to-top flow (MongoDB Compass style)
  // Apply anchor offsets to distribute connections across node edges
  const fromAnchorOffset = connection.fromAnchorOffsetX ?? 0;
  const toAnchorOffset = connection.toAnchorOffsetX ?? 0;

  const fromX = fromPosition.x + fromPosition.width / 2 + fromAnchorOffset; // Exit from top of source
  const fromY = fromPosition.y;
  const toX = toPosition.x + toPosition.width / 2 + toAnchorOffset; // Enter bottom of destination
  const toY = toPosition.y + toPosition.height;

  // Check if dark mode is active
  const isDark = document.documentElement.classList.contains("dark");

  // Use consistent, semantic styling for all connectors
  const thickness = 2; // Consistent thickness
  const color = isDark ? "#9ca3af" : "#6b7280"; // Neutral gray with dark mode support
  const boxFill = isDark ? "#374151" : "white"; // Background box color
  const boxStroke = isDark ? "#6b7280" : "#d1d5db"; // Border color
  const textFill = isDark ? "#d1d5db" : "#374151"; // Text color

  // Create curved path for better visual flow (bottom-to-top)
  const ARROWHEAD_LENGTH = 4;
  const midY = (fromY + toY) / 2;

  // Path ends 7px below the node edge (3px more than arrowhead length)
  // This creates a 3px gap so the arrowhead tip doesn't clip behind the node
  const pathD = `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY + ARROWHEAD_LENGTH + 3}`;

  // Select marker based on theme
  const markerId = isDark ? "arrowhead-dark" : "arrowhead-light";

  // Calculate label position
  const labelX = fromX + (toX - fromX) / 2;
  const labelY = midY;

  return (
    <g>
      {/* Main curved arrow line with arrowhead marker */}
      <path
        d={pathD}
        stroke={color}
        strokeWidth={thickness}
        fill="none"
        strokeDasharray="none"
        markerEnd={`url(#${markerId})`}
      />

      {/* Data flow label with background box */}
      {connection.dataVolume > 0 && (
        <g>
          {/* Background box */}
          <rect
            x={labelX - 25}
            y={labelY - 8}
            width="50"
            height="16"
            rx="4"
            fill={boxFill}
            stroke={boxStroke}
            strokeWidth="1"
            className="pointer-events-none"
          />
          {/* Label text */}
          <text
            x={labelX}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            className="pointer-events-none text-xs font-medium"
            fill={textFill}
            style={{ userSelect: "none" }}
          >
            {connection.dataVolume.toLocaleString()}
          </text>
        </g>
      )}

      {/* Simple tooltip with just the flow count */}
      {connection.dataVolume > 0 && (
        <title>{connection.dataVolume.toLocaleString()} documents</title>
      )}
    </g>
  );
}

/**
 * SVG definitions for arrow markers
 * Creates reusable arrowhead markers for both light and dark themes
 *
 * The marker reference point (refX=-4, refY=0) is at the arrowhead base.
 * The path ends at the base position, and the arrowhead extends forward
 * with its tip touching the node edge.
 */
export function FlowConnectorDefs() {
  return (
    <defs>
      {/* Light mode arrow marker */}
      <marker
        id="arrowhead-light"
        markerWidth="5"
        markerHeight="5"
        refX="-4"
        refY="0"
        orient="auto"
        viewBox="-5 -2.5 5 5"
      >
        <path d="M0,0 L-4,-2 L-4,2 z" fill="#6b7280" />
      </marker>

      {/* Dark mode arrow marker */}
      <marker
        id="arrowhead-dark"
        markerWidth="5"
        markerHeight="5"
        refX="-4"
        refY="0"
        orient="auto"
        viewBox="-5 -2.5 5 5"
      >
        <path d="M0,0 L-4,-2 L-4,2 z" fill="#9ca3af" />
      </marker>
    </defs>
  );
}
