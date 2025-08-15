import React, { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, User, Calendar, MessageCircle, Clock, Tag } from 'lucide-react'
import { ExtendedTodo } from '../../types'
import TodoItem from './TodoItem'

type GroupBy = 'status' | 'priority' | 'assignee' | 'project' | 'due_date' | 'owner' | 'reference_type'

interface TodoListProps {
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
}

interface TodoGroup {
  key: string
  label: string
  todos: ExtendedTodo[]
  count: number
}

const TodoList: React.FC<TodoListProps> = ({
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
  onTodoClick
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // Group todos based on the groupBy criteria
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

    // Convert to array and sort groups
    const groupArray: TodoGroup[] = Array.from(groups.entries()).map(([key, todos]) => ({
      key,
      label: key,
      todos: todos.sort((a, b) => {
        // Sort by priority within groups, then by creation date
        const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 }
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority
        }
        
        return new Date(b.creation || 0).getTime() - new Date(a.creation || 0).getTime()
      }),
      count: todos.length
    }))

    // Sort groups by priority/importance
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

  const toggleGroup = (groupKey: string) => {
    const newCollapsed = new Set(collapsedGroups)
    if (newCollapsed.has(groupKey)) {
      newCollapsed.delete(groupKey)
    } else {
      newCollapsed.add(groupKey)
    }
    setCollapsedGroups(newCollapsed)
  }

  const getGroupIcon = (groupBy: GroupBy) => {
    switch (groupBy) {
      case 'assignee':
        return <User className="w-4 h-4" />
      case 'project':
        return <Tag className="w-4 h-4" />
      case 'due_date':
        return <Calendar className="w-4 h-4" />
      default:
        return <Tag className="w-4 h-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'Medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'Low':
        return 'text-green-600 bg-green-50 border-green-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'Working':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'Closed':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'Cancelled':
        return 'text-gray-600 bg-gray-50 border-gray-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  if (todos.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <div className="text-gray-400 mb-4">
          <MessageCircle className="w-12 h-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No todos found</h3>
        <p className="text-gray-500">
          Try adjusting your filters or create a new todo to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {groupedTodos.map((group) => {
        const isCollapsed = collapsedGroups.has(group.key)
        const groupColorClass = groupBy === 'priority' 
          ? getPriorityColor(group.key)
          : groupBy === 'status'
          ? getStatusColor(group.key)
          : 'text-gray-700 bg-gray-50 border-gray-200'

        return (
          <div key={group.key} className="border-b border-gray-200 last:border-b-0">
            {/* Group Header */}
            <div
              className={`px-4 py-3 cursor-pointer select-none hover:bg-gray-50 transition-colors border-l-4 ${groupColorClass}`}
              onClick={() => toggleGroup(group.key)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                    {getGroupIcon(groupBy)}
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {group.label}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {group.count} todo{group.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  {/* Show some quick stats */}
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{group.todos.filter(t => t.is_assigned).length} assigned</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <MessageCircle className="w-3 h-3" />
                    <span>{group.todos.reduce((sum, t) => sum + (t.comment_count || 0), 0)} comments</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Group Content */}
            {!isCollapsed && (
              <div className="divide-y divide-gray-100">
                {group.todos.map((todo) => (
                  <TodoItem
                    key={todo.name}
                    todo={todo}
                    isSelected={selectedTodos.has(todo.name)}
                    onSelect={(selected) => onSelectTodo(todo.name, selected)}
                    onUpdate={(updates) => onUpdateTodo(todo.name, updates)}
                    onComplete={onCompleteTodo ? () => onCompleteTodo(todo.name) : undefined}
                    onCancel={onCancelTodo ? () => onCancelTodo(todo.name) : undefined}
                    onDelete={() => onDeleteTodo(todo.name)}
                    onEdit={onEditTodo ? () => onEditTodo(todo) : undefined}
                    onAssign={onAssignTodo ? () => onAssignTodo(todo) : undefined}
                    onClick={onTodoClick ? () => onTodoClick(todo) : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default TodoList
