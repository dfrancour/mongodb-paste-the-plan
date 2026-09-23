"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { SegmentedControl } from "#components/shared/SegmentedControl";

const THEMES = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

type ThemeId = (typeof THEMES)[number]["value"];

function isThemeId(value: string | undefined): value is ThemeId {
  return THEMES.some((t) => t.value === value);
}

/** The stored preference is only known in the browser, so render after mount. */
export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (!mounted) return null;

  return (
    <div className="mb-2 self-center">
      <SegmentedControl<ThemeId>
        label="Theme"
        options={THEMES}
        selected={isThemeId(theme) ? theme : "system"}
        onChange={setTheme}
      />
    </div>
  );
}
