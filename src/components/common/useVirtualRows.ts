"use client";

import type { RefObject } from "react";
import { observeElementRect, useVirtualizer } from "@tanstack/react-virtual";

const ESTIMATED_ROW_PX = 36;
/** Height assumed until the scroll area can be measured, so rows render before layout and where ResizeObserver is missing. */
const INITIAL_VIEWPORT_PX = 640;

/**
 * Window a list of rows to the ones in view inside `scrollRef`. Returns the
 * items to render and the space to leave above and below them.
 */
export function useVirtualRows(
  count: number,
  scrollRef: RefObject<HTMLDivElement | null>,
) {
  "use no memo";
  // eslint-disable-next-line react-hooks/incompatible-library -- the directive above opts this hook out of the compiler
  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_PX,
    overscan: 20,
    initialRect: { width: 0, height: INITIAL_VIEWPORT_PX },
    observeElementRect: (instance, callback) => {
      if (typeof ResizeObserver === "undefined") {
        callback({ width: 0, height: INITIAL_VIEWPORT_PX });
        return;
      }
      return observeElementRect(instance, callback);
    },
  });
  const items = virtualizer.getVirtualItems();
  return {
    items,
    measureRow: virtualizer.measureElement,
    paddingTop: items[0]?.start ?? 0,
    paddingBottom:
      items.length > 0 ? virtualizer.getTotalSize() - items.at(-1)!.end : 0,
  };
}
