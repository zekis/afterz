import React, { useEffect, useState } from 'react'
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core'
import PlannerWeeklyCalendar from './components/Planner/PlannerWeeklyCalendar'
import PlannerDailyCalendar from './components/Planner/PlannerDailyCalendar'
import ToDoPalette from './components/Planner/ToDoPalette'
import WeekSelector from './components/Controls/WeekSelector'
import ViewToggle from './components/Controls/ViewToggle'
import CalendarViewToggle from './components/Controls/CalendarViewToggle'
import NavigationDropdown from './components/Controls/NavigationDropdown'
import HistoryPanel from './components/Common/HistoryPanel'
import { PlannerService } from './services/plannerService'
import { ProjectService, UserService } from './services/timesheetService'
import { TodoService } from './services/todoService'
import { PlannerEntry, TodoLite, Project, User } from './types'
import { getWeekData, parseDateTime, createLocalDateTime, formatDateTimeForBackend } from './lib/utils'
import { Calendar, Clock } from 'lucide-react'

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

function BeforezApp() {
  // State
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [currentDay, setCurrentDay] = useState(new Date())
  const [calendarView, setCalendarView] = useState<'week' | 'day'>('week')
  const [viewMode, setViewMode] = useState<'6am-6pm' | 'full-day'>('6am-6pm')
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

  // Sync currentDay with currentWeek when switching views (but not when currentWeek changes due to day navigation)
  useEffect(() => {
    if (calendarView === 'day') {
      // Only sync when switching to day view, not when currentWeek changes
      const week = getWeekData(currentWeek)
      // Only update if currentDay is not already within this week
      const dayWeek = getWeekData(currentDay)
      if (dayWeek.startDate.getTime() !== week.startDate.getTime()) {
        setCurrentDay(week.startDate)
      }
    }
  }, [calendarView]) // Remove currentWeek dependency to prevent conflicts

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
      // For administrators, if they're viewing their own account, show all todos
      // For non-administrators or when viewing specific users, show user-specific todos
      const userParam = (currentUser?.name === 'Administrator' && selectedUser === 'Administrator') 
        ? undefined  // undefined means show all todos for administrators
        : selectedUser
      
      const list = await PlannerService.getUserTodos(userParam)
      console.log('Loaded todos:', list)
      console.log('Users list:', users)
      setTodos(list)
    } catch (e) {
      console.error('Failed to load todos', e)
    }
  }

  const loadPlannerEntries = async () => {
    try {
      let startDate: Date, endDate: Date
      
      if (calendarView === 'day') {
        // For daily view, load the week containing the current day
        const week = getWeekData(currentDay)
        startDate = week.startDate
        endDate = week.endDate
      } else {
        // For weekly view, use current week
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
    
    // Clear drag state
    setDraggedTodo(null)
    setDraggedEntry(null)
    
    if (!over || !selectedUser) return

    const slotId = String(over.id || '')
    const match = slotId.match(/^slot-(\d+)-(\d+)$/)
    if (!match) return

    const dayIndex = parseInt(match[1], 10)
    const hour = parseInt(match[2], 10)

    // For daily view, use currentDay; for weekly view, use the specific day from the week
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

      // Create a 1-hour planned entry from the drop (hour is the actual hour)
      const start = createLocalDateTime(targetDate, hour, 0)
      const end = createLocalDateTime(targetDate, hour + 1, 0)

      // Check if the project exists in our projects list, if not set to undefined
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

      // Move the entry by setting new start/end keeping duration (hour is the actual hour)
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
  const handleDayChange = (newDay: Date) => {
    setCurrentDay(newDay)
    // Don't update currentWeek to avoid conflicts with useEffect
  }
  const handleCalendarViewChange = (view: 'week' | 'day') => setCalendarView(view)
  const handleViewModeChange = (mode: '6am-6pm' | 'full-day') => setViewMode(mode)
  const handleUserChange = (userId: string) => setSelectedUser(userId)

  const handleEntryClick = (event: PlannerCalendarEvent, clickPosition: { x: number; y: number }) => {
    setSelectedEntryId(event.id)
    setHistoryPanel({
      isOpen: true,
      doctype: 'Planner Entry',
      docname: event.id,
      title: event.title
    })
  }

  const handleCreateTodo = async (subject: string) => {
    try {
      const result = await TodoService.createTodo(subject, undefined, selectedUser)
      if (result.success) {
        // Reload todos to show the new one
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

  const handleAssignTodo = async (todoName: string, newUser: string) => {
    try {
      const result = await TodoService.assignTodo(todoName, newUser)
      if (result.success) {
        // Reload todos to show the updated assignment
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
        // Reload todos to remove the completed one
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
        // Reload todos to remove the cancelled one
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading Before-Workz Planner...</p>
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
            onClick={() => window.location.reload()}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-gradient-to-r from-indigo-600 to-indigo-700 shadow-lg">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">Before-Workz</h1>
                    <span className="text-xs text-indigo-100">Plan first, execute better</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {currentUser && (
                  <NavigationDropdown 
                    currentUser={currentUser || undefined}
                    users={users}
                    selectedUser={selectedUser}
                    onUserChange={handleUserChange}
                  />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="w-full px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-64px)] flex flex-col">
          {/* Calendar View Controls */}
          <div className="mb-6 flex justify-end flex-shrink-0">
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

          {/* Main Layout - Two columns: Left (Palette + Calendar) | Right (History Panel) */}
          <div className="flex gap-6 flex-1 min-h-0">
            {/* Left Column - Palette and Calendar */}
            <div className="flex gap-6 flex-1 min-h-0">
              {/* ToDo Palette */}
              <div className="w-80 flex-shrink-0 min-h-0">
                <div className="h-full overflow-y-auto overflow-x-hidden light-scrollbar">
                  <ToDoPalette 
                    todos={todos} 
                    projects={projects} 
                    currentUser={currentUser || undefined}
                    users={users}
                    onCreateTodo={handleCreateTodo}
                    onAssignTodo={handleAssignTodo}
                    onCompleteTodo={handleCompleteTodo}
                    onCancelTodo={handleCancelTodo}
                  />
                </div>
              </div>

              {/* Planner Calendar */}
              <div className="flex-1 min-h-0">
                <div className="h-full overflow-y-auto light-scrollbar">
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
                      selectedEntryId={selectedEntryId}
                    />
                  )}
                </div>
              </div>
            </div>
          
            {/* Right Column - History Panel */}
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
        </main>

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

export default BeforezApp
