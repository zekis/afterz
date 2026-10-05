/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback } from "react";
import {
  Table,
  ScrollArea,
  Group,
  Text,
  Checkbox,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { IconPencil, IconTrash, IconDotsVertical } from "@tabler/icons-react";
import {
  AssigneeCell,
  DueDateCell,
  TagsCell,
  SelectionCell,
  StatusCell,
  PriorityCell,
} from "./cells";

// Minimal shape for a todo row to keep component decoupled
export type TodoRow = {
  id: string;
  subject?: string;
  priority?: "low" | "medium" | "high" | "urgent" | string | null;
  status?: "open" | "in_progress" | "blocked" | "done" | "cancelled" | string | null;
  dueAt?: string | null;
  tags?: string[] | null;
  assignee?: {
    name?: string | null;
    avatarUrl?: string | null;
    email?: string | null;
  } | null;
};

// Sorting and grouping primitives (generic, can map to your existing enums)
export type SortField = "subject" | "priority" | "status" | "assignee" | "dueAt";
export type SortDirection = "asc" | "desc";
export type GroupBy = "none" | "status" | "assignee" | "priority";

// Props tailored to your described needs: sortable, groupable, clicks
export type MantineTodoTableProps = {
  todos: TodoRow[];

  // Selection
  selectedTodos?: Set<string>;
  onSelectTodo?: (id: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  allSelected?: boolean;
  indeterminate?: boolean;

  // Sorting and grouping
  sortBy?: SortField;
  sortDir?: SortDirection;
  onSortChange?: (field: SortField, dir: SortDirection) => void;
  groupBy?: GroupBy;
  onGroupByChange?: (group: GroupBy) => void;

  // Click behaviors
  onOpenHistory?: (todo: TodoRow) => void; // left click
  onContextMenu?: (todo: TodoRow, event: React.MouseEvent) => void; // right click

  // Common row actions (optional)
  onEditTodo?: (todo: TodoRow) => void;
  onDeleteTodo?: (todo: TodoRow) => void;
};

function nextDir(current?: SortDirection): SortDirection {
  return current === "asc" ? "desc" : "asc";
}

function getHeaderSortProps(
  field: SortField,
  currentField?: SortField,
  currentDir?: SortDirection,
  onSortChange?: (f: SortField, d: SortDirection) => void
) {
  const active = field === currentField;
  const dir = active ? (currentDir ?? "asc") : undefined;
  // Map to valid aria-sort literal types
  const ariaSort: "none" | "ascending" | "descending" | "other" | undefined = active
    ? dir === "asc"
      ? "ascending"
      : "descending"
    : "none";
  const label = active ? `Sorted ${dir === "asc" ? "ascending" : "descending"}` : "Not sorted";
  return {
    role: "button" as const,
    "aria-sort": ariaSort,
    title: label,
    onClick: () => {
      const newDir = active ? nextDir(dir) : "asc";
      onSortChange?.(field, newDir);
    },
    sx: { cursor: "pointer", userSelect: "none" as any },
  };
}

export default function MantineTodoTable({
  todos,
  selectedTodos,
  onSelectTodo,
  onSelectAll,
  allSelected,
  indeterminate,
  sortBy,
  sortDir,
  onSortChange,
  groupBy = "none",
  onGroupByChange,
  onOpenHistory,
  onContextMenu,
  onEditTodo,
  onDeleteTodo,
}: MantineTodoTableProps) {
  const isSelected = useCallback(
    (id: string) => !!selectedTodos && selectedTodos.has(id),
    [selectedTodos]
  );

  const handleToggleSelect = useCallback(
    (id: string, next: boolean) => {
      onSelectTodo?.(id, next);
    },
    [onSelectTodo]
  );

  const headerCheckbox = (
    <Checkbox
      aria-label="Select all"
      checked={!!allSelected}
      indeterminate={!!indeterminate}
      onChange={(e) => onSelectAll?.(e.currentTarget.checked)}
    />
  );

  // Grouping: simple synchronous grouping by a field
  const groups = React.useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", label: "", items: todos }];
    }
    const map = new Map<string, TodoRow[]>();
    const getKey = (t: TodoRow) => {
      switch (groupBy) {
        case "status":
          return (t.status ?? "Unspecified").toString();
        case "assignee":
          return t.assignee?.name || "Unassigned";
        case "priority":
          return (t.priority ?? "Unspecified").toString();
        default:
          return "Other";
      }
    };
    for (const t of todos) {
      const k = getKey(t);
      const arr = map.get(k) ?? [];
      arr.push(t);
      map.set(k, arr);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      label: key,
      items,
    }));
  }, [todos, groupBy]);

  return (
    <ScrollArea>
      <Table striped verticalSpacing="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ width: 40 }}>{headerCheckbox}</Table.Th>
            <Table.Th {...getHeaderSortProps("subject", sortBy, sortDir, onSortChange)}>
              Subject
            </Table.Th>
            <Table.Th {...getHeaderSortProps("priority", sortBy, sortDir, onSortChange)}>
              Priority
            </Table.Th>
            <Table.Th {...getHeaderSortProps("status", sortBy, sortDir, onSortChange)}>
              Status
            </Table.Th>
            <Table.Th {...getHeaderSortProps("assignee", sortBy, sortDir, onSortChange)}>
              Assignee
            </Table.Th>
            <Table.Th {...getHeaderSortProps("dueAt", sortBy, sortDir, onSortChange)}>
              Due
            </Table.Th>
            <Table.Th>Tags</Table.Th>
            <Table.Th style={{ width: 120 }}>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {groups.map((g) => (
            <React.Fragment key={g.key}>
              {groupBy !== "none" && (
                <Table.Tr>
                  <Table.Td colSpan={8}>
                    <Group justify="space-between">
                      <Group gap="xs">
                        <Text fw={600}>{g.label}</Text>
                        <Text c="dimmed" size="sm">
                          {g.items.length} items
                        </Text>
                      </Group>
                      {/* Basic group toggles - consumer can wire to toolbar elsewhere */}
                      <Group gap="xs">
                        <Tooltip label="Group by none">
                          <ActionIcon variant="subtle" onClick={() => onGroupByChange?.("none")}>
                            —
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Group by status">
                          <ActionIcon variant="subtle" onClick={() => onGroupByChange?.("status")}>
                            S
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Group by assignee">
                          <ActionIcon variant="subtle" onClick={() => onGroupByChange?.("assignee")}>
                            A
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Group by priority">
                          <ActionIcon variant="subtle" onClick={() => onGroupByChange?.("priority")}>
                            P
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              )}

              {g.items.map((row) => {
                const selected = isSelected(row.id);
                const onRowClick = () => onOpenHistory?.(row);
                const onRowContextMenu = (e: React.MouseEvent) => {
                  e.preventDefault();
                  onContextMenu?.(row, e);
                };

                return (
                  <Table.Tr
                    key={row.id}
                    data-selected={selected || undefined}
                    onClick={onRowClick}
                    onContextMenu={onRowContextMenu}
                    style={{ cursor: "pointer" }}
                  >
                    <Table.Td style={{ width: 40 }} onClick={(e) => e.stopPropagation()}>
                      <SelectionCell id={row.id} selected={selected} onToggle={handleToggleSelect} />
                    </Table.Td>

                    <Table.Td>
                      <Text fw={500} lineClamp={2}>
                        {row.subject || "(No subject)"}
                      </Text>
                    </Table.Td>

                    <Table.Td>
                      <PriorityCell todo={row} />
                    </Table.Td>

                    <Table.Td>
                      <StatusCell todo={row as any} />
                    </Table.Td>

                    <Table.Td>
                      <AssigneeCell todo={row as any} />
                    </Table.Td>

                    <Table.Td>
                      <DueDateCell todo={row} />
                    </Table.Td>

                    <Table.Td>
                      <TagsCell todo={row as any} />
                    </Table.Td>

                    <Table.Td onClick={(e) => e.stopPropagation()}>
                      <Group gap="xs" justify="flex-start">
                        <Tooltip label="Edit" withArrow>
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={() => onEditTodo?.(row)}
                            aria-label="Edit"
                          >
                            <IconPencil size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete" withArrow>
                          <ActionIcon
                            variant="light"
                            color="red"
                            onClick={() => onDeleteTodo?.(row)}
                            aria-label="Delete"
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="More" withArrow>
                          <ActionIcon variant="subtle" aria-label="More">
                            <IconDotsVertical size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </React.Fragment>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}
