import React from 'react'
import { Group, Text, Avatar } from '@mantine/core'
import { ExtendedTodo } from '../types'

interface AssigneeCellProps {
  todo: ExtendedTodo
}

export const AssigneeCell: React.FC<AssigneeCellProps> = ({ todo }) => {
  if (!todo.allocated_to) {
    return <Text size="sm" c="dimmed">Unassigned</Text>
  }

  const displayName = todo.assigned_user_name || todo.allocated_to
  const isAssignedToMe = todo.is_assigned

  return (
    <Group gap="xs" wrap="nowrap">
      <Avatar
        size="sm"
        color={isAssignedToMe ? 'green' : 'gray'}
        radius="xl"
      >
        {displayName.charAt(0).toUpperCase()}
      </Avatar>
      <Text
        size="sm"
        fw={isAssignedToMe ? 500 : 400}
        c={isAssignedToMe ? 'green' : undefined}
        style={{ wordBreak: 'break-word' }}
      >
        {isAssignedToMe ? 'Me' : displayName}
      </Text>
    </Group>
  )
}