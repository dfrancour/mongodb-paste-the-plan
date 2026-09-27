"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { Timeline, TimeWindow } from "#lib/slow-query";
import { formatDurationMs } from "#lib/utils/formatters";
import { TimelineTooltip } from "./TimelineTooltip";
import {
  bucketWindow,
  snapWindow,
  stackBucket,
  xTicks,
  type Segment,
} from "./timelineLayout";

interface TimelineChartProps {
  readonly timeline: Timeline;
  readonly selectedId: number | undefined;
  /** Entries to pick out while a group row is hovered; empty means none. */
  readonly highlightedIds: ReadonlySet<number>;
  readonly onBrush: (window: TimeWindow) => void;
  readonly onSelectEntry: (id: number) => void;
}

const WIDTH = 1000;
const HEIGHT = 112;
const BAR_GAP = 2;
const SEGMENT_GAP = 1;
/** Segments per bucket before the smallest entries merge into one. */
const MAX_SEGMENTS = 24;
const TICK_COUNT = 6;
/** Pointer travel, in pixels, that turns a press into a brush. */
const DRAG_THRESHOLD_PX = 4;

interface Hover {
  readonly bucketIndex: number;
  readonly segment: Segment;
}

interface Brush {
  readonly from: number;
  readonly to: number;
  readonly startClientX: number;
  readonly dragged: boolean;
}

/**
 * The timeline's metric per bucket, each bucket a stack of its entries with
 * the largest at the bottom. Hover shows the entry, click opens it, and
 * dragging across buckets narrows the time window to them.
 */
