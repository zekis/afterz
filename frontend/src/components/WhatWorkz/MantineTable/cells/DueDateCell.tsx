import { Group, Text, Tooltip } from "@mantine/core";
import { IconCalendar, IconAlertCircle } from "@tabler/icons-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { memo, useMemo } from "react";

// Avoid importing missing named types; define a minimal structural type for compatibility
type DueDateTodoShape = { dueAt?: string | null };

dayjs.extend(relativeTime);

export type DueDateCellProps = {
  todo: DueDateTodoShape;
  // Optional: override formatter for custom date display
  formatDate?: (dateIso?: string | null) => string;
};

function getDueStatus(dueAt?: string | null) {
  if (!dueAt) return { label: "No due date", color: "dimmed" as const, overdue: false };
  const d = dayjs(dueAt);
  const now = dayjs();
  if (!d.isValid()) return { label: "Invalid date", color: "red" as const, overdue: false };
  if (d.isBefore(now, "minute")) {
    return { label: `Overdue ${d.fromNow()}`, color: "red" as const, overdue: true };
  }
  const diffHours = d.diff(now, "hour");
  if (diffHours <= 24) {
    return { label: `Due ${d.fromNow()}`, color: "orange" as const, overdue: false };
  }
  return { label: d.format("DD MMM YYYY"), color: "gray" as const, overdue: false };
}

export const DueDateCell = memo(function DueDateCell({ todo, formatDate }: DueDateCellProps) {
  const dueInfo = useMemo(() => getDueStatus(todo.dueAt), [todo.dueAt]);

  const display = useMemo(() => {
    if (formatDate) return formatDate(todo.dueAt ?? null);
    if (!todo.dueAt) return "No due date";
    const d = dayjs(todo.dueAt);
    if (!d.isValid()) return "Invalid date";
    // Keep concise but readable
    return d.format("DD MMM YYYY");
  }, [todo.dueAt, formatDate]);

  return (
    <Group gap="xs">
      <Tooltip label={dueInfo.label} withArrow>
        <div style={{ display: "flex", alignItems: "center" }}>
          {dueInfo.overdue ? (
            <IconAlertCircle size={16} color="var(--mantine-color-red-6)" />
          ) : (
            <IconCalendar size={16} color="var(--mantine-color-gray-6)" />
          )}
        </div>
      </Tooltip>
      <Text size="sm" c={dueInfo.color}>{display}</Text>
    </Group>
  );
});