import { Badge } from "@mantine/core";
import { memo, useMemo } from "react";
import { TodoItem } from "../types";

export type StatusCellProps = {
  todo: TodoItem;
};

const statusColorMap: Record<NonNullable<TodoItem["status"]>, string> = {
  open: "blue",
  in_progress: "yellow",
  blocked: "red",
  done: "green",
  cancelled: "gray",
};

const statusLabelMap: Record<NonNullable<TodoItem["status"]>, string> = {
  open: "Open",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
  cancelled: "Cancelled",
};

export const StatusCell = memo(function StatusCell({ todo }: StatusCellProps) {
  const status = todo.status ?? "open";
  const color = useMemo(() => statusColorMap[status], [status]);
  const label = useMemo(() => statusLabelMap[status], [status]);

  return (
    <Badge color={color} variant="light" size="sm">
      {label}
    </Badge>
  );
});