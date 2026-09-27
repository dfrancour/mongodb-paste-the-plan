"use client";

import { useState, type DragEvent } from "react";

/**
 * Drag-and-drop of a single file onto an element. Spread `dropProps` on the
 * target; `isDragging` is true while a drag hovers over it.
 */
export function useFileDrop(onFile: (file: File) => void) {
  const [isDragging, setIsDragging] = useState(false);
  const dropProps = {
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    },
    onDragLeave: (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
  };
  return { isDragging, dropProps };
}
