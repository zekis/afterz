import { Badge } from "@mantine/core";
import { memo } from "react";

// Minimal structural typing to avoid tight coupling to central types
type Priority = "low" | "medium" | "high" | "urgent" | string;
type PriorityTodoShape = { priority?: Priority | null };

export type PriorityCellProps = {
  todo: PriorityTodoShape;
};

const colorByPriority: Record<string, string> = {
  low: "gray",
  medium: "blue",
  high: "orange",
  urgent: "red",
};

const labelByPriority: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const PriorityCell = memo(function PriorityCell({ todo }: PriorityCellProps) {
  const p = (todo.priority || "medium").toString().toLowerCase();
  const color = colorByPriority[p] ?? "gray";
  const label = labelByPriority[p] ?? p.charAt(0).toUpperCase() + p.slice(1);

  return (
    <Badge color={color} variant="light" size="sm">
      {label}
    </Badge>
  );
});