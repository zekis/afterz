import React, { useState } from 'react'
import { 
  CheckSquare, 
  Square, 
  User, 
  Calendar, 
  MessageCircle, 
  Clock, 
  Tag, 
  Edit3, 
  Trash2, 
  ExternalLink,
  ChevronDown,
  ChevronRight,
  UserCheck,
  CalendarCheck
} from 'lucide-react'
import { ExtendedTodo } from '../../types'
import ContextMenu from '../Common/ContextMenu'

interface TodoItemProps {
  todo: ExtendedTodo
  isSelected: boolean
  onSelect: (selected: boolean) => void
  onUpdate: (updates: Partial<ExtendedTodo>) => void
  onComplete?: () => void
  onCancel?: () => void
  onDelete: () => void
  onEdit?: () => void
  onAssign?: () => void
  onClick?: () => void
}

const TodoItem: React.FC<TodoItemProps> = ({
  todo,
  isSelected,
  onSelect,
  onUpdate,
  onComplete,
  onCancel,
  onDelete,
  onEdit,
  onAssign,
  onClick
}) => {
  const [showPlanningDetails, setShowPlanningDetails] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; position: { x: number; y: number } }>({
    isOpen: false,
    position: { x: 0, y: 0 }
  })

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY }
    })
  }

  const handleDoubleClick = () => {
    // Open in Frappe
    const frappeUrl = `${window.location.origin}/app/todo/${todo.name}`
    window.open(frappeUrl, '_blank')
  }

  const getStatusSubmenuItems = () => {
    const statusItems: any[] = []

    if (todo.status === 'Open') {
      statusItems.push({
        label: 'Mark as Working',
        onClick: () => onUpdate({ status: 'Working' }),
        icon: <Clock className="w-4 h-4" />,
        className: 'text-orange-600 hover:bg-orange-50'
      })
      if (onComplete) {
        statusItems.push({
          label: 'Mark as Completed',
          onClick: onComplete,
          icon: <CheckSquare className="w-4 h-4" />,
          className: 'text-green-600 hover:bg-green-50'
        })
      }
      if (onCancel) {
        statusItems.push({
          label: 'Cancel Todo',
          onClick: onCancel,
          icon: <Square className="w-4 h-4" />,
          className: 'text-gray-600 hover:bg-gray-50'
        })
      }
    } else if (todo.status === 'Working') {
      statusItems.push({
        label: 'Mark as Open',
        onClick: () => onUpdate({ status: 'Open' }),
        icon: <Square className="w-4 h-4" />,
        className: 'text-blue-600 hover:bg-blue-50'
      })
      if (onComplete) {
        statusItems.push({
          label: 'Mark as Completed',
          onClick: onComplete,
          icon: <CheckSquare className="w-4 h-4" />,
          className: 'text-green-600 hover:bg-green-50'
        })
      }
      if (onCancel) {
        statusItems.push({
          label: 'Cancel Todo',
          onClick: onCancel,
          icon: <Square className="w-4 h-4" />,
          className: 'text-gray-600 hover:bg-gray-50'
        })
      }
    } else if (todo.status === 'Closed' || todo.status === 'Cancelled') {
      statusItems.push({
        label: 'Reopen',
        onClick: () => onUpdate({ status: 'Open' }),
        icon: <Square className="w-4 h-4" />,
        className: 'text-blue-600 hover:bg-blue-50'
      })
    }

    return statusItems
  }

  const getContextMenuItems = () => {
    const items: any[] = []

    // Open in Frappe
    items.push({
      label: 'Open in Frappe',
      onClick: () => {
        const frappeUrl = `${window.location.origin}/app/todo/${todo.name}`
        window.open(frappeUrl, '_blank')
      },
      icon: <ExternalLink className="w-4 h-4" />,
      className: 'text-blue-600 hover:bg-blue-50'
    })

    // Edit (if owned)
    if (todo.is_owned && onEdit) {
      items.push({
        label: 'Edit Todo',
        onClick: onEdit,
        icon: <Edit3 className="w-4 h-4" />,
        className: 'text-gray-600 hover:bg-gray-50'
      })
    }

    // Assign To (if owned)
    if (todo.is_owned && onAssign) {
      items.push({
        label: 'Assign To',
        onClick: onAssign,
        icon: <UserCheck className="w-4 h-4" />,
        className: 'text-purple-600 hover:bg-purple-50'
      })
    }

    // Change Status submenu
    const statusItems = getStatusSubmenuItems()
    if (statusItems.length > 0) {
      items.push({
        label: 'Change Status',
        icon: <Clock className="w-4 h-4" />,
        className: 'text-gray-600 hover:bg-gray-50',
        submenu: statusItems
      })
    }

    // Delete (if owned)
    if (todo.is_owned) {
      items.push({
        label: 'Delete Todo',
        onClick: onDelete,
        icon: <Trash2 className="w-4 h-4" />,
        className: 'text-red-600 hover:bg-red-50'
      })
    }

    return items
  }

  const getPriorityBadge = () => {
    if (!todo.priority || todo.priority === 'Medium') return null
    
    const priorityStyles = {
      'High': 'bg-red-100 text-red-700 border-red-200',
      'Low': 'bg-green-100 text-green-700 border-green-200'
    }
    
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded border ${priorityStyles[todo.priority as keyof typeof priorityStyles]}`}>
        {todo.priority}
      </span>
    )
  }

  const getStatusIcon = () => {
    switch (todo.status) {
      case 'Closed':
        return <CheckSquare className="w-4 h-4 text-green-600" />
      case 'Working':
        return <Clock className="w-4 h-4 text-orange-600" />
      case 'Cancelled':
        return <Square className="w-4 h-4 text-gray-400" />
      default:
        return <Square className="w-4 h-4 text-blue-600" />
    }
  }

  const getCreatorInfo = () => {
    if (todo.is_owned) {
      return (
        <div className="flex items-center space-x-1 text-xs text-blue-600">
          <User className="w-3 h-3" />
          <span>Created by me</span>
        </div>
      )
    } else if (todo.owner) {
      return (
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <User className="w-3 h-3" />
          <span>Created by {todo.owner}</span>
        </div>
      )
    }
    return null
  }

  const getAssigneeInfo = () => {
    if (todo.is_assigned) {
      return (
        <div className="flex items-center space-x-1 text-xs text-green-600">
          <UserCheck className="w-3 h-3" />
          <span>Assigned to me</span>
        </div>
      )
    } else if (todo.allocated_to) {
      return (
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <UserCheck className="w-3 h-3" />
          <span>Assigned to {todo.assigned_user_name || todo.allocated_to}</span>
        </div>
      )
    } else {
      return (
        <div className="flex items-center space-x-1 text-xs text-gray-400">
          <UserCheck className="w-3 h-3" />
          <span>Unassigned</span>
        </div>
      )
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  return (
    <div 
      className={`px-4 py-3 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
    >
      <div className="flex items-start space-x-3">
        {/* Selection Checkbox */}
        <div className="flex-shrink-0 pt-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(e.target.checked)}
            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
          />
        </div>

        {/* Status Icon */}
        <div className="flex-shrink-0 pt-1">
          {getStatusIcon()}
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0" onClick={onClick}>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 cursor-pointer">
              {/* Title and Priority */}
              <div className="flex items-start justify-between mb-1">
                <h4 className={`text-sm font-medium flex-1 pr-2 ${todo.status === 'Closed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                  {todo.subject}
                </h4>
                <div className="flex-shrink-0">
                  {getPriorityBadge()}
                </div>
              </div>

              {/* Metadata Row */}
              <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                {/* Creator Info */}
                {getCreatorInfo()}

                {/* Assignee Info */}
                {getAssigneeInfo()}

                {/* Project */}
                {todo.project && (
                  <div className="flex items-center space-x-1">
                    <Tag className="w-3 h-3" />
                    <span>{todo.project}</span>
                  </div>
                )}

                {/* Creation Date */}
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(todo.creation || '')}</span>
                </div>

                {/* Comments */}
                {todo.comment_count > 0 && (
                  <div className="flex items-center space-x-1">
                    <MessageCircle className="w-3 h-3" />
                    <span>{todo.comment_count}</span>
                  </div>
                )}
              </div>

              {/* Planning Info (if available and owned) */}
              {todo.is_owned && todo.planning_entries && todo.planning_entries.length > 0 && (
                <div className="mt-2">
                  <button
                    onClick={() => setShowPlanningDetails(!showPlanningDetails)}
                    className="flex items-center space-x-1 text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    {showPlanningDetails ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                    <CalendarCheck className="w-3 h-3" />
                    <span>Planned by {todo.planning_entries.length} user{todo.planning_entries.length !== 1 ? 's' : ''}</span>
                  </button>

                  {showPlanningDetails && (
                    <div className="mt-2 ml-4 space-y-1">
                      {todo.planning_entries.map((entry: any, index: number) => (
                        <div key={index} className="text-xs text-gray-600 flex items-center space-x-2">
                          <User className="w-3 h-3" />
                          <span>{entry.user_name}: {entry.planned_date} ({entry.duration}h)</span>
                          <span className={`px-1 py-0.5 rounded text-xs ${
                            entry.status === 'completed' ? 'bg-green-100 text-green-700' :
                            entry.status === 'in_progress' ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {entry.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tags */}
              {todo.tags && todo.tags.length > 0 && (
                <div className="flex items-center space-x-1 mt-2">
                  {todo.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-1 ml-4">
              {/* Complete Button - for Open/Working todos */}
              {(todo.status === 'Open' || todo.status === 'Working') && onComplete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onComplete()
                  }}
                  className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                  title="Mark as Completed"
                >
                  <CheckSquare className="w-4 h-4" />
                </button>
              )}

              {/* Plan Button - for assigned todos */}
              {todo.is_assigned && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    // TODO: Navigate to Before-Workz
                    console.log('Plan todo:', todo.name)
                  }}
                  className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                  title="Plan in Before-Workz"
                >
                  <CalendarCheck className="w-4 h-4" />
                </button>
              )}
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDoubleClick()
                }}
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                title="Open in Frappe"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        items={getContextMenuItems()}
        onClose={() => setContextMenu({ isOpen: false, position: { x: 0, y: 0 } })}
      />
    </div>
  )
}

export default TodoItem