export function TimelineChart({
  timeline,
  selectedId,
  highlightedIds,
  onBrush,
  onSelectEntry,
}: TimelineChartProps) {
  const { buckets, bucketMs, metric } = timeline;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const draggedRef = useRef(false);
  const [hover, setHover] = useState<Hover | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0, width: 0 });
  const [brush, setBrush] = useState<Brush | null>(null);

  useEffect(() => {
    if (!brush) return;
    const finish = () => {
      if (brush.dragged) onBrush(snapWindow(timeline, brush.from, brush.to));
      setBrush(null);
    };
    window.addEventListener("pointerup", finish);
    return () => window.removeEventListener("pointerup", finish);
  }, [brush, timeline, onBrush]);

  if (buckets.length === 0) return null;

  const max = Math.max(...buckets.map((b) => b.total), 1);
  const slot = WIDTH / buckets.length;
  const barWidth = Math.max(1, slot - BAR_GAP);

  const fractionOf = (event: PointerEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  };

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    draggedRef.current = false;
    const at = fractionOf(event);
    setBrush({ from: at, to: at, startClientX: event.clientX, dragged: false });
  };

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const wrapper = wrapperRef.current?.getBoundingClientRect();
    if (wrapper) {
      setPointer({
        x: event.clientX - wrapper.left,
        y: event.clientY - wrapper.top,
        width: wrapper.width,
      });
    }
    if (!brush) return;
    const dragged =
      brush.dragged ||
      Math.abs(event.clientX - brush.startClientX) > DRAG_THRESHOLD_PX;
    draggedRef.current = dragged;
    setBrush({ ...brush, to: fractionOf(event), dragged });
  };

  const onSegmentClick = (bucketIndex: number, segment: Segment) => {
    if (draggedRef.current) return;
    if (segment.kind === "entry") onSelectEntry(segment.entry.id);
    else onBrush(bucketWindow(timeline, bucketIndex));
  };

  const brushRange = brush?.dragged ? brushBounds(brush, buckets.length) : null;

  return (
    <figure className="space-y-1">
      <div
        ref={wrapperRef}
        className="relative"
        onPointerLeave={() => setHover(null)}
      >
        <GridLabel top={0} text={formatDurationMs(max)} />
        <GridLabel top={50} text={formatDurationMs(max / 2)} />
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="h-28 w-full cursor-crosshair touch-none select-none"
          role="img"
          aria-label={`Timeline of ${buckets.length} buckets; the tallest holds ${formatDurationMs(max)} of ${metric.label.toLowerCase()}.`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
        >
          <line
            x1={0}
            x2={WIDTH}
            y1={HEIGHT / 2}
            y2={HEIGHT / 2}
            className="stroke-neutral-200 dark:stroke-neutral-700"
            strokeDasharray="4 4"
          />
          <line
            x1={0}
            x2={WIDTH}
            y1={HEIGHT - 0.5}
            y2={HEIGHT - 0.5}
            className="stroke-neutral-300 dark:stroke-neutral-600"
          />
          {buckets.map((bucket, i) => (
            <g key={bucket.start.getTime()}>
              {stackBucket(bucket, metric, max, HEIGHT - 4, MAX_SEGMENTS).map(
                (segment, j) => {
                  const hovered =
                    hover?.bucketIndex === i && hover.segment === segment;
                  const selected =
                    segment.kind === "entry" && segment.entry.id === selectedId;
                  const key =
                    segment.kind === "entry" ? segment.entry.id : "rest";
                  return (
                    <rect
                      key={key}
                      x={i * slot}
                      y={segment.y + 4}
                      width={barWidth}
                      height={Math.max(
                        0.5,
                        segment.height -
                          (j > 0 && segment.height > 3 * SEGMENT_GAP
                            ? SEGMENT_GAP
                            : 0),
                      )}
                      className={segmentClass(
                        segment,
                        hovered,
                        selected,
                        highlightOf(segment, highlightedIds),
                      )}
                      vectorEffect="non-scaling-stroke"
                      onPointerEnter={() =>
                        setHover({ bucketIndex: i, segment })
                      }
                      onClick={() => onSegmentClick(i, segment)}
                    />
                  );
                },
              )}
            </g>
          ))}
          {brushRange && (
            <rect
              x={brushRange.lo * slot}
              y={0}
              width={(brushRange.hi - brushRange.lo + 1) * slot - BAR_GAP}
              height={HEIGHT}
              className="fill-primary/20 stroke-primary pointer-events-none"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        {hover && !brush && (
          <TimelineTooltip
            bucket={buckets[hover.bucketIndex]!}
            metric={metric}
            bucketMs={bucketMs}
            segment={hover.segment}
            x={pointer.x}
            y={pointer.y}
            width={pointer.width}
          />
        )}
      </div>
      <div className="relative h-4 font-mono text-[10px] text-neutral-500 dark:text-neutral-400">
        {xTicks(timeline, TICK_COUNT).map((tick) => (
          <span
            key={tick.at}
            className="absolute border-l border-neutral-300 pl-1 leading-4 dark:border-neutral-600"
            style={{ left: `${tick.at * 100}%` }}
          >
            {tick.label}
          </span>
        ))}
        <span className="absolute right-0 leading-4">UTC</span>
      </div>
    </figure>
  );
}

function GridLabel({
  top,
  text,
}: {
  readonly top: number;
  readonly text: string;
}) {
  return (
    <span
      className="pointer-events-none absolute left-0 -translate-y-1/2 rounded bg-white/80 px-1 font-mono text-[10px] text-neutral-500 dark:bg-neutral-800/80 dark:text-neutral-400"
      style={{ top: `${top}%` }}
    >
      {text}
    </span>
  );
}

function brushBounds(brush: Brush, bucketCount: number) {
  const index = (at: number) =>
    Math.min(bucketCount - 1, Math.max(0, Math.floor(at * bucketCount)));
  return {
    lo: index(Math.min(brush.from, brush.to)),
    hi: index(Math.max(brush.from, brush.to)),
  };
}

type Highlight = "none" | "on" | "off";

function highlightOf(
  segment: Segment,
  highlightedIds: ReadonlySet<number>,
): Highlight {
  if (highlightedIds.size === 0) return "none";
  const entries = segment.kind === "entry" ? [segment.entry] : segment.entries;
  return entries.some((e) => highlightedIds.has(e.id)) ? "on" : "off";
}

function segmentClass(
  segment: Segment,
  hovered: boolean,
  selected: boolean,
  highlight: Highlight,
): string {
  const fill =
    segment.kind === "rest"
      ? "fill-neutral-400 dark:fill-neutral-500"
      : "fill-primary";
  const outline =
    hovered || selected ? "stroke-neutral-900 dark:stroke-white" : "";
  const opacity =
    hovered || selected || highlight === "on"
      ? "opacity-100"
      : highlight === "off"
        ? "opacity-20"
        : segment.kind === "rest"
          ? "opacity-60"
          : "opacity-70";
  return `cursor-pointer transition-opacity ${fill} ${outline} ${opacity}`;
}
