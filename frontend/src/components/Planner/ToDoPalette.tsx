import React, { useMemo, useState, useEffect } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Search, Folder, CheckSquare, UserPlus, CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import { TodoLite, Project, User as UserType } from '../../types'
import { getActivityColor } from '../../lib/utils'
import AppModeToggle from '../Controls/AppModeToggle'
import QuickTodoForm from './QuickTodoForm'
import ContextMenu from '../Common/ContextMenu'

interface ToDoPaletteProps {
  todos: TodoLite[]
  projects: Project[]
  currentUser?: UserType
  users?: UserType[]
  onCreateTodo?: (subject: string) => Promise<void>
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

  // color coding by subject for consistency with entries
  const colors = getActivityColor(todo.subject || todo.name)

  // Find assigned user
  const assignedUser = users.find(user => user.name === todo.allocated_to)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Context menu triggered for todo:', todo.name)
    console.log('Menu items:', getContextMenuItems())
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY }
    })
  }

  const getContextMenuItems = () => {
    const items: any[] = []

    // Add open in Frappe option
    items.push({
      label: 'Open in Frappe',
      onClick: () => {
        const frappeUrl = `${window.location.origin}/app/todo/${todo.name}`
        window.open(frappeUrl, '_blank')
      },
      icon: <ExternalLink className="w-4 h-4" />,
      className: 'text-blue-600 hover:bg-blue-50'
    })

    // Add complete and cancel options
    if (onCompleteTodo) {
      items.push({
        label: 'Mark Complete',
        onClick: () => {
          console.log('Complete todo clicked:', todo.name)
          onCompleteTodo(todo.name)
        },
        icon: <CheckCircle className="w-4 h-4" />,
        className: 'text-green-600 hover:bg-green-50'
      })
    }

    if (onCancelTodo) {
      items.push({
        label: 'Cancel Todo',
        onClick: () => {
          console.log('Cancel todo clicked:', todo.name)
          onCancelTodo(todo.name)
        },
        icon: <XCircle className="w-4 h-4" />,
        className: 'text-red-600 hover:bg-red-50'
      })
    }


    return items
  }

  // Get priority badge styling
  const getPriorityBadge = () => {
    if (!todo.priority) return null
    
    const priorityStyles = {
      'High': 'bg-red-100 text-red-700 border-red-200',
      'Medium': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'Low': 'bg-green-100 text-green-700 border-green-200'
    }
    
    return (
      <span className={`px-1.5 py-0.5 text-xs font-medium rounded border ${priorityStyles[todo.priority]}`}>
        {todo.priority}
      </span>
    )
  }

  // Handle double-click to open in Frappe
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const frappeUrl = `${window.location.origin}/app/todo/${todo.name}`
    window.open(frappeUrl, '_blank')
  }

  return (
    <div
      className={`activity-item p-3 rounded-lg border cursor-grab active:cursor-grabbing transition-colors hover:shadow-md ${colors.bg} ${colors.border} ${colors.leftBorder} ${colors.leftBorderThick} ${colors.text} ${isDragging ? 'opacity-30' : ''} relative`}
      title={`${todo.subject} - Double-click to open in Frappe`}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
    >
      <div className="flex items-start justify-between">
        {/* Draggable area - only the main content */}
        <div 
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          className="flex-1 min-w-0 cursor-move"
        >
          <div className="font-medium text-sm text-gray-900 truncate">
            {todo.subject}
          </div>
          <div className="text-xs text-gray-600 truncate">
            {project?.project_name || todo.project || ''}
          </div>
          
          {/* Priority badge row */}
          {todo.priority && (
            <div className="mt-1">
              {getPriorityBadge()}
            </div>
          )}
        </div>
        
        {/* Non-draggable area - badges and icons */}
        <div className="ml-2 flex items-center space-x-1">
          {/* Assigned user badge */}
          {todo.allocated_to && (
            <div 
              className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-medium"
              title={assignedUser ? `Assigned to ${assignedUser.full_name}` : `Assigned to ${todo.allocated_to}`}
            >
              {assignedUser ? getUserInitials(assignedUser.full_name) : getUserInitials(todo.allocated_to)}
            </div>
          )}
          <CheckSquare className="w-4 h-4 text-gray-400" />
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

const ToDoPalette: React.FC<ToDoPaletteProps> = ({ todos, projects, users = [], onCreateTodo, onAssignTodo, onCompleteTodo, onCancelTodo }) => {
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
      todos: list.sort((a, b) => (a.subject || '').localeCompare(b.subject || ''))
    }))
  }, [filteredTodos])

  // Default expanded
  useEffect(() => {
    setCollapsed(prev => {
      const next = { ...prev }
      grouped.forEach(({ referenceType }) => {
        if (next[referenceType] === undefined) next[referenceType] = false
      })
      return next
    })
  }, [grouped])

  return (
    <div className="bg-white rounded-lg shadow-sm border flex flex-col h-full">
      <div className="p-4 border-b flex-shrink-0">
        <div className="mb-4">
          <AppModeToggle 
            currentMode="plan" 
            onModeChange={() => {}} 
          />
          
          {onCreateTodo && (
            <div className="mt-3">
              <QuickTodoForm 
                onCreateTodo={onCreateTodo}
              />
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2 mb-4">
          <CheckSquare className="w-5 h-5 text-indigo-600" />
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
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Project Filter */}
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                className="text-indigo-600 text-sm hover:underline mt-1"
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
