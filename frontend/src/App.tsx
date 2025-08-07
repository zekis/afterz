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
      duration: entry.duration_hours
    }))
  }

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const activityId = event.active.id as string
    const activity = activities.find(a => a.name === activityId)
    setDraggedActivity(activity || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    // Clear dragged activity immediately to prevent return animation
    setDraggedActivity(null)

    if (!over || !selectedUser) {
      return
    }

    const activityId = active.id as string
    const slotId = over.id as string
    
    // Parse slot ID to get day and hour
    const slotMatch = slotId.match(/^slot-(\d+)-(\d+)$/)
    if (!slotMatch) return

    const dayIndex = parseInt(slotMatch[1])
    const hour = parseInt(slotMatch[2])

    const activity = activities.find(a => a.name === activityId)
    if (!activity) return

    try {
      // Calculate the date and time for the drop
      const weekData = getWeekData(currentWeek)
      const targetDate = weekData.days[dayIndex]
      
      // Create local time using createLocalDateTime to ensure proper timezone handling
      const checkInTime = createLocalDateTime(targetDate, hour, 0)
      const checkOutTime = createLocalDateTime(targetDate, hour + 1, 0)

      console.log('Creating entry:', {
        targetDate: targetDate.toDateString(),
        hour,
        checkInTime: checkInTime.toString(),
        checkInTimeUTC: checkInTime.toISOString(),
        checkOutTime: checkOutTime.toString(),
        checkOutTimeUTC: checkOutTime.toISOString()
      })

      // Create timesheet entry - send local time strings directly
      await TimesheetService.createTimesheetEntry({
        employee: selectedUser,
        date: targetDate,
        project: activity.project,
        activity: activity.name,
        check_in_time: formatDateTimeForBackend(checkInTime), // Send local time directly
        check_out_time: formatDateTimeForBackend(checkOutTime), // Send local time directly
        duration_hours: 1,
        description: `Working on: ${activity.subject}`,
        status: 'Draft'
      })

      // Reload timesheet entries
      await loadTimesheetEntries()
      
      // Clear dragged activity after successful drop
      setDraggedActivity(null)
    } catch (err) {
      console.error('Failed to create timesheet entry:', err)
      setError('Failed to create timesheet entry.')
      
      // Clear dragged activity even on error
      setDraggedActivity(null)
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
        </DragOverlay>
      </div>
    </DndContext>
  )
}

export default App
