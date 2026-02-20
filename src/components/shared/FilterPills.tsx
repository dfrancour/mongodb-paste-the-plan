import type { ReactNode } from "react";
import { PillButton } from "./PillButton";

interface FilterOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

interface SingleSelectProps<T extends string> {
  readonly mode: "single";
  readonly options: readonly FilterOption<T>[];
  readonly selected: T;
  readonly onChange: (value: T) => void;
  readonly label?: string;
  readonly icon?: ReactNode;
}

interface MultiSelectProps<T extends string> {
  readonly mode: "multi";
  readonly options: readonly FilterOption<T>[];
  readonly selected: Set<T>;
  readonly onToggle: (value: T) => void;
  readonly label?: string;
  readonly icon?: ReactNode;
}

type FilterPillsProps<T extends string> =
  | SingleSelectProps<T>
  | MultiSelectProps<T>;

export function FilterPills<T extends string>(props: FilterPillsProps<T>) {
  const { options, label, icon } = props;

  const isSelected = (value: T): boolean => {
    if (props.mode === "single") {
      return props.selected === value;
    }
    return props.selected.has(value);
  };

  const handleClick = (value: T) => {
    if (props.mode === "single") {
      props.onChange(value);
    } else {
      props.onToggle(value);
    }
  };

  return (
    <div className="flex items-start gap-2">
      {icon && <div className="mt-1 flex-shrink-0">{icon}</div>}
      <div>
        {label && (
          <div className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-400">
            {label}
          </div>
        )}
        <div
          role="group"
          aria-label={label ?? "Filter options"}
          className="flex flex-wrap gap-2"
        >
          {options.map((option) => (
            <PillButton
              key={option.value}
              isSelected={isSelected(option.value)}
              onClick={() => handleClick(option.value)}
            >
              {option.label}
            </PillButton>
          ))}
        </div>
      </div>
    </div>
  );
}
