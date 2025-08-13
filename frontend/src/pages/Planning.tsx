import React, { useEffect, useState } from 'react'
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core'
import PlannerWeeklyCalendar from '../components/Planner/PlannerWeeklyCalendar'
import PlannerDailyCalendar from '../components/Planner/PlannerDailyCalendar'
import ToDoPalette from '../components/Planner/ToDoPalette'
import CalendarViewToggle from '../components/Controls/CalendarViewToggle'
import HistoryPanel from '../components/Common/HistoryPanel'
import EditPlannerEntryModal from '../components/Planner/EditPlannerEntryModal'
import { PageHeader, ContentLayout, ActionToolbar } from '../components/Layout'
import CreateTodoModal from '../components/WhatWorkz/CreateTodoModal'
import { PlannerService } from '../services/plannerService'
import { ProjectService, UserService } from '../services/timesheetService'
import { TodoService } from '../services/todoService'
import { PlannerEntry, TodoLite, Project, User } from '../types'
import { getWeekData, parseDateTime, createLocalDateTime, formatDateTimeForBackend } from '../lib/utils'
import { Clock } from 'lucide-react'

type PlannerCalendarEvent = {
  id: string
  title: string
  start: Date
  end?: Date
  project?: string
  status: 'Planned' | 'In Progress' | 'Completed' | 'Cancelled'
  duration?: number
  notes?: string
}

