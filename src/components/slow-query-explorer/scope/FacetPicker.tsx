"use client";

import { DropdownButton } from "#components/common/DropdownButton";
import { FacetList, type FacetOption } from "./FacetList";

interface FacetPickerProps {
  readonly label: string;
  readonly options: readonly FacetOption[];
  readonly selectedKeys: ReadonlySet<string>;
  readonly onToggle: (option: FacetOption) => void;
}

/** A standalone dropdown holding a facet checklist. */
export function FacetPicker(props: FacetPickerProps) {
  return (
    <DropdownButton
      label={props.label}
      active={props.selectedKeys.size > 0}
      widthClass="w-[28rem] max-w-[90vw]"
    >
      <FacetList {...props} />
    </DropdownButton>
  );
}
