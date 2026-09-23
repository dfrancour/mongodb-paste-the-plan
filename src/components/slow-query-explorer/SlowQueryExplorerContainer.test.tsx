import { describe, it, expect, beforeAll, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SlowQueryExplorerContainer } from "./SlowQueryExplorerContainer";
import { loadSlowQueryLogFixture } from "#test-utils/slow-query-fixtures";

const fixture = loadSlowQueryLogFixture("6.0/standalone/slow-queries.jsonl");
const firstLines = (count: number) =>
  fixture.split("\n").filter(Boolean).slice(0, count).join("\n");

const entriesTable = () => screen.getByRole("table", { name: "Log entries" });
const groupsTable = () => screen.getByRole("table", { name: "Query groups" });
/** The entry count in the filter card: "N entries", or "N of M entries" while filtered. */
const countText = () =>
  screen
    .getByText(/\d+ entries$/)
    .textContent!.replace(/\s+/g, " ")
    .trim();
const groupBy = (label: string) =>
  within(screen.getByRole("group", { name: "Group by" })).getByRole("button", {
    name: label,
  });

async function loadLog(text: string) {
  const user = userEvent.setup();
  render(<SlowQueryExplorerContainer />);
  const textarea = screen.getByLabelText("Slow query log lines");
  // A paste into the empty box explores it straight away.
  await user.click(textarea);
  await user.paste(text);
  return user;
}

describe("SlowQueryExplorerContainer", () => {
  beforeAll(() => {
    // CodeViewer observes its own visibility; jsdom has no IntersectionObserver.
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  it("loads pasted log lines and lists them", async () => {
    await loadLog(firstLines(30));
    expect(screen.getByText("30 entries")).toBeInTheDocument();
    const table = entriesTable();
    expect(within(table).getAllByRole("row").length).toBe(31);
  });

  it("opens the detail drawer for a clicked row and steps with j/k", async () => {
    const user = await loadLog(firstLines(30));
    const rows = within(entriesTable()).getAllByRole("row");
    await user.click(rows[1]!);
    const drawer = screen.getByRole("dialog");
    expect(within(drawer).getByText("Raw log entry")).toBeInTheDocument();
    expect(within(drawer).getByText("durationMillis")).toBeInTheDocument();

    await user.keyboard("j");
    expect(rows[2]).toHaveAttribute("aria-selected", "true");
    expect(rows[1]).toHaveAttribute("aria-selected", "false");
    await user.keyboard("k");
    expect(rows[1]).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("narrows by search text", async () => {
    const user = await loadLog(firstLines(60));
    await user.type(
      screen.getByRole("textbox", { name: /search/i }),
      "no-such-text-anywhere",
    );
    expect(countText()).toBe("0 of 60 entries");
    await user.click(
      screen.getByRole("button", { name: /clear all filters/i }),
    );
    expect(screen.getByText("60 entries")).toBeInTheDocument();
  });

  it("narrows everything by a clicked group, and drills down across dimensions", async () => {
    const user = await loadLog(firstLines(60));

    await user.click(groupBy("Command"));
    const groupRows = within(groupsTable()).getAllByRole("row").slice(1);
    expect(groupRows.length).toBeGreaterThan(1);
    // Cumulative time bars are scaled to the longest group, which is first.
    const barWidths = groupRows.map((row) =>
      parseFloat(
        row.querySelector<HTMLElement>(".bg-primary.rounded-full")!.style.width,
      ),
    );
    expect(barWidths[0]).toBe(100);
    expect(barWidths).toEqual([...barWidths].sort((x, y) => y - x));

    await user.click(groupRows[0]!);
    // Grouped by the selected dimension, every row stays and one is selected.
    const rowsAfter = within(groupsTable()).getAllByRole("row").slice(1);
    expect(rowsAfter).toHaveLength(groupRows.length);
    expect(rowsAfter[0]).toHaveAttribute("aria-selected", "true");
    expect(rowsAfter[1]).toHaveAttribute("aria-selected", "false");
    expect(countText()).toMatch(/^\d+ of 60 entries$/);

    // Switching dimension keeps the chip and groups only the narrowed entries.
    await user.click(groupBy("Namespace"));
    const narrowedRows = within(groupsTable()).getAllByRole("row").slice(1);
    const counted = narrowedRows.reduce(
      (n, row) => n + Number(within(row).getAllByRole("cell")[3]!.textContent),
      0,
    );
    expect(counted).toBeLessThan(60);

    await user.click(screen.getByRole("button", { name: /^clear command /i }));
    expect(screen.getByText("60 entries")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^clear command /i }),
    ).not.toBeInTheDocument();
  });

  it("narrows by a facet, a threshold, and a finding", async () => {
    const user = await loadLog(fixture);
    const total = /^(\d+) entries$/.exec(countText())![1];

    await user.click(
      screen.getByRole("button", { name: "Namespace", expanded: false }),
    );
    await user.click(
      within(screen.getByRole("dialog")).getByRole("checkbox", {
        name: /shopdb\.customers/,
      }),
    );
    await user.keyboard("{Escape}");
    expect(countText()).not.toBe(`${total} entries`);
    await user.click(
      screen.getByRole("button", {
        name: /^clear namespace shopdb\.customers/i,
      }),
    );

    await user.click(
      screen.getByRole("button", { name: "Thresholds", expanded: false }),
    );
    await user.type(screen.getByLabelText("durationMillis at least"), "1s");
    expect(countText()).toBe(`0 of ${total} entries`);
    await user.clear(screen.getByLabelText("durationMillis at least"));
    await user.keyboard("{Escape}");
    expect(countText()).toBe(`${total} entries`);

    await user.click(
      screen.getByRole("button", { name: "Findings", expanded: false }),
    );
    await user.click(
      screen.getByRole("checkbox", { name: /collection scan/i }),
    );
    const shown = Number(/^(\d+) of/.exec(countText())![1]);
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(Number(total));
    await user.keyboard("{Escape}");
    await user.click(
      screen.getByRole("button", { name: /^clear finding collection scan/i }),
    );
    expect(countText()).toBe(`${total} entries`);
  });

  it("explains when the input holds no slow query entries", async () => {
    await loadLog('{"msg":"Connection accepted","attr":{}}');
    expect(screen.getByText(/No slow query entries found/)).toBeInTheDocument();
  });

  it("returns to the input on reset", async () => {
    const user = await loadLog(firstLines(5));
    await user.click(screen.getByRole("button", { name: /^reset$/i }));
    expect(screen.getByLabelText("Slow query log lines")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