const Planning: React.FC = () => {
  // State
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [currentDay, setCurrentDay] = useState(new Date())
  const [calendarView, setCalendarView] = useState<'week' | 'day'>(() => {
    const saved = localStorage.getItem('beforez-calendar-view')
    return (saved === 'day' || saved === 'week') ? saved : 'week'
  })
  const [viewMode, setViewMode] = useState<'6am-6pm' | 'full-day'>(() => {
    const saved = localStorage.getItem('beforez-view-mode')
    return (saved === '6am-6pm' || saved === 'full-day') ? saved : '6am-6pm'
  })
  const [plannerEntries, setPlannerEntries] = useState<PlannerEntry[]>([])
  const [todos, setTodos] = useState<TodoLite[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toastError, setToastError] = useState<string | null>(null)
  const [draggedTodo, setDraggedTodo] = useState<TodoLite | null>(null)
  const [draggedEntry, setDraggedEntry] = useState<PlannerCalendarEvent | null>(null)
  
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

  // Selected entry state
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)

  // Edit modal state
  const [editModal, setEditModal] = useState<{
    isOpen: boolean
    entry: PlannerCalendarEvent | null
  }>({
    isOpen: false,
    entry: null
  })

  // Create todo modal state
  const [showCreateModal, setShowCreateModal] = useState(false)

  const currentUser: User | null = UserService.getCurrentUser()

  // Init
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
        
        // Set current user as selected by default
        if (currentUser) {
          setSelectedUser(currentUser.name)
        }
        
        await Promise.all([
          loadProjects(),
          loadUsers(),
          loadTodos()
        ])
      } catch (e) {
        console.error(e)
        setError('Failed to initialize planner.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // Load when week/user/day/view changes
  useEffect(() => {
    if (selectedUser) {
      loadPlannerEntries()
      loadTodos()
    }
  }, [currentWeek, currentDay, selectedUser, calendarView])

  // Responsive behavior - auto-switch to day view on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && calendarView === 'week') {
        setCalendarView('day')
      }
    }

    handleResize() // Check on mount
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [calendarView])

  // Sync currentDay with currentWeek when switching views
  useEffect(() => {
    if (calendarView === 'day') {
      const week = getWeekData(currentWeek)
      const dayWeek = getWeekData(currentDay)
      if (dayWeek.startDate.getTime() !== week.startDate.getTime()) {
        setCurrentDay(week.startDate)
      }
    }
  }, [calendarView])

  const loadProjects = async () => {
    try {
      const proj = await ProjectService.getActiveProjects()
      setProjects(proj)
    } catch (e) {
      console.error('Failed to load projects', e)
    }
  }

  const loadUsers = async () => {
    try {
      const userData = await UserService.getProjectUsers()
      setUsers(userData)
    } catch (err) {
      console.error('Failed to load users:', err)
    }
  }

  const loadTodos = async () => {
    try {
      const userParam = (currentUser?.name === 'Administrator' && selectedUser === 'Administrator') 
        ? undefined
        : selectedUser
      
      const list = await PlannerService.getUserTodos(userParam)
      setTodos(list)
    } catch (e) {
      console.error('Failed to load todos', e)
    }
  }

  const loadPlannerEntries = async () => {
    try {
      let startDate: Date, endDate: Date
      
      if (calendarView === 'day') {
        const week = getWeekData(currentDay)
        startDate = week.startDate
        endDate = week.endDate
      } else {
        const week = getWeekData(currentWeek)
        startDate = week.startDate
        endDate = week.endDate
      }
      
      const rows = await PlannerService.getPlannerEntries(startDate, endDate, selectedUser)
      setPlannerEntries(rows)
    } catch (e) {
      console.error('Failed to load planner entries', e)
      setError('Failed to load planner entries.')
    }
  }

  // Map to calendar events
  const getCalendarEvents = (): PlannerCalendarEvent[] => {
    return plannerEntries.map((pe) => {
      const start = parseDateTime(pe.plan_start)
      const end = pe.plan_end ? parseDateTime(pe.plan_end) : undefined
      const duration = end ? Math.max(0.0, (end.getTime() - start.getTime()) / (1000 * 60 * 60)) : 1
      return {
        id: pe.name || '',
        title: pe.title,
        start,
        end,
        project: pe.project,
        status: pe.status,
        duration,
        notes: pe.notes
      }
    })
  }

  // DnD handlers
  const handleDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current
    if (data?.type === 'todo') {
      setDraggedTodo(data.todo)
      setDraggedEntry(null)
    } else if (data?.type === 'planner-entry') {
      setDraggedEntry(data.event)
      setDraggedTodo(null)
    } else {
      setDraggedTodo(null)
      setDraggedEntry(null)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    const data = active.data.current
    
    setDraggedTodo(null)
    setDraggedEntry(null)
    
    if (!over || !selectedUser) return

    const slotId = String(over.id || '')
    const match = slotId.match(/^slot-(\d+)-(\d+)$/)
    if (!match) return

    const dayIndex = parseInt(match[1], 10)
    const hour = parseInt(match[2], 10)

    let targetDate: Date
    if (calendarView === 'day') {
      targetDate = currentDay
    } else {
      const week = getWeekData(currentWeek)
      targetDate = week.days[dayIndex]
    }

    if (data?.type === 'todo') {
      const todo = data.todo as TodoLite
      if (!todo) return

      const start = createLocalDateTime(targetDate, hour, 0)
      const end = createLocalDateTime(targetDate, hour + 1, 0)

      const validProject = todo.project && projects.some(p => p.name === todo.project) 
        ? todo.project 
        : undefined

      try {
        const res = await PlannerService.createPlannerEntry({
          user: selectedUser,
          todo: todo.name,
          project: validProject,
          title: todo.subject || 'Planned Work',
          plan_start: formatDateTimeForBackend(start),
          plan_end: formatDateTimeForBackend(end),
          status: 'Planned'
        })
        if (!res?.success) {
          setToastError(res?.error || 'Failed to create planner entry.')
          setTimeout(() => setToastError(null), 3000)
        } else {
          loadPlannerEntries()
        }
      } catch (e) {
        console.error('Create planner entry failed', e)
        setToastError('Failed to create planner entry.')
        setTimeout(() => setToastError(null), 3000)
      }

    } else if (data?.type === 'planner-entry') {
      const ev = data.event as PlannerCalendarEvent
      if (!ev) return

      const duration = ev.duration || (ev.end ? Math.max(0.1, (ev.end.getTime() - ev.start.getTime()) / (1000 * 60 * 60)) : 1)
      const start = createLocalDateTime(targetDate, hour, 0)
      const end = createLocalDateTime(targetDate, hour + duration, 0)

      try {
        const res = await PlannerService.updatePlannerEntry(ev.id, {
          plan_start: formatDateTimeForBackend(start),
          plan_end: formatDateTimeForBackend(end)
        })
        if (!res?.success) {
          setToastError(res?.error || 'Failed to move entry.')
          setTimeout(() => setToastError(null), 3000)
        } else {
          loadPlannerEntries()
        }
      } catch (e) {
        console.error('Move planner entry failed', e)
        setToastError('Failed to move entry.')
        setTimeout(() => setToastError(null), 3000)
      }
    }
  }

  const handleWeekChange = (newWeek: Date) => setCurrentWeek(newWeek)
  const handleDayChange = (newDay: Date) => setCurrentDay(newDay)
  const handleCalendarViewChange = (view: 'week' | 'day') => {
    setCalendarView(view)
    localStorage.setItem('beforez-calendar-view', view)
  }
  const handleViewModeChange = (mode: '6am-6pm' | 'full-day') => {
    setViewMode(mode)
    localStorage.setItem('beforez-view-mode', mode)
  }

  const handleEntryClick = (event: PlannerCalendarEvent, clickPosition: { x: number; y: number }) => {
    setSelectedEntryId(event.id)
    setHistoryPanel({
      isOpen: true,
      doctype: 'Planner Entry',
      docname: event.id,
      title: event.title
    })
  }

  const handleEditEntry = (event: PlannerCalendarEvent) => {
    setEditModal({
      isOpen: true,
      entry: event
    })
  }

  const handleCreateTodo = async (subject: string) => {
    try {
      const result = await TodoService.createTodo(subject, undefined, selectedUser)
      if (result.success) {
        await loadTodos()
      } else {
        setToastError(result.error || 'Failed to create todo')
        setTimeout(() => setToastError(null), 3000)
      }
    } catch (error) {
      console.error('Create todo failed:', error)
      setToastError('Failed to create todo')
      setTimeout(() => setToastError(null), 3000)
    }
  }

  const handleCreateTodoFromModal = async (todoData: Partial<TodoLite>) => {
    try {
      const result = await TodoService.createTodo(
        todoData.subject || '',
        todoData.project,
        todoData.allocated_to || selectedUser
      )
      
      if (result.success) {
        await loadTodos()
        setShowCreateModal(false)
        // Show success toast
        const toast = document.createElement('div')
        toast.className = 'fixed top-4 right-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg'
        toast.innerHTML = `
          <div class="flex items-center justify-between">
            <span class="text-sm">Todo created successfully!</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-green-500 hover:text-green-700">×</button>
          </div>
        `
        document.body.appendChild(toast)
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast)
          }
        }, 3000)
      } else {
        setToastError(result.error || 'Failed to create todo')
        setTimeout(() => setToastError(null), 3000)
      }
    } catch (error) {
      console.error('Create todo failed:', error)
      setToastError('Failed to create todo')
      setTimeout(() => setToastError(null), 3000)
    }
  }

  const handleAssignTodo = async (todoName: string, newUser: string) => {
    try {
      const result = await TodoService.assignTodo(todoName, newUser)
      if (result.success) {
        await loadTodos()
      } else {
        setToastError(result.error || 'Failed to assign todo')
        setTimeout(() => setToastError(null), 3000)
      }
    } catch (error) {
      console.error('Assign todo failed:', error)
      setToastError('Failed to assign todo')
      setTimeout(() => setToastError(null), 3000)
    }
  }

  const handleCompleteTodo = async (todoName: string) => {
    try {
      const result = await TodoService.completeTodo(todoName)
      if (result.success) {
        await loadTodos()
      } else {
        setToastError(result.error || 'Failed to complete todo')
        setTimeout(() => setToastError(null), 3000)
      }
    } catch (error) {
      console.error('Complete todo failed:', error)
      setToastError('Failed to complete todo')
      setTimeout(() => setToastError(null), 3000)
    }
  }

  const handleCancelTodo = async (todoName: string) => {
    try {
      const result = await TodoService.cancelTodo(todoName)
      if (result.success) {
        await loadTodos()
      } else {
        setToastError(result.error || 'Failed to cancel todo')
        setTimeout(() => setToastError(null), 3000)
      }
    } catch (error) {
      console.error('Cancel todo failed:', error)
      setToastError('Failed to cancel todo')
      setTimeout(() => setToastError(null), 3000)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-600">Loading planner...</p>
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
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Page Header */}
        <PageHeader
          title="Planning"
          description="Plan first, execute better"
        >
          <div className="flex items-center space-x-4">
            <ActionToolbar
              onCreateTodo={() => setShowCreateModal(true)}
            />
            <CalendarViewToggle
              calendarView={calendarView}
              onCalendarViewChange={handleCalendarViewChange}
              currentWeek={currentWeek}
              currentDay={currentDay}
              onWeekChange={handleWeekChange}
              onDayChange={handleDayChange}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
            />
          </div>
        </PageHeader>

        {/* Content Area */}
        <ContentLayout
          leftPanel={
            <div className="p-6">
              <ToDoPalette 
                todos={todos} 
                projects={projects} 
                currentUser={currentUser || undefined}
                users={users}
                onAssignTodo={handleAssignTodo}
                onCompleteTodo={handleCompleteTodo}
                onCancelTodo={handleCancelTodo}
              />
            </div>
          }
          mainContent={
            <div className="h-full overflow-y-auto p-6">
              {calendarView === 'week' ? (
                <PlannerWeeklyCalendar
                  currentWeek={currentWeek}
                  events={getCalendarEvents()}
                  viewMode={viewMode}
                  onEventUpdate={loadPlannerEntries}
                  projects={projects}
                  allEntries={plannerEntries}
                  onToastError={setToastError}
                  onEntryClick={handleEntryClick}
                  onEditEntry={handleEditEntry}
                  onTodoUpdate={loadTodos}
                  selectedEntryId={selectedEntryId}
                />
              ) : (
                <PlannerDailyCalendar
                  currentDay={currentDay}
                  events={getCalendarEvents()}
                  viewMode={viewMode}
                  onEventUpdate={loadPlannerEntries}
                  projects={projects}
                  allEntries={plannerEntries}
                  onToastError={setToastError}
                  onEntryClick={handleEntryClick}
                  onEditEntry={handleEditEntry}
                  onTodoUpdate={loadTodos}
                  selectedEntryId={selectedEntryId}
                />
              )}
            </div>
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

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedTodo && (
            <div className="activity-item bg-indigo-100 border-indigo-300 text-indigo-800 opacity-90 transform rotate-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">
                    {draggedTodo.subject}
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {draggedTodo.project || ''}
                  </div>
                </div>
              </div>
            </div>
          )}
          {draggedEntry && (
            <div className="bg-indigo-100 border-indigo-300 text-indigo-800 rounded text-xs shadow-lg opacity-90 transform rotate-3 p-2">
              <div className="font-medium text-xs truncate">
                {draggedEntry.title}
              </div>
              <div className="text-xs opacity-75 truncate">
                {draggedEntry.project || ''}
              </div>
            </div>
          )}
        </DragOverlay>

        {/* Edit Planner Entry Modal */}
        <EditPlannerEntryModal
          isOpen={editModal.isOpen}
          onClose={() => setEditModal({ isOpen: false, entry: null })}
          entry={editModal.entry}
          projects={projects}
          onUpdate={loadPlannerEntries}
          onToastError={setToastError}
        />

        {/* Create Todo Modal */}
        <CreateTodoModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreateTodo={handleCreateTodoFromModal}
        />

        {/* Toast Error */}
        {toastError && (
          <div className="fixed top-4 right-4 z-50 bg-orange-100 border border-orange-400 text-orange-700 px-4 py-3 rounded shadow-lg max-w-md">
            <div className="flex items-center justify-between">
              <span className="text-sm">{toastError}</span>
              <button
                onClick={() => setToastError(null)}
                className="ml-2 text-orange-500 hover:text-orange-700"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </DndContext>
  )
}

export default Planning
