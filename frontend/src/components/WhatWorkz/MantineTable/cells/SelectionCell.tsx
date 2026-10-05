import { Checkbox } from "@mantine/core";
import { memo, useCallback } from "react";
import { TodoId } from "../types";

export type SelectionCellProps = {
  id: TodoId;
  selected: boolean;
  disabled?: boolean;
  onToggle: (id: TodoId, next: boolean) => void;
};

// Simple selection checkbox cell, consistent props style with other cells
export const SelectionCell = memo(function SelectionCell({
  id,
  selected,
  disabled = false,
  onToggle,
}: SelectionCellProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onToggle(id, e.currentTarget.checked);
    },
    [id, onToggle]
  );

  return (
    <Checkbox
      aria-label="Select row"
      checked={selected}
      onChange={handleChange}
      disabled={disabled}
    />
  );
});