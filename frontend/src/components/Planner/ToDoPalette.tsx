import React, { useMemo, useState, useEffect } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Search, Folder, CheckSquare, UserPlus, CheckCircle, XCircle, ExternalLink, User, Calendar, Tag, Clock, Square } from 'lucide-react'
import { TodoLite, Project, User as UserType } from '../../types'
import ContextMenu from '../Common/ContextMenu'

interface ToDoPaletteProps {
  todos: TodoLite[]
  projects: Project[]
  currentUser?: UserType
  users?: UserType[]
  onAssignTodo?: (todoName: string, newUser: string) => Promise<void>
  onCompleteTodo?: (todoName: string) => Promise<void>
  onCancelTodo?: (todoName: string) => Promise<void>
}

interface DraggableTodoProps {
  todo: TodoLite
  project?: Project
  users?: UserType[]
  onAssignTodo?: (todoName: string, newUser: string) => Promise<void>
  onCompleteTodo?: (todoName: string) => Promise<void>
  onCancelTodo?: (todoName: string) => Promise<void>
}

// Helper function to get user initials
const getUserInitials = (fullName: string): string => {
  if (!fullName) return '?'
  return fullName
    .split(' ')
    .map(name => name.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

const DraggableTodo: React.FC<DraggableTodoProps> = ({ todo, project, users = [], onAssignTodo, onCompleteTodo, onCancelTodo }) => {
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; position: { x: number; y: number } }>({
    isOpen: false,
    position: { x: 0, y: 0 }
  })

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `todo-${todo.name}`,
    data: { type: 'todo', todo }
  })

  // Find assigned user
  const assignedUser = users.find(user => user.name === todo.allocated_to)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY }
    })
  }

  const getContextMenuItems = () => {
    const items: any[] = []

    items.push({
      label: 'Open in Frappe',
      onClick: () => {
        const frappeUrl = `${window.location.origin}/app/todo/${todo.name}`
        window.open(frappeUrl, '_blank')
      },
      icon: <ExternalLink className="w-4 h-4" />,
      className: 'text-blue-600 hover:bg-blue-50'
    })

    if (onCompleteTodo) {
      items.push({
        label: 'Mark Complete',
        onClick: () => onCompleteTodo(todo.name),
        icon: <CheckCircle className="w-4 h-4" />,
        className: 'text-green-600 hover:bg-green-50'
      })
    }

    if (onCancelTodo) {
      items.push({
        label: 'Cancel Todo',
        onClick: () => onCancelTodo(todo.name),
        icon: <XCircle className="w-4 h-4" />,
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

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const frappeUrl = `${window.location.origin}/app/todo/${todo.name}`
    window.open(frappeUrl, '_blank')
  }

  return (
    <div
      className={`bg-white border border-slate-200 rounded-lg p-2 hover:bg-gray-50 transition-colors cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-30' : ''}`}
      title={`${todo.subject} - Double-click to open in Frappe`}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
    >
      <div className="flex items-start space-x-2">
        {/* Status Icon */}
        <div className="flex-shrink-0 pt-0.5">
          {getStatusIcon()}
        </div>

        {/* Main Content */}
        <div 
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          className="flex-1 min-w-0 cursor-move"
        >
          {/* Title and Priority */}
          <div className="flex items-start justify-between mb-1">
            <h4 className={`text-sm font-medium leading-tight ${todo.status === 'Closed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
              {todo.subject}
            </h4>
            {getPriorityBadge()}
          </div>

          {/* Compact Metadata */}
          <div className="space-y-1">
            {/* Project */}
            {todo.project && (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Tag className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{project?.project_name || todo.project}</span>
              </div>
            )}

            {/* Reference Type & Document */}
            {todo.reference_type && (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Folder className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{todo.reference_type}</span>
                {todo.reference_name && (
                  <span className="text-blue-600 font-medium">#{todo.reference_name}</span>
                )}
              </div>
            )}

            {/* Assignee */}
            {todo.allocated_to && (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <User className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">@{assignedUser?.full_name || todo.allocated_to}</span>
              </div>
            )}

            {/* Owner and Date */}
            <div className="flex items-center justify-between text-xs text-gray-400">
              {todo.owner && (
                <span className="truncate">by {todo.owner}</span>
              )}
              {todo.creation && (
                <span className="flex-shrink-0">{formatDate(todo.creation)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex-shrink-0">
          <button
            onClick={handleDoubleClick}
            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
            title="Open in Frappe"
          >
            <ExternalLink className="w-3 h-3" />
          </button>
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

const ToDoPalette: React.FC<ToDoPaletteProps> = ({ todos, projects, users = [], onAssignTodo, onCompleteTodo, onCancelTodo }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  // Project lookup
  const projectMap = useMemo(() => {
    const map = new Map<string, Project>()
    projects.forEach(p => map.set(p.name, p))
    return map
  }, [projects])

  // Filter todos
  const filteredTodos = useMemo(() => {
    return todos.filter(t => {
      const matchesSearch =
        !searchTerm ||
        (t.subject && t.subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.project && t.project.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesProject = !selectedProject || t.project === selectedProject
      return matchesSearch && matchesProject
    })
  }, [todos, searchTerm, selectedProject])

  // Group by reference_type (fallback to 'General')
  const grouped = useMemo(() => {
    const groups = new Map<string, TodoLite[]>()
    filteredTodos.forEach(t => {
      const key = t.reference_type || 'General'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(t)
    })
    return Array.from(groups.entries()).map(([referenceType, list]) => ({
      referenceType,
      displayName: referenceType === 'General' ? 'General Tasks' : `${referenceType}s`,
      todos: list.sort((a, b) => {
        const aSubject = (a.subject != null ? String(a.subject) : '')
        const bSubject = (b.subject != null ? String(b.subject) : '')
        return aSubject.localeCompare(bSubject)
      })
    }))
  }, [filteredTodos])

  // Default expanded (except Activities which are collapsed by default)
  useEffect(() => {
    setCollapsed(prev => {
      const next = { ...prev }
      grouped.forEach(({ referenceType }) => {
        if (next[referenceType] === undefined) {
          // Default Activities to collapsed, everything else expanded
          next[referenceType] = referenceType === 'Activity'
        }
      })
      return next
    })
  }, [grouped])

  return (
    <div className="bg-white rounded-lg shadow-sm border flex flex-col h-full">
      <div className="p-4 border-b flex-shrink-0">
        <div className="flex items-center space-x-2 mb-4">
          <CheckSquare className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">ToDos</h3>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search todos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Project Filter */}
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Projects</option>
          {projects.map(project => (
            <option key={project.name} value={project.name}>
              {project.project_name}
            </option>
          ))}
          {/* Include General if present */}
          {todos.some(t => !t.project) && (
            <option value="Unassigned">General</option>
          )}
        </select>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {grouped.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No todos found</p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-blue-600 text-sm hover:underline mt-1"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(({ referenceType, displayName, todos }) => (
              <div key={referenceType}>
                <div
                  className="flex items-center justify-between mb-2 cursor-pointer select-none"
                  onClick={() => setCollapsed(prev => ({ ...prev, [referenceType]: !prev[referenceType] }))}
                >
                  <div className="flex items-center space-x-2">
                    <Folder className="w-4 h-4 text-gray-400" />
                    <h4 className="font-medium text-sm text-gray-700">
                      {displayName}
                    </h4>
                    <span className="text-xs text-gray-500">
                      ({todos.length})
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {collapsed[referenceType] ? '►' : '▼'}
                  </span>
                </div>

                {!collapsed[referenceType] && (
                  <div className="space-y-2 ml-6">
                    {todos.map(todo => {
                      const project = projectMap.get(todo.project || '')
                      return (
                        <DraggableTodo 
                          key={todo.name} 
                          todo={todo} 
                          project={project}
                          users={users}
                          onAssignTodo={onAssignTodo}
                          onCompleteTodo={onCompleteTodo}
                          onCancelTodo={onCancelTodo}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t bg-gray-50 rounded-b-lg">
        <p className="text-xs text-gray-600">
          💡 Drag ToDos to calendar slots to create planner entries
        </p>
      </div>
    </div>
  )
}

export default ToDoPalette
