import React, { useState, useEffect } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, DragCancelEvent } from '@dnd-kit/core'
import WeeklyCalendar from './components/Calendar/WeeklyCalendar'
import ActivityPalette from './components/Calendar/ActivityPalette'
import WeekSelector from './components/Controls/WeekSelector'
import UserSelector from './components/Controls/UserSelector'
import ViewToggle from './components/Controls/ViewToggle'
import { TimesheetService, ProjectService, ActivityService, UserService } from './services/timesheetService'
import { TimesheetEntry, Activity, Project, User, CalendarEvent } from './types'
import { getWeekData, formatDateTime, parseDateTime, createLocalDateTime, formatDateTimeForBackend } from './lib/utils'
import { Calendar, Clock, Users } from 'lucide-react'

function App() {
  // State management
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [viewMode, setViewMode] = useState<'6am-6pm' | 'full-day'>('6am-6pm')
  const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draggedActivity, setDraggedActivity] = useState<Activity | null>(null)
  const [draggedEntry, setDraggedEntry] = useState<CalendarEvent | null>(null)

  // Get current user
  const currentUser = UserService.getCurrentUser()

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true)
        
        // Set current user as selected by default
        if (currentUser) {
          setSelectedUser(currentUser.name)
        }

        // Load initial data
        await Promise.all([
          loadProjects(),
          loadUsers(),
          loadActivities()
        ])

        setError(null)
      } catch (err) {
        console.error('Failed to initialize data:', err)
        setError('Failed to load initial data. Please refresh the page.')
      } finally {
        setLoading(false)
      }
    }

    initializeData()
  }, [])

  // Load timesheet entries when week or user changes
  useEffect(() => {
    if (selectedUser) {
      loadTimesheetEntries()
    }
  }, [currentWeek, selectedUser])

  // Data loading functions
  const loadProjects = async () => {
    try {
      const projectData = await ProjectService.getActiveProjects()
      setProjects(projectData)
    } catch (err) {
      console.error('Failed to load projects:', err)
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

  const loadActivities = async () => {
    try {
      const activityData = await ActivityService.getActiveActivities()
      setActivities(activityData)
    } catch (err) {
      console.error('Failed to load activities:', err)
    }
  }

  const loadTimesheetEntries = async () => {
    if (!selectedUser) return

    try {
      const weekData = getWeekData(currentWeek)
      const entries = await TimesheetService.getTimesheetEntries(
        weekData.startDate,
        weekData.endDate,
        selectedUser
      )
      setTimesheetEntries(entries)
    } catch (err) {
      console.error('Failed to load timesheet entries:', err)
      setError('Failed to load timesheet entries.')
    }
  }

  // Convert timesheet entries to calendar events
  const getCalendarEvents = (): CalendarEvent[] => {
    return timesheetEntries.map(entry => ({
      id: entry.name || '',
      title: entry.activity,
      start: parseDateTime(entry.check_in_time),
      end: entry.check_out_time ? parseDateTime(entry.check_out_time) : undefined,
      project: entry.project,
      activity: entry.activity,
      status: entry.status,
      description: entry.description,
      duration: entry.duration_hours,
      notes: entry.notes // <-- include notes in event object
    }))
  }

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const activeId = event.active.id as string
    const data = event.active.data.current
    
    if (data?.type === 'timesheet-entry') {
      // Dragging a timesheet entry
      setDraggedEntry(data.event)
      setDraggedActivity(null)
    } else if (data?.type === 'activity') {
      // Dragging an activity - use the activity from drag data
      setDraggedActivity(data.activity)
      setDraggedEntry(null)
    } else {
      // Fallback for activities without proper data type
      const activity = activities.find(a => a.name === activeId)
      setDraggedActivity(activity || null)
      setDraggedEntry(null)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    const data = active.data.current

    console.log('DragEnd - Active:', active.id, 'Data:', data, 'Over:', over?.id)

    // Clear dragged items immediately to prevent return animation
    setDraggedActivity(null)
    setDraggedEntry(null)

    if (!over || !selectedUser) {
      console.log('DragEnd - Early return: no over or selectedUser')
      return
    }

    const slotId = over.id as string

    // Parse slot ID to get day and hour
    const slotMatch = slotId.match(/^slot-(\d+)-(\d+)$/)
    if (!slotMatch) {
      console.log('DragEnd - No slot match for:', slotId)
      return
    }

    const dayIndex = parseInt(slotMatch[1])
    const hour = parseInt(slotMatch[2])

    const weekData = getWeekData(currentWeek)
    const targetDate = weekData.days[dayIndex]

    if (data?.type === 'timesheet-entry') {
      console.log('DragEnd - Moving existing entry')
      // Moving an existing timesheet entry
      const entry = data.event as CalendarEvent

      // Calculate new times based on drop position
      const checkInTime = createLocalDateTime(targetDate, hour, 0)
      const duration = entry.duration || 1
      const checkOutTime = createLocalDateTime(targetDate, hour + duration, 0)

      // Optimistically update UI
      setTimesheetEntries((prev) =>
        prev.map((e) =>
          e.name === entry.id
            ? {
                ...e,
                check_in_time: formatDateTimeForBackend(checkInTime),
                check_out_time: formatDateTimeForBackend(checkOutTime),
                duration_hours: duration,
              }
            : e
        )
      )

      // Sync with backend
      TimesheetService.updateTimesheetEntry(entry.id, {
        check_in_time: formatDateTimeForBackend(checkInTime),
        check_out_time: formatDateTimeForBackend(checkOutTime),
        duration_hours: duration,
      }).then(loadTimesheetEntries)
    } else if (data?.type === 'activity') {
      console.log('DragEnd - Creating new entry from activity:', data.activity)
      // Creating new entry from activity
      const activity = data.activity as Activity
      if (!activity) {
        console.log('DragEnd - No activity found')
        return
      }

      // Create local time using createLocalDateTime to ensure proper timezone handling
      const checkInTime = createLocalDateTime(targetDate, hour, 0)
      const checkOutTime = createLocalDateTime(targetDate, hour + 1, 0)

      // Immediately add the entry to prevent return animation
      const tempId = `temp-${Date.now()}`;
      console.log('DragEnd - Adding temp entry:', tempId)
      
      // Use synchronous state update to ensure immediate UI change
      setTimesheetEntries((prev) => [
        ...prev,
        {
          name: tempId,
          employee: selectedUser,
          date: targetDate.toISOString().slice(0, 10),
          status: 'Draft',
          project: activity.project,
          activity: activity.name,
          check_in_time: formatDateTimeForBackend(checkInTime),
          check_out_time: formatDateTimeForBackend(checkOutTime),
          duration_hours: 1,
          description: `Working on: ${activity.subject}`,
        },
      ])

      // Handle backend sync asynchronously without affecting the drop success
      setTimeout(() => {
        TimesheetService.createTimesheetEntry({
          employee: selectedUser,
          date: targetDate,
          project: activity.project,
          activity: activity.name,
          check_in_time: formatDateTimeForBackend(checkInTime),
          check_out_time: formatDateTimeForBackend(checkOutTime),
          duration_hours: 1,
          description: `Working on: ${activity.subject}`,
          status: 'Draft',
        }).then(() => {
          console.log('DragEnd - Backend create successful, removing temp entry')
          setTimesheetEntries((prev) => prev.filter((e) => e.name !== tempId));
          loadTimesheetEntries();
        }).catch((error) => {
          console.error('DragEnd - Backend create failed:', error)
          setTimesheetEntries((prev) => prev.filter((e) => e.name !== tempId));
        });
      }, 0)
    } else {
      console.log('DragEnd - Unknown data type or no data type:', data)
    }
  }

  // Event handlers
  const handleWeekChange = (newWeek: Date) => {
    setCurrentWeek(newWeek)
  }

  const handleUserChange = (userId: string) => {
    setSelectedUser(userId)
  }

  const handleViewModeChange = (mode: '6am-6pm' | 'full-day') => {
    setViewMode(mode)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading Afterz Timesheet...</p>
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
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }

  return (
    <DndContext 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
      dropAnimation={null}
    >
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <Calendar className="w-8 h-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">Afterz</h1>
                <span className="text-sm text-gray-500">Timesheet Manager</span>
              </div>
              
              <div className="flex items-center space-x-4">
                <ViewToggle 
                  viewMode={viewMode} 
                  onViewModeChange={handleViewModeChange} 
                />
                
                {/* Show user selector only for managers */}
                {currentUser && (
                  <UserSelector
                    users={users}
                    selectedUser={selectedUser}
                    onUserChange={handleUserChange}
                    currentUser={currentUser}
                  />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
          {/* Week Selector */}
          <div className="mb-6">
            <WeekSelector 
              currentWeek={currentWeek}
              onWeekChange={handleWeekChange}
            />
          </div>

          {/* Calendar and Activity Palette */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
            {/* Activity Palette */}
            <div className="lg:col-span-1 h-full">
              <ActivityPalette 
                activities={activities}
                projects={projects}
              />
            </div>

            {/* Calendar */}
            <div className="lg:col-span-3 h-full">
              <WeeklyCalendar
                currentWeek={currentWeek}
                events={getCalendarEvents()}
                viewMode={viewMode}
                onEventUpdate={loadTimesheetEntries}
                projects={projects}
                activities={activities}
              />
            </div>
          </div>
        </main>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedActivity && (
            <div className="activity-item opacity-90 transform rotate-3">
              <div className="font-medium text-sm">{draggedActivity.subject}</div>
              <div className="text-xs text-gray-600">{draggedActivity.project}</div>
            </div>
          )}
          {draggedEntry && (
            <div 
              className="bg-blue-100 border border-blue-300 rounded text-xs cursor-pointer hover:bg-blue-200 transition-colors shadow-lg opacity-90 transform rotate-3"
              style={{
                width: '200px',
                height: `${(draggedEntry.duration || 1) * 60}px`,
                minHeight: '60px'
              }}
            >
              <div className="flex items-start justify-between p-1 h-full">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-xs truncate">
                    {draggedEntry.title}
                  </div>
                  <div className="text-xs opacity-75 truncate">
                    {draggedEntry.project}
                  </div>
                  
                  {/* Only show time details for entries longer than 1 hour to prevent crowding */}
                  {(draggedEntry.duration || 0) > 1.0 && (
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex items-center space-x-1">
                        <span className="text-xs">
                          {draggedEntry.duration?.toFixed(1)}h
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  )
}

export default App
