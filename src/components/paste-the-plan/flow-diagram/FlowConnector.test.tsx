import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { FlowConnector, FlowConnectorDefs } from "./FlowConnector";
import type { FlowConnection } from "#types/flow-visualization";

describe("FlowConnector Markers", () => {
  const mockConnection: FlowConnection = {
    from: "stage1",
    to: "stage2",
    dataVolume: 1000,
    metrics: {
      nReturned: 1000,
      docsExamined: 5000,
      keysExamined: 2000,
    },
  };

  const mockFromPosition = {
    x: 100,
    y: 100,
    width: 300,
    height: 200,
  };

  const mockToPosition = {
    x: 100,
    y: 400,
    width: 300,
    height: 200,
  };

  describe("FlowConnectorDefs", () => {
    it("should render marker definitions", () => {
      const { container } = render(
        <svg>
          <FlowConnectorDefs />
        </svg>,
      );

      // Check that defs element exists
      const defs = container.querySelector("defs");
      expect(defs).toBeTruthy();

      // Check for light mode marker
      const lightMarker = container.querySelector("marker#arrowhead-light");
      expect(lightMarker).toBeTruthy();

      // Check for dark mode marker
      const darkMarker = container.querySelector("marker#arrowhead-dark");
      expect(darkMarker).toBeTruthy();
    });

    it("should have correct marker attributes for light mode", () => {
      const { container } = render(
        <svg>
          <FlowConnectorDefs />
        </svg>,
      );

      const lightMarker = container.querySelector("marker#arrowhead-light");
      expect(lightMarker).toBeTruthy();

      if (lightMarker) {
        // Check marker dimensions
        expect(lightMarker.getAttribute("markerWidth")).toBe("5");
        expect(lightMarker.getAttribute("markerHeight")).toBe("5");

        // Check orient for automatic rotation
        expect(lightMarker.getAttribute("orient")).toBe("auto");

        // Check viewBox
        const viewBox = lightMarker.getAttribute("viewBox");
        expect(viewBox).toBe("-5 -2.5 5 5");

        // Verify viewBox is correctly set
        if (viewBox) {
          const parts = viewBox.split(" ").map(Number);
          const [minX = 0, minY = 0, width = 0, height = 0] = parts;

          // ViewBox should contain the arrowhead shape (tip at 0,0, base at -4, height ±2)
          expect(minX).toBeLessThanOrEqual(-4);
          expect(minX + width).toBeGreaterThanOrEqual(0);
          expect(minY).toBeLessThanOrEqual(-2);
          expect(minY + height).toBeGreaterThanOrEqual(2);
        }
      }
    });

    it("should have arrowhead path with correct shape", () => {
      const { container } = render(
        <svg>
          <FlowConnectorDefs />
        </svg>,
      );

      const lightMarker = container.querySelector("marker#arrowhead-light");
      const path = lightMarker?.querySelector("path");

      expect(path).toBeTruthy();
      if (path) {
        const d = path.getAttribute("d");

        // Path should define a triangle with tip at origin (0,0)
        // and base at (-4, -2) to (-4, 2)
        expect(d).toBe("M0,0 L-4,-2 L-4,2 z");

        // Verify fill color
        expect(path.getAttribute("fill")).toBe("#6b7280");
      }
    });

    it("should have matching attributes for dark mode marker", () => {
      const { container } = render(
        <svg>
          <FlowConnectorDefs />
        </svg>,
      );

      const darkMarker = container.querySelector("marker#arrowhead-dark");
      expect(darkMarker).toBeTruthy();

      if (darkMarker) {
        expect(darkMarker.getAttribute("markerWidth")).toBe("5");
        expect(darkMarker.getAttribute("markerHeight")).toBe("5");
        expect(darkMarker.getAttribute("orient")).toBe("auto");

        const path = darkMarker.querySelector("path");
        expect(path?.getAttribute("fill")).toBe("#9ca3af");
      }
    });
  });

  describe("FlowConnector", () => {
    it("should reference the correct marker", () => {
      // Mock document.documentElement.classList for theme detection
      const originalClassList = document.documentElement.classList;
      Object.defineProperty(document.documentElement, "classList", {
        value: { contains: () => false }, // Light mode
        writable: true,
        configurable: true,
      });

      const { container } = render(
        <svg>
          <FlowConnectorDefs />
          <FlowConnector
            connection={mockConnection}
            fromPosition={mockFromPosition}
            toPosition={mockToPosition}
          />
        </svg>,
      );

      const path = container.querySelector("path[marker-end]");
      expect(path).toBeTruthy();

      if (path) {
        const markerEnd = path.getAttribute("marker-end");
        expect(markerEnd).toBe("url(#arrowhead-light)");
      }

      // Restore original classList
      Object.defineProperty(document.documentElement, "classList", {
        value: originalClassList,
        writable: true,
        configurable: true,
      });
    });

    it("should use dark marker in dark mode", () => {
      // Mock document.documentElement.classList for dark mode
      const originalClassList = document.documentElement.classList;
      Object.defineProperty(document.documentElement, "classList", {
        value: { contains: (className: string) => className === "dark" },
        writable: true,
        configurable: true,
      });

      const { container } = render(
        <svg>
          <FlowConnectorDefs />
          <FlowConnector
            connection={mockConnection}
            fromPosition={mockFromPosition}
            toPosition={mockToPosition}
          />
        </svg>,
      );

      const path = container.querySelector("path[marker-end]");
      expect(path).toBeTruthy();

      if (path) {
        const markerEnd = path.getAttribute("marker-end");
        expect(markerEnd).toBe("url(#arrowhead-dark)");
      }

      // Restore original classList
      Object.defineProperty(document.documentElement, "classList", {
        value: originalClassList,
        writable: true,
        configurable: true,
      });
    });

    it("should create proper curved path", () => {
      const { container } = render(
        <svg>
          <FlowConnector
            connection={mockConnection}
            fromPosition={mockFromPosition}
            toPosition={mockToPosition}
          />
        </svg>,
      );

      const path = container.querySelector("path");
      expect(path).toBeTruthy();

      if (path) {
        const d = path.getAttribute("d");

        // Verify it's a cubic bezier curve (starts with M, has C command)
        expect(d).toMatch(/^M\s+[\d.]+\s+[\d.]+\s+C/);
      }
    });
  });

  describe("Marker positioning validation", () => {
    it("should use refX=-4 to place arrowhead base at path endpoint", () => {
      const { container } = render(
        <svg>
          <FlowConnectorDefs />
        </svg>,
      );

      const marker = container.querySelector("marker#arrowhead-light");
      const path = marker?.querySelector("path");

      if (marker && path) {
        const refX = Number(marker.getAttribute("refX"));
        const pathD = path.getAttribute("d");

        // The arrowhead path is: M0,0 L-4,-2 L-4,2 z
        // - Tip at (0, 0)
        // - Base at x = -4

        // Current approach:
        // - refX=-4 places the arrowhead base at the path endpoint
        // - The arrowhead extends forward with tip touching the node
        // - Path ends 4px below node edge (at arrowhead base)

        expect(refX).toBe(-4);
        expect(pathD).toBe("M0,0 L-4,-2 L-4,2 z");
      }
    });

    it("should have viewBox that contains the arrowhead shape", () => {
      const { container } = render(
        <svg>
          <FlowConnectorDefs />
        </svg>,
      );

      const marker = container.querySelector("marker#arrowhead-light");

      if (marker) {
        const viewBox = marker.getAttribute("viewBox");
        expect(viewBox).toBeTruthy();

        if (viewBox) {
          const parts = viewBox.split(" ").map(Number);
          const [minX = 0, minY = 0, width = 0, height = 0] = parts;

          // The arrowhead extends from x=-4 to x=0, y=-2 to y=2
          // Check if viewBox contains the arrowhead
          expect(minX).toBeLessThanOrEqual(-4);
          expect(minX + width).toBeGreaterThanOrEqual(0);
          expect(minY).toBeLessThanOrEqual(-2);
          expect(minY + height).toBeGreaterThanOrEqual(2);
        }
      }
    });
  });
});
