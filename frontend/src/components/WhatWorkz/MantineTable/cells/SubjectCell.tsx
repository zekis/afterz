import React from 'react'
import { Group, Text, Avatar } from '@mantine/core'
import { IconCheck, IconClock, IconX, IconCalendar } from '@tabler/icons-react'
import { ExtendedTodo } from '../types'

interface SubjectCellProps {
  todo: ExtendedTodo
}

export const SubjectCell: React.FC<SubjectCellProps> = ({ todo }) => {
  const getStatusIcon = () => {
    switch (todo.status) {
      case 'Closed':
        return <IconCheck size={16} color="var(--mantine-color-green-6)" />
      case 'Working':
        return <IconClock size={16} color="var(--mantine-color-orange-6)" />
      case 'Cancelled':
        return <IconX size={16} color="var(--mantine-color-gray-5)" />
      default:
        return <IconClock size={16} color="var(--mantine-color-blue-6)" />
    }
  }

  // Format creation date
  const date = new Date(todo.creation || '')
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  let displayDate = ''
  if (diffDays === 0) {
    displayDate = 'Today'
  } else if (diffDays === 1) {
    displayDate = 'Yesterday'
  } else if (diffDays < 7) {
    displayDate = `${diffDays} days ago`
  } else {
    displayDate = date.toLocaleDateString()
  }

  // Format creator name
  const displayName = todo.owner_name || todo.owner || 'Unknown'
  const isOwnedByMe = todo.is_owned

  return (
    <Group gap="xs" wrap="nowrap" align="flex-start">
      <div style={{ marginTop: '2px' }}>
        {getStatusIcon()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Main todo subject */}
        <Text 
          size="sm" 
          fw={500}
          td={todo.status === 'Closed' ? 'line-through' : undefined}
          c={todo.status === 'Closed' ? 'dimmed' : undefined}
          style={{ 
            wordBreak: 'break-word',
            lineHeight: 1.3,
            marginBottom: '2px'
          }}
        >
          {todo.subject}
        </Text>
        
        {/* Creator and date info */}
        <Group gap="xs" wrap="nowrap">
          <Group gap={4} wrap="nowrap">
            <Text 
              size="xs" 
              c="dimmed"
              style={{ lineHeight: 1 }}
            >
              Created by
            </Text>
            <Avatar 
              size={16} 
              color={isOwnedByMe ? 'blue' : 'gray'}
              radius="xl"
            >
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
            <Text 
              size="xs" 
              c="dimmed"
              fw={isOwnedByMe ? 500 : 400}
              style={{ lineHeight: 1 }}
            >
              {isOwnedByMe ? 'Me' : displayName}
            </Text>
          </Group>
          
          <Text size="xs" c="dimmed" style={{ lineHeight: 1 }}>•</Text>
          
          <Group gap={4} wrap="nowrap">
            <IconCalendar size={12} color="var(--mantine-color-gray-5)" />
            <Text size="xs" c="dimmed" style={{ lineHeight: 1 }}>
              {displayDate}
            </Text>
          </Group>
        </Group>
      </div>
    </Group>
  )
}