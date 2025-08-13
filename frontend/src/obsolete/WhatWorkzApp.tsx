import React, { useEffect, useState } from 'react'
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core'
import { Search, Plus, Filter, SortAsc } from 'lucide-react'
import { TodoService } from './services/todoService'
import { UserService } from './services/timesheetService'
import { TodoLite, User } from './types'
import TodoList from './components/WhatWorkz/TodoList'
import TodoFilters from './components/WhatWorkz/TodoFilters'
import CreateTodoModal from './components/WhatWorkz/CreateTodoModal'
import NavigationDropdown from './components/Controls/NavigationDropdown'
import HistoryPanel from './components/Common/HistoryPanel'

export interface ExtendedTodo extends TodoLite {
  planning_entries?: any[]
  comment_count: number
  last_activity: string
  tags: string[]
  estimated_hours?: number
  actual_hours?: number
  is_owned: boolean
  is_assigned: boolean
  is_shared: boolean
  owner_name?: string
  assigned_user_name?: string
}

export interface TodoAccess {
  owned_todos: ExtendedTodo[]
  assigned_todos: ExtendedTodo[]
  shared_todos: ExtendedTodo[]
  all_todos: ExtendedTodo[]
}

type GroupBy = 'status' | 'priority' | 'assignee' | 'project' | 'due_date' | 'owner'
type SortBy = 'priority' | 'due_date' | 'created' | 'modified' | 'assignee'
type ViewMode = 'my_todos' | 'assigned_to_me' | 'shared_with_me' | 'all'

