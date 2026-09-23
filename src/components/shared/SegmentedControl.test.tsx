import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { SegmentedControl } from "./SegmentedControl";

const OPTIONS = [
  { value: "a", label: "A" },
  { value: "b", label: "B" },
  { value: "c", label: "C" },
] as const;

function Harness() {
  const [selected, setSelected] = useState<"a" | "b" | "c">("b");
  return (
    <SegmentedControl
      label="Letter"
      options={OPTIONS}
      selected={selected}
      onChange={setSelected}
    />
  );
}

describe("SegmentedControl", () => {
  it("tabs to the selected option and moves with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.tab();
    expect(screen.getByRole("radio", { name: "B" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "C" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "C" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "A" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "C" })).toHaveFocus();
  });
});
