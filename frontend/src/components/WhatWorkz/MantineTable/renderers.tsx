import React from 'react'
import { 
  Avatar, 
  Badge, 
  Group, 
  Text, 
  ActionIcon, 
  Tooltip,
  ThemeIcon,
  Box
} from '@mantine/core'
import { 
  IconCheck, 
  IconSquare, 
  IconClock, 
  IconChevronUp, 
  IconChevronDown, 
  IconMinus,
  IconTag,
  IconCalendar,
  IconExternalLink,
  IconEdit,
  IconUserPlus,
  IconCalendarCheck
} from '@tabler/icons-react'
import { ExtendedTodo } from './types'

// Priority renderer with circular badges
export const PriorityRenderer = ({ todo }: { todo: ExtendedTodo }) => {
  if (!todo.priority || todo.priority === 'Medium') {
    return (
      <Tooltip label="Medium Priority">
        <ThemeIcon size="sm" variant="light" color="gray">
          <IconMinus size={12} />
        </ThemeIcon>
      </Tooltip>
    )
  }
  
  if (todo.priority === 'High') {
    return (
      <Tooltip label="High Priority">
        <ThemeIcon size="sm" variant="filled" color="red">
          <IconChevronUp size={12} />
        </ThemeIcon>
      </Tooltip>
    )
  }
  
  return (
    <Tooltip label="Low Priority">
      <ThemeIcon size="sm" variant="filled" color="green">
        <IconChevronDown size={12} />
      </ThemeIcon>
    </Tooltip>
  )
}

// Status renderer with badges
export const StatusRenderer = ({ todo }: { todo: ExtendedTodo }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'blue'
      case 'Working': return 'orange'
      case 'Closed': return 'green'
      case 'Cancelled': return 'gray'
      default: return 'gray'
    }
  }

  return (
    <Badge 
      variant="light" 
      color={getStatusColor(todo.status || 'Open')}
      size="sm"
    >
      {todo.status || 'Open'}
    </Badge>
  )
}

// Subject renderer with status icon
export const SubjectRenderer = ({ todo }: { todo: ExtendedTodo }) => {
  const getStatusIcon = () => {
    switch (todo.status) {
      case 'Closed':
        return <IconCheck size={16} color="var(--mantine-color-green-6)" />
      case 'Working':
        return <IconClock size={16} color="var(--mantine-color-orange-6)" />
      case 'Cancelled':
        return <IconSquare size={16} color="var(--mantine-color-gray-5)" />
      default:
        return <IconSquare size={16} color="var(--mantine-color-blue-6)" />
    }
  }

  return (
    <Group gap="xs" wrap="nowrap">
      {getStatusIcon()}
      <Text 
        size="sm" 
        fw={500}
        td={todo.status === 'Closed' ? 'line-through' : undefined}
        c={todo.status === 'Closed' ? 'dimmed' : undefined}
        style={{ wordBreak: 'break-word' }}
      >
        {todo.subject}
      </Text>
    </Group>
  )
}