function WhatWorkzApp() {
  // State
  const [todos, setTodos] = useState<TodoAccess>({
    owned_todos: [],
    assigned_todos: [],
    shared_todos: [],
    all_todos: []
  })
  const [filteredTodos, setFilteredTodos] = useState<ExtendedTodo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [groupBy, setGroupBy] = useState<GroupBy>('status')
  const [sortBy, setSortBy] = useState<SortBy>('priority')
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [selectedTodos, setSelectedTodos] = useState<Set<string>>(new Set())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  
  // History panel state
  const [historyPanel, setHistoryPanel] = useState<{
    isOpen: boolean
    doctype: string
    docname: string
    title: string
  }>({
    isOpen: false,
    doctype: '',
    docname: '',
    title: ''
  })

  const currentUser: User | null = UserService.getCurrentUser()

  // Load todos on mount
  useEffect(() => {
    loadTodos()
  }, [])

  // Filter and sort todos when dependencies change
  useEffect(() => {
    filterAndSortTodos()
  }, [todos, searchTerm, groupBy, sortBy, viewMode])

  const loadTodos = async () => {
    try {
      setLoading(true)
      setError(null)

      // For now, we'll use the existing todo service and enhance the data
      const allTodos = await TodoService.getAllTodos()
      
      // Enhance todos with additional metadata
      const enhancedTodos: ExtendedTodo[] = allTodos.map(todo => ({
        ...todo,
        planning_entries: [], // TODO: Load from planner service
        comment_count: 0, // TODO: Load from comments API
        last_activity: todo.modified || todo.creation || new Date().toISOString(),
        tags: [], // TODO: Extract from description or add tags field
        is_owned: todo.owner === currentUser?.name,
        is_assigned: todo.allocated_to === currentUser?.name,
        is_shared: false, // TODO: Check Frappe sharing permissions
        owner_name: todo.owner,
        assigned_user_name: todo.allocated_to
      }))

      // Categorize todos
      const todoAccess: TodoAccess = {
        owned_todos: enhancedTodos.filter(t => t.is_owned),
        assigned_todos: enhancedTodos.filter(t => t.is_assigned),
        shared_todos: enhancedTodos.filter(t => t.is_shared),
        all_todos: enhancedTodos
      }

      setTodos(todoAccess)
    } catch (err) {
      console.error('Failed to load todos:', err)
      setError('Failed to load todos. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortTodos = () => {
    let todosToShow: ExtendedTodo[] = []

    // Select todos based on view mode
    switch (viewMode) {
      case 'my_todos':
        todosToShow = todos.owned_todos
        break
      case 'assigned_to_me':
        todosToShow = todos.assigned_todos
        break
      case 'shared_with_me':
        todosToShow = todos.shared_todos
        break
      case 'all':
      default:
        todosToShow = todos.all_todos
        break
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      todosToShow = todosToShow.filter(todo =>
        (todo.subject && todo.subject.toLowerCase().includes(searchLower)) ||
        (todo.project && todo.project.toLowerCase().includes(searchLower)) ||
        (todo.allocated_to && todo.allocated_to.toLowerCase().includes(searchLower)) ||
        (todo.owner_name && todo.owner_name.toLowerCase().includes(searchLower))
      )
    }

    // Apply sorting
    todosToShow.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 }
          const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0
          const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0
          return bPriority - aPriority
        case 'due_date':
          // TODO: Add due_date field to todos
          return 0
        case 'created':
          return new Date(b.creation || 0).getTime() - new Date(a.creation || 0).getTime()
        case 'modified':
          return new Date(b.modified || 0).getTime() - new Date(a.modified || 0).getTime()
        case 'assignee':
          return (a.allocated_to || '').localeCompare(b.allocated_to || '')
        default:
          return 0
      }
    })

    setFilteredTodos(todosToShow)
  }

  const handleCreateTodo = async (todoData: Partial<TodoLite>) => {
    try {
      const result = await TodoService.createTodo(
        todoData.subject || '',
        todoData.project,
        todoData.allocated_to
      )
      
      if (result.success) {
        await loadTodos() // Reload to get the new todo
        setShowCreateModal(false)
        showToast('Todo created successfully!')
      } else {
        showToast(result.error || 'Failed to create todo')
      }
    } catch (error) {
      console.error('Create todo failed:', error)
      showToast('Failed to create todo')
    }
  }

  const handleUpdateTodo = async (todoName: string, updates: Partial<TodoLite>) => {
    try {
      const result = await TodoService.updateTodo(todoName, updates)
      if (result.success) {
        await loadTodos()
        showToast('Todo updated successfully!')
      } else {
        showToast(result.error || 'Failed to update todo')
      }
    } catch (error) {
      console.error('Update todo failed:', error)
      showToast('Failed to update todo')
    }
  }

  const handleDeleteTodo = async (todoName: string) => {
    if (!confirm('Are you sure you want to delete this todo?')) return
    
    try {
      const result = await TodoService.deleteTodo(todoName)
      if (result.success) {
        await loadTodos()
        showToast('Todo deleted successfully!')
      } else {
        showToast(result.error || 'Failed to delete todo')
      }
    } catch (error) {
      console.error('Delete todo failed:', error)
      showToast('Failed to delete todo')
    }
  }

  const handleBulkAction = async (action: string, todoNames: string[]) => {
    // TODO: Implement bulk actions
    console.log('Bulk action:', action, todoNames)
  }

  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const getViewModeLabel = (mode: ViewMode): string => {
    switch (mode) {
      case 'my_todos': return 'My Todos'
      case 'assigned_to_me': return 'Assigned to Me'
      case 'shared_with_me': return 'Shared with Me'
      case 'all': return 'All Todos'
      default: return 'All Todos'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading What-Workz...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
          <button 
            onClick={loadTodos}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-purple-700 shadow-lg">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                  <Search className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">What-Workz</h1>
                  <span className="text-xs text-purple-100">Manage what needs to be done</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {currentUser && (
                <NavigationDropdown 
                  currentUser={currentUser}
                />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full h-[calc(100vh-64px)] flex flex-col">
        {/* ROW 2: Controls Bar */}
        <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between flex-shrink-0 border-b border-gray-200 bg-white">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search todos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 w-64"
              />
            </div>

            {/* View Mode */}
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Todos ({todos.all_todos.length})</option>
              <option value="my_todos">My Todos ({todos.owned_todos.length})</option>
              <option value="assigned_to_me">Assigned to Me ({todos.assigned_todos.length})</option>
              <option value="shared_with_me">Shared with Me ({todos.shared_todos.length})</option>
            </select>

            {/* Group By */}
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="status">Group by Status</option>
              <option value="priority">Group by Priority</option>
              <option value="assignee">Group by Assignee</option>
              <option value="project">Group by Project</option>
              <option value="owner">Group by Owner</option>
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="priority">Sort by Priority</option>
              <option value="created">Sort by Created</option>
              <option value="modified">Sort by Modified</option>
              <option value="assignee">Sort by Assignee</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {selectedTodos.size > 0 && (
              <div className="flex items-center space-x-2 mr-4">
                <span className="text-sm text-gray-600">{selectedTodos.size} selected</span>
                <button className="text-sm text-purple-600 hover:text-purple-700">
                  Bulk Actions
                </button>
              </div>
            )}
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Todo</span>
            </button>
          </div>
        </div>

        {/* ROW 3: Content Area */}
        <div className="flex-1 min-h-0 px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex gap-6 h-full min-h-0">
            {/* Todo List */}
            <div className={`min-h-0 min-w-0 transition-all duration-300 ${historyPanel.isOpen ? 'flex-1' : 'flex-1'}`}>
              <div className="h-full overflow-y-auto light-scrollbar">
                <TodoList
                  todos={filteredTodos}
                  groupBy={groupBy}
                  selectedTodos={selectedTodos}
                  onSelectTodo={(todoName, selected) => {
                    const newSelected = new Set(selectedTodos)
                    if (selected) {
                      newSelected.add(todoName)
                    } else {
                      newSelected.delete(todoName)
                    }
                    setSelectedTodos(newSelected)
                  }}
                  onUpdateTodo={handleUpdateTodo}
                  onDeleteTodo={handleDeleteTodo}
                  onTodoClick={(todo) => {
                    setHistoryPanel({
                      isOpen: true,
                      doctype: 'ToDo',
                      docname: todo.name,
                      title: todo.subject
                    })
                  }}
                />
              </div>
            </div>

            {/* History Panel */}
            {historyPanel.isOpen && (
              <div className="w-80 flex-shrink-0 min-h-0">
                <div className="h-full overflow-y-auto overflow-x-hidden">
                  <HistoryPanel
                    isOpen={historyPanel.isOpen}
                    onClose={() => setHistoryPanel(prev => ({ ...prev, isOpen: false }))}
                    doctype={historyPanel.doctype}
                    docname={historyPanel.docname}
                    title={historyPanel.title}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create Todo Modal */}
        <CreateTodoModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreateTodo={handleCreateTodo}
        />

        {/* Toast Message */}
        {toastMessage && (
          <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm">{toastMessage}</span>
              <button
                onClick={() => setToastMessage(null)}
                className="ml-2 text-green-500 hover:text-green-700"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default WhatWorkzApp
