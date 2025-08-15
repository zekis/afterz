import React, { useEffect, useState } from 'react'
import { Plus, Filter, Users, Search } from 'lucide-react'
import { TodoService } from '../services/todoService'
import { UserService } from '../services/timesheetService'
import { TodoLite, User } from '../types'
import TodoTable from '../components/WhatWorkz/Table/TodoTable'
import CreateTodoModal from '../components/WhatWorkz/CreateTodoModal'
import EditTodoModal from '../components/WhatWorkz/EditTodoModal'
import AssignTodoModal from '../components/WhatWorkz/AssignTodoModal'
import HistoryPanel from '../components/Common/HistoryPanel'
import { PageHeader, ActionToolbar, ContentLayout } from '../components/Layout'
import { ExtendedTodo, TodoAccess } from '../types'

type GroupBy = 'status' | 'priority' | 'assignee' | 'project' | 'due_date' | 'owner' | 'reference_type'
type SortBy = 'priority' | 'due_date' | 'created' | 'modified' | 'assignee'
type ViewMode = 'my_todos' | 'assigned_to_me' | 'shared_with_me' | 'all'

const TodoManagement: React.FC = () => {
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
  const [editModal, setEditModal] = useState<{
    isOpen: boolean
    todo: ExtendedTodo | null
  }>({
    isOpen: false,
    todo: null
  })
  const [assignModal, setAssignModal] = useState<{
    isOpen: boolean
    todo: ExtendedTodo | null
  }>({
    isOpen: false,
    todo: null
  })
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

      const allTodos = await TodoService.getAllTodos()
      
      // Enhance todos with additional metadata
      const enhancedTodos: ExtendedTodo[] = allTodos.map(todo => ({
        ...todo,
        planning_entries: [],
        comment_count: 0,
        last_activity: todo.modified || todo.creation || new Date().toISOString(),
        tags: [],
        is_owned: todo.owner === currentUser?.name,
        is_assigned: todo.allocated_to === currentUser?.name,
        is_shared: false,
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
        await loadTodos()
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

  const handleCompleteTodo = async (todoName: string) => {
    try {
      const result = await TodoService.completeTodo(todoName)
      if (result.success) {
        await loadTodos()
        showToast('Todo completed successfully!')
      } else {
        showToast(result.error || 'Failed to complete todo')
      }
    } catch (error) {
      console.error('Complete todo failed:', error)
      showToast('Failed to complete todo')
    }
  }

  const handleCancelTodo = async (todoName: string) => {
    try {
      const result = await TodoService.cancelTodo(todoName)
      if (result.success) {
        await loadTodos()
        showToast('Todo cancelled successfully!')
      } else {
        showToast(result.error || 'Failed to cancel todo')
      }
    } catch (error) {
      console.error('Cancel todo failed:', error)
      showToast('Failed to cancel todo')
    }
  }

  const handleAssignTodo = async (todoName: string, userId: string) => {
    try {
      const result = await TodoService.assignTodo(todoName, userId)
      if (result.success) {
        await loadTodos()
        showToast(userId ? 'Todo assigned successfully!' : 'Todo unassigned successfully!')
      } else {
        showToast(result.error || 'Failed to assign todo')
      }
    } catch (error) {
      console.error('Assign todo failed:', error)
      showToast('Failed to assign todo')
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

  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 3000)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading todos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
          <button 
            onClick={loadTodos}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <PageHeader
        title="Todos"
        description="Manage your tasks and assignments"
      >
        <ActionToolbar
          onCreateTodo={() => setShowCreateModal(true)}
        />
      </PageHeader>

      {/* Content Area */}
      <ContentLayout
        mainContent={
          <TodoTable
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
            onCompleteTodo={handleCompleteTodo}
            onCancelTodo={handleCancelTodo}
            onDeleteTodo={handleDeleteTodo}
            onEditTodo={(todo) => {
              setEditModal({
                isOpen: true,
                todo: todo
              })
            }}
            onAssignTodo={(todo) => {
              setAssignModal({
                isOpen: true,
                todo: todo
              })
            }}
            onTodoClick={(todo) => {
              setHistoryPanel({
                isOpen: true,
                doctype: 'ToDo',
                docname: todo.name,
                title: todo.subject
              })
            }}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        }
        rightPanel={
          historyPanel.isOpen ? (
            <HistoryPanel
              isOpen={historyPanel.isOpen}
              onClose={() => setHistoryPanel(prev => ({ ...prev, isOpen: false }))}
              doctype={historyPanel.doctype}
              docname={historyPanel.docname}
              title={historyPanel.title}
            />
          ) : undefined
        }
      />

      {/* Create Todo Modal */}
      <CreateTodoModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateTodo={handleCreateTodo}
      />

      {/* Edit Todo Modal */}
      <EditTodoModal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, todo: null })}
        todo={editModal.todo}
        onUpdateTodo={handleUpdateTodo}
      />

      {/* Assign Todo Modal */}
      <AssignTodoModal
        isOpen={assignModal.isOpen}
        onClose={() => setAssignModal({ isOpen: false, todo: null })}
        todo={assignModal.todo}
        onAssignTodo={handleAssignTodo}
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
    </div>
  )
}

export default TodoManagement
