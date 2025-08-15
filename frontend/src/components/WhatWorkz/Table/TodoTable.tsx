import React, { useMemo, useState } from 'react'
import { 
  CheckSquare, 
  Square, 
  Clock, 
  User, 
  Tag, 
  Calendar,
  ExternalLink,
  CalendarCheck,
  UserCheck,
  Edit3,
  UserPlus,
  Trash2
} from 'lucide-react'
import { ExtendedTodo } from '../../../types'
import { GroupedTable, TableToolbar, TableColumn, TableGroup, ViewMode } from '../../Common/Table'
import ContextMenu from '../../Common/ContextMenu'

type GroupBy = 'status' | 'priority' | 'assignee' | 'project' | 'due_date' | 'owner' | 'reference_type'

interface TodoTableProps {
  todos: ExtendedTodo[]
  groupBy: GroupBy
  selectedTodos: Set<string>
  onSelectTodo: (todoName: string, selected: boolean) => void
  onUpdateTodo: (todoName: string, updates: Partial<ExtendedTodo>) => void
  onCompleteTodo?: (todoName: string) => void
  onCancelTodo?: (todoName: string) => void
  onDeleteTodo: (todoName: string) => void
  onEditTodo?: (todo: ExtendedTodo) => void
  onAssignTodo?: (todo: ExtendedTodo) => void
  onTodoClick?: (todo: ExtendedTodo) => void
  searchTerm: string
  onSearchChange: (value: string) => void
}

const TodoTable: React.FC<TodoTableProps> = ({
  todos,
  groupBy,
  selectedTodos,
  onSelectTodo,
  onUpdateTodo,
  onCompleteTodo,
  onCancelTodo,
  onDeleteTodo,
  onEditTodo,
  onAssignTodo,
  onTodoClick,
  searchTerm,
  onSearchChange
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean
    position: { x: number; y: number }
    todo: ExtendedTodo | null
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    todo: null
  })

  // Context menu helper functions
  const getStatusSubmenuItems = (todo: ExtendedTodo) => {
    const statusItems: any[] = []

    if (todo.status === 'Open') {
      statusItems.push({
        label: 'Mark as Working',
        onClick: () => onUpdateTodo(todo.name, { status: 'Working' }),
        icon: <Clock className="w-4 h-4" />,
        className: 'text-orange-600 hover:bg-orange-50'
      })
      if (onCompleteTodo) {
        statusItems.push({
          label: 'Mark as Completed',
          onClick: () => onCompleteTodo(todo.name),
          icon: <CheckSquare className="w-4 h-4" />,
          className: 'text-green-600 hover:bg-green-50'
        })
      }
      if (onCancelTodo) {
        statusItems.push({
          label: 'Cancel Todo',
          onClick: () => onCancelTodo(todo.name),
          icon: <Square className="w-4 h-4" />,
          className: 'text-gray-600 hover:bg-gray-50'
        })
      }
    } else if (todo.status === 'Working') {
      statusItems.push({
        label: 'Mark as Open',
        onClick: () => onUpdateTodo(todo.name, { status: 'Open' }),
        icon: <Square className="w-4 h-4" />,
        className: 'text-blue-600 hover:bg-blue-50'
      })
      if (onCompleteTodo) {
        statusItems.push({
          label: 'Mark as Completed',
          onClick: () => onCompleteTodo(todo.name),
          icon: <CheckSquare className="w-4 h-4" />,
          className: 'text-green-600 hover:bg-green-50'
        })
      }
      if (onCancelTodo) {
        statusItems.push({
          label: 'Cancel Todo',
          onClick: () => onCancelTodo(todo.name),
          icon: <Square className="w-4 h-4" />,
          className: 'text-gray-600 hover:bg-gray-50'
        })
      }
    } else if (todo.status === 'Closed' || todo.status === 'Cancelled') {
      statusItems.push({
        label: 'Reopen',
        onClick: () => onUpdateTodo(todo.name, { status: 'Open' }),
        icon: <Square className="w-4 h-4" />,
        className: 'text-blue-600 hover:bg-blue-50'
      })
    }

    return statusItems
  }

  const getContextMenuItems = (todo: ExtendedTodo) => {
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
    if (todo.is_owned && onEditTodo) {
      items.push({
        label: 'Edit Todo',
        onClick: () => onEditTodo(todo),
        icon: <Edit3 className="w-4 h-4" />,
        className: 'text-gray-600 hover:bg-gray-50'
      })
    }

    // Assign To (if owned)
    if (todo.is_owned && onAssignTodo) {
      items.push({
        label: 'Assign To',
        onClick: () => onAssignTodo(todo),
        icon: <UserCheck className="w-4 h-4" />,
        className: 'text-purple-600 hover:bg-purple-50'
      })
    }

    // Change Status submenu
    const statusItems = getStatusSubmenuItems(todo)
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
        onClick: () => onDeleteTodo(todo.name),
        icon: <Trash2 className="w-4 h-4" />,
        className: 'text-red-600 hover:bg-red-50'
      })
    }

    return items
  }

  const handleRowContextMenu = (todo: ExtendedTodo, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      todo: todo
    })
  }

  // Define table columns with fixed widths
  const columns: TableColumn<ExtendedTodo>[] = useMemo(() => [
    {
      key: 'subject',
      label: 'Todo',
      sortable: true,
      width: '28%',
      render: (value: string, todo: ExtendedTodo) => (
        <div className="flex items-center space-x-3">
          {/* Status Icon */}
          <div className="flex-shrink-0">
            {todo.status === 'Closed' ? (
              <CheckSquare className="w-4 h-4 text-green-600" />
            ) : todo.status === 'Working' ? (
              <Clock className="w-4 h-4 text-orange-600" />
            ) : todo.status === 'Cancelled' ? (
              <Square className="w-4 h-4 text-gray-400" />
            ) : (
              <Square className="w-4 h-4 text-blue-600" />
            )}
          </div>
          
          {/* Title Only */}
          <div className="flex-1 min-w-0">
            <span className={`font-medium truncate ${todo.status === 'Closed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
              {value}
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      width: '8%',
      render: (value: string, todo: ExtendedTodo) => {
        if (!todo.priority || todo.priority === 'Medium') {
          return <span className="text-sm text-gray-400">-</span>
        }
        return (
          <span className={`px-2 py-0.5 text-xs font-medium rounded border ${
            todo.priority === 'High' 
              ? 'bg-red-100 text-red-700 border-red-200'
              : 'bg-green-100 text-green-700 border-green-200'
          }`}>
            {todo.priority}
          </span>
        )
      }
    },
    {
      key: 'allocated_to',
      label: 'Assignee',
      sortable: true,
      width: '14%',
      render: (value: string, todo: ExtendedTodo) => {
        if (todo.is_assigned) {
          return (
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-xs font-medium text-white">
                {(todo.assigned_user_name || value || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-green-600 font-medium">
                {todo.assigned_user_name || value || 'Me'}
              </span>
            </div>
          )
        } else if (value) {
          return (
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-xs font-medium text-white">
                {(todo.assigned_user_name || value).charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-gray-600">
                {todo.assigned_user_name || value}
              </span>
            </div>
          )
        } else {
          return (
            <span className="text-sm text-gray-400">Unassigned</span>
          )
        }
      }
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: '10%',
      render: (value: string) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          value === 'Open' ? 'bg-blue-100 text-blue-800' :
          value === 'Working' ? 'bg-orange-100 text-orange-800' :
          value === 'Closed' ? 'bg-green-100 text-green-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'project',
      label: 'Project',
      sortable: true,
      width: '11%',
      render: (value: string) => value ? (
        <div className="flex items-center space-x-1">
          <Tag className="w-3 h-3 text-gray-400" />
          <span className="text-sm text-gray-600">{value}</span>
        </div>
      ) : (
        <span className="text-sm text-gray-400">No project</span>
      )
    },
    {
      key: 'owner',
      label: 'Creator',
      sortable: true,
      width: '12%',
      render: (value: string, todo: ExtendedTodo) => {
        if (todo.is_owned) {
          return (
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-medium text-white">
                {(todo.owner_name || value || 'M').charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-blue-600 font-medium">Me</span>
            </div>
          )
        } else {
          return (
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-xs font-medium text-white">
                {(todo.owner_name || value || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-gray-600">
                {todo.owner_name || value}
              </span>
            </div>
          )
        }
      }
    },
    {
      key: 'creation',
      label: 'Created',
      sortable: true,
      width: '10%',
      render: (value: string) => {
        const date = new Date(value)
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
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3 text-gray-400" />
            <span className="text-sm text-gray-600">{displayValue}</span>
          </div>
        )
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '7%',
      render: (_: any, todo: ExtendedTodo) => (
        <div className="flex items-center justify-end space-x-1">
          {/* Status Change Buttons */}
          {todo.status === 'Open' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onUpdateTodo(todo.name, { status: 'Working' })
              }}
              className="p-1 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded"
              title="Mark as Working"
            >
              <Clock className="w-4 h-4" />
            </button>
          )}

          {/* Complete Button */}
          {(todo.status === 'Open' || todo.status === 'Working') && onCompleteTodo && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCompleteTodo(todo.name)
              }}
              className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
              title="Mark as Completed"
            >
              <CheckSquare className="w-4 h-4" />
            </button>
          )}

          {/* Reopen Button for closed/cancelled todos */}
          {(todo.status === 'Closed' || todo.status === 'Cancelled') && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onUpdateTodo(todo.name, { status: 'Open' })
              }}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Reopen Todo"
            >
              <Square className="w-4 h-4" />
            </button>
          )}

          {/* Plan Button */}
          {todo.is_assigned && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                console.log('Plan todo:', todo.name)
              }}
              className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
              title="Plan in Before-Workz"
            >
              <CalendarCheck className="w-4 h-4" />
            </button>
          )}

          {/* Edit Button */}
          {todo.is_owned && onEditTodo && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEditTodo(todo)
              }}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded"
              title="Edit Todo"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}

          {/* Assign Button */}
          {todo.is_owned && onAssignTodo && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAssignTodo(todo)
              }}
              className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded"
              title="Assign To"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          )}

          {/* External Link */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              const frappeUrl = `${window.location.origin}/app/todo/${todo.name}`
              window.open(frappeUrl, '_blank')
            }}
            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
            title="Open in Frappe"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ], [onCompleteTodo, onEditTodo, onAssignTodo])

  // Group todos
  const groupedTodos = useMemo(() => {
    const groups = new Map<string, ExtendedTodo[]>()

    todos.forEach(todo => {
      let groupKey: string
      let groupLabel: string

      switch (groupBy) {
        case 'status':
          groupKey = todo.status || 'Open'
          groupLabel = groupKey
          break
        case 'priority':
          groupKey = todo.priority || 'None'
          groupLabel = groupKey === 'None' ? 'No Priority' : groupKey
          break
        case 'assignee':
          groupKey = todo.allocated_to || 'Unassigned'
          groupLabel = groupKey === 'Unassigned' ? 'Unassigned' : todo.assigned_user_name || groupKey
          break
        case 'project':
          groupKey = todo.project || 'No Project'
          groupLabel = groupKey
          break
        case 'owner':
          groupKey = todo.owner || 'Unknown'
          groupLabel = todo.owner_name || groupKey
          break
        case 'reference_type':
          groupKey = todo.reference_type || 'General'
          groupLabel = groupKey === 'General' ? 'General Tasks' : `${groupKey}s`
          break
        default:
          groupKey = 'All'
          groupLabel = 'All Todos'
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, [])
      }
      groups.get(groupKey)!.push(todo)
    })

    // Convert to TableGroup format
    const groupArray: TableGroup<ExtendedTodo>[] = Array.from(groups.entries()).map(([key, items]) => ({
      key,
      label: key,
      items: items.sort((a, b) => {
        const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 }
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority
        }
        
        return new Date(b.creation || 0).getTime() - new Date(a.creation || 0).getTime()
      }),
      count: items.length,
      metadata: {
        assigned: items.filter(t => t.is_assigned).length,
        completed: items.filter(t => t.status === 'Closed').length
      }
    }))

    // Sort groups
    return groupArray.sort((a, b) => {
      if (groupBy === 'priority') {
        const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1, 'None': 0 }
        const aPriority = priorityOrder[a.key as keyof typeof priorityOrder] || 0
        const bPriority = priorityOrder[b.key as keyof typeof priorityOrder] || 0
        return bPriority - aPriority
      } else if (groupBy === 'status') {
        const statusOrder = { 'Open': 2, 'Working': 1, 'Closed': 0, 'Cancelled': -1 }
        const aStatus = statusOrder[a.key as keyof typeof statusOrder] || 0
        const bStatus = statusOrder[b.key as keyof typeof statusOrder] || 0
        return bStatus - aStatus
      }
      return a.label.localeCompare(b.label)
    })
  }, [todos, groupBy])

  const handleToggleGroup = (groupKey: string) => {
    const newCollapsed = new Set(collapsedGroups)
    if (newCollapsed.has(groupKey)) {
      newCollapsed.delete(groupKey)
    } else {
      newCollapsed.add(groupKey)
    }
    setCollapsedGroups(newCollapsed)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <TableToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchValue={searchTerm}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search todos..."
        showViewToggle={false} // Only show table view for now
        showHideButton={false} // Column visibility to be implemented
        showFilters={false} // Advanced filters to be implemented
      />

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <GroupedTable
          columns={columns}
          groups={groupedTodos}
          groupBy={groupBy}
          collapsedGroups={collapsedGroups}
          onToggleGroup={handleToggleGroup}
          selectedItems={selectedTodos}
          onSelectItem={onSelectTodo}
          onRowClick={onTodoClick}
          onRowContextMenu={handleRowContextMenu}
          getItemId={(todo) => todo.name}
        />
      </div>

      {/* Context Menu */}
      {contextMenu.todo && (
        <ContextMenu
          isOpen={contextMenu.isOpen}
          position={contextMenu.position}
          items={getContextMenuItems(contextMenu.todo)}
          onClose={() => setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, todo: null })}
        />
      )}
    </div>
  )
}

export default TodoTable