// Assignee renderer with avatar
export const AssigneeRenderer = ({ todo }: { todo: ExtendedTodo }) => {
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

// Creator renderer with avatar
export const CreatorRenderer = ({ todo }: { todo: ExtendedTodo }) => {
  const displayName = todo.owner_name || todo.owner || 'Unknown'
  const isOwnedByMe = todo.is_owned

  return (
    <Group gap="xs" wrap="nowrap">
      <Avatar 
        size="sm" 
        color={isOwnedByMe ? 'blue' : 'gray'}
        radius="xl"
      >
        {displayName.charAt(0).toUpperCase()}
      </Avatar>
      <Text 
        size="sm" 
        fw={isOwnedByMe ? 500 : 400}
        c={isOwnedByMe ? 'blue' : undefined}
        style={{ wordBreak: 'break-word' }}
      >
        {isOwnedByMe ? 'Me' : displayName}
      </Text>
    </Group>
  )
}

// Project renderer with icon
export const ProjectRenderer = ({ todo }: { todo: ExtendedTodo }) => {
  if (!todo.project) {
    return <Text size="sm" c="dimmed">No project</Text>
  }

  return (
    <Group gap="xs" wrap="nowrap">
      <IconTag size={14} color="var(--mantine-color-gray-5)" />
      <Text size="sm" style={{ wordBreak: 'break-word' }}>
        {todo.project}
      </Text>
    </Group>
  )
}

// Created date renderer
export const CreatedRenderer = ({ todo }: { todo: ExtendedTodo }) => {
  const date = new Date(todo.creation || '')
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  let displayValue = ''
  if (diffDays === 0) {
    displayValue = 'Today'
  } else if (diffDays === 1) {
    displayValue = 'Yesterday'
  } else if (diffDays < 7) {
    displayValue = `${diffDays} days ago`
  } else {
    displayValue = date.toLocaleDateString()
  }

  return (
    <Group gap="xs" wrap="nowrap">
      <IconCalendar size={14} color="var(--mantine-color-gray-5)" />
      <Text size="sm" c="dimmed">
        {displayValue}
      </Text>
    </Group>
  )
}

// Actions renderer with buttons
export const ActionsRenderer = ({ 
  todo, 
  onUpdateTodo, 
  onCompleteTodo, 
  onEditTodo, 
  onAssignTodo 
}: { 
  todo: ExtendedTodo
  onUpdateTodo: (todoName: string, updates: Partial<ExtendedTodo>) => void
  onCompleteTodo?: (todoName: string) => void
  onEditTodo?: (todo: ExtendedTodo) => void
  onAssignTodo?: (todo: ExtendedTodo) => void
}) => {
  const actions = []

  // Status change actions
  if (todo.status === 'Open') {
    actions.push(
      <Tooltip key="working" label="Mark as Working">
        <ActionIcon
          variant="light"
          color="orange"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onUpdateTodo(todo.name, { status: 'Working' })
          }}
        >
          <IconClock size={14} />
        </ActionIcon>
      </Tooltip>
    )
  }

  // Complete action
  if ((todo.status === 'Open' || todo.status === 'Working') && onCompleteTodo) {
    actions.push(
      <Tooltip key="complete" label="Mark as Completed">
        <ActionIcon
          variant="light"
          color="green"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onCompleteTodo(todo.name)
          }}
        >
          <IconCheck size={14} />
        </ActionIcon>
      </Tooltip>
    )
  }

  // Reopen action
  if (todo.status === 'Closed' || todo.status === 'Cancelled') {
    actions.push(
      <Tooltip key="reopen" label="Reopen Todo">
        <ActionIcon
          variant="light"
          color="blue"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onUpdateTodo(todo.name, { status: 'Open' })
          }}
        >
          <IconSquare size={14} />
        </ActionIcon>
      </Tooltip>
    )
  }

  // Plan action
  if (todo.is_assigned) {
    actions.push(
      <Tooltip key="plan" label="Plan in Before-Workz">
        <ActionIcon
          variant="light"
          color="indigo"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            console.log('Plan todo:', todo.name)
          }}
        >
          <IconCalendarCheck size={14} />
        </ActionIcon>
      </Tooltip>
    )
  }

  // Edit action
  if (todo.is_owned && onEditTodo) {
    actions.push(
      <Tooltip key="edit" label="Edit Todo">
        <ActionIcon
          variant="light"
          color="gray"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onEditTodo(todo)
          }}
        >
          <IconEdit size={14} />
        </ActionIcon>
      </Tooltip>
    )
  }

  // Assign action
  if (todo.is_owned && onAssignTodo) {
    actions.push(
      <Tooltip key="assign" label="Assign To">
        <ActionIcon
          variant="light"
          color="purple"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onAssignTodo(todo)
          }}
        >
          <IconUserPlus size={14} />
        </ActionIcon>
      </Tooltip>
    )
  }

  // External link action
  actions.push(
    <Tooltip key="external" label="Open in Frappe">
      <ActionIcon
        variant="light"
        color="blue"
        size="sm"
        onClick={(e) => {
          e.stopPropagation()
          const frappeUrl = `${window.location.origin}/app/todo/${todo.name}`
          window.open(frappeUrl, '_blank')
        }}
      >
        <IconExternalLink size={14} />
      </ActionIcon>
    </Tooltip>
  )

  return (
    <Group gap="xs" wrap="nowrap">
      {actions.slice(0, 2)} {/* Show first 2 actions */}
      {actions.length > 2 && (
        <Text size="xs" c="dimmed">
          +{actions.length - 2}
        </Text>
      )}
    </Group>
  )
}
