"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { useSyncExternalStore, type ReactNode } from "react";

interface TooltipProviderProps {
  readonly children: ReactNode;
  readonly delayDuration?: number;
}

/**
 * Tooltip provider - wrap your app or section with this to enable tooltips.
 *
 * Place this once at the root of your app (in layout.tsx) rather than
 * creating a new provider for each tooltip instance.
 */
export function TooltipProvider({
  children,
  delayDuration = 200,
}: TooltipProviderProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

interface TooltipProps {
  readonly children: ReactNode;
  readonly content: ReactNode;
  readonly side?: "top" | "right" | "bottom" | "left";
  readonly align?: "start" | "center" | "end";
}

// Detect devices with precise hover (mouse/trackpad) vs touch-primary devices.
// Using both hover AND pointer ensures we catch touch devices that falsely report hover.
const DESKTOP_QUERY = "(hover: hover) and (pointer: fine)";

function subscribeToHoverCapability(callback: () => void): () => void {
  const mediaQuery = window.matchMedia(DESKTOP_QUERY);
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getHoverCapabilitySnapshot(): boolean {
  return !window.matchMedia(DESKTOP_QUERY).matches;
}

function getServerSnapshot(): boolean {
  // Default to non-touch (desktop) on server for SSR
  return false;
}

/**
 * Detect if the device is touch-primary (no hover capability).
 * Uses useSyncExternalStore for proper React 18 external state subscription.
 */
function useTouchDevice(): boolean {
  return useSyncExternalStore(
    subscribeToHoverCapability,
    getHoverCapabilitySnapshot,
    getServerSnapshot,
  );
}

const tooltipContentStyles =
  "z-50 max-w-xs rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-neutral-700 dark:bg-neutral-800";

/**
 * Hover-only tooltip using Radix UI Tooltip.
 * Used on desktop devices with hover capability.
 */
function HoverTooltip({ children, content, side, align }: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={5}
          className={tooltipContentStyles}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-white dark:fill-neutral-800" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

/**
 * Tap-to-open tooltip using Radix UI Popover.
 * Used on touch devices where hover isn't available.
 */
function TapTooltip({ children, content, side, align }: TooltipProps) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>{children}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side={side}
          align={align}
          sideOffset={5}
          className={tooltipContentStyles}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {content}
          <PopoverPrimitive.Arrow className="fill-white dark:fill-neutral-800" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

/**
 * Adaptive tooltip component that works on both desktop and mobile.
 *
 * - Desktop (hover capable): Shows tooltip on hover
 * - Mobile (touch only): Shows tooltip on tap, closes on tap outside
 *
 * Use for supplementary information that doesn't need to be visible at all times.
 * Requires TooltipProvider to be present in the component tree (typically in layout.tsx).
 */
export function Tooltip({
  children,
  content,
  side = "top",
  align = "center",
}: TooltipProps) {
  const isTouchDevice = useTouchDevice();

  // Use tap-to-open on touch devices, hover on desktop
  if (isTouchDevice) {
    return (
      <TapTooltip content={content} side={side} align={align}>
        {children}
      </TapTooltip>
    );
  }

  return (
    <HoverTooltip content={content} side={side} align={align}>
      {children}
    </HoverTooltip>
  );
}
