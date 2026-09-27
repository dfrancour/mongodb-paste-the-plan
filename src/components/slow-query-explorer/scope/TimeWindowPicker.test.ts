import { describe, it, expect } from "vitest";
import { boundFromInput } from "./TimeWindowPicker";

const captureStart = new Date("2026-09-02T22:32:48.123Z");
const captureEnd = new Date("2026-09-04T20:45:10.900Z");
const bound = (text: string) => boundFromInput(text, captureStart, captureEnd);

describe("boundFromInput", () => {
  it("reads a time inside the capture as UTC", () => {
    expect(bound("2026-09-03T01:00:00")).toEqual(
      new Date("2026-09-03T01:00:00Z"),
    );
  });

  it("treats the capture's own bounds, empty, and garbage as no bound", () => {
    expect(bound("2026-09-02T22:32:48")).toBeNull();
    expect(bound("2026-09-04T20:45:10")).toBeNull();
    expect(bound("")).toBeNull();
    expect(bound("not a date")).toBeNull();
  });

  it("pulls a time outside the capture back to its edge", () => {
    expect(bound("2026-09-01T00:00:00")).toBe(captureStart);
    expect(bound("2026-09-09T00:00:00")).toBe(captureEnd);
  });
});
