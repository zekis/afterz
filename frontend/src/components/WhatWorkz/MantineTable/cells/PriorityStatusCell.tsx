import React from 'react'
import { Tooltip } from '@mantine/core'
import { IconMinus, IconChevronUp, IconChevronDown, IconCheck, IconClock, IconSquare } from '@tabler/icons-react'
import { ExtendedTodo } from '../types'

interface PriorityStatusCellProps {
  todo: ExtendedTodo
}

export const PriorityStatusCell: React.FC<PriorityStatusCellProps> = ({ todo }) => {
  const getPriorityIcon = () => {
    if (!todo.priority || todo.priority === 'Medium') {
      return <IconMinus size={12} color="var(--mantine-color-gray-5)" />
    }
    if (todo.priority === 'High') {
      return <IconChevronUp size={12} color="var(--mantine-color-red-6)" />
    }
    return <IconChevronDown size={12} color="var(--mantine-color-green-6)" />
  }

  const getStatusIcon = () => {
    switch (todo.status) {
      case 'Closed':
        return <IconCheck size={12} color="var(--mantine-color-green-6)" />
      case 'Working':
        return <IconClock size={12} color="var(--mantine-color-orange-6)" />
      case 'Cancelled':
        return <IconSquare size={12} color="var(--mantine-color-gray-5)" />
      default:
        return <IconSquare size={12} color="var(--mantine-color-blue-6)" />
    }
  }

  const priorityLabel = todo.priority || 'Medium'
  const statusLabel = todo.status || 'Open'

  return (
    <Tooltip label={`${priorityLabel} Priority • ${statusLabel}`}>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '2px',
        padding: '2px'
      }}>
        {getPriorityIcon()}
        {getStatusIcon()}
      </div>
    </Tooltip>
  )
}