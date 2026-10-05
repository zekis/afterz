import { Badge, Group, Tooltip } from "@mantine/core";
import { memo } from "react";
import { TodoRow } from "../types";

export type TagsCellProps = {
  todo: TodoRow;
  maxVisible?: number; // how many tags to render before collapsing
};

export const TagsCell = memo(function TagsCell({ todo, maxVisible = 3 }: TagsCellProps) {
  const tags: string[] = todo.tags ?? [];
  if (!tags.length) {
    return null;
  }

  const visible = tags.slice(0, maxVisible);
  const hidden = tags.slice(maxVisible);

  return (
    <Group gap={6} wrap="nowrap">
      {visible.map((t: string) => (
        <Badge key={t} size="sm" variant="light">
          {t}
        </Badge>
      ))}
      {hidden.length > 0 && (
        <Tooltip
          label={
            <Group gap={6}>
              {hidden.map((t: string) => (
                <Badge key={t} size="sm" variant="light">
                  {t}
                </Badge>
              ))}
            </Group>
          }
          withArrow
        >
          <Badge size="sm" variant="outline">+{hidden.length}</Badge>
        </Tooltip>
      )}
    </Group>
  );
});