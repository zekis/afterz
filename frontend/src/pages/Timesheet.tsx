import React, { useState, useEffect } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, DragCancelEvent } from '@dnd-kit/core'
import WeeklyCalendar from '../components/Calendar/WeeklyCalendar'
import DailyCalendar from '../components/Calendar/DailyCalendar'
import ActivityPalette from '../components/Calendar/ActivityPalette'
import ActivityAssignmentModal from '../components/Calendar/ActivityAssignmentModal'
import ManageAssignmentsModal from '../components/Calendar/ManageAssignmentsModal'
import ApprovalDashboardModal from '../components/Calendar/ApprovalDashboardModal'
import CalendarViewToggle from '../components/Controls/CalendarViewToggle'
import BulkActions from '../components/Controls/BulkActions'
import UserSwitchModal from '../components/Controls/UserSwitchModal'
import HistoryPanel from '../components/Common/HistoryPanel'
import { PageHeader, ControlsBar, ContentLayout, ActionButton } from '../components/Layout'
import { TimesheetService, ProjectService, ActivityService, UserService } from '../services/timesheetService'
import { FrappeAPI } from '../services/api'
import { TimesheetEntry, Activity, Project, User, CalendarEvent } from '../types'
import { getWeekData, formatDateTime, parseDateTime, createLocalDateTime, formatDateTimeForBackend, isTimeSlotAvailable, findOverlappingEntries, getActivityColor, formatDate } from '../lib/utils'
import { Clock, Users, UserPlus } from 'lucide-react'

const Timesheet: React.FC = () => {
  // State management
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [currentDay, setCurrentDay] = useState(new Date())
  const [calendarView, setCalendarView] = useState<'week' | 'day'>('week')
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [viewMode, setViewMode] = useState<'6am-6pm' | 'full-day'>('6am-6pm')
  const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [manageableProjects, setManageableProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toastError, setToastError] = useState<string | null>(null)
  const [draggedActivity, setDraggedActivity] = useState<Activity | null>(null)
  const [draggedEntry, setDraggedEntry] = useState<CalendarEvent | null>(null)
  // Duplication state (Shift+Drag)
  const [isShiftDown, setIsShiftDown] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  
  // Assignment modal state
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false)
  const [selectedActivityForAssignment, setSelectedActivityForAssignment] = useState<Activity | null>(null)
  const [manageAssignmentsModalOpen, setManageAssignmentsModalOpen] = useState(false)
  const [approvalDashboardModalOpen, setApprovalDashboardModalOpen] = useState(false)
  const [userSwitchModalOpen, setUserSwitchModalOpen] = useState(false)
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0)
  
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
  
  // History refresh trigger
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0)

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
          loadActivities(),
          loadManageableProjects()
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

  // Load timesheet entries and activities when week/user/day/view changes
  useEffect(() => {
    if (selectedUser) {
      loadTimesheetEntries()
      loadActivities() // Reload activities for the selected user
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

  // Load pending approval count for managers
  useEffect(() => {
    if (currentUser && projects.length > 0) {
      if (projects.some(p => p.timesheet_approver === currentUser.name)) {
        loadPendingApprovalCount()
      }
    }
  }, [currentUser, projects])

  // Track Shift key for duplication
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftDown(true)
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftDown(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Data loading functions
  const loadProjects = async () => {
    try {
      const projectData = await ProjectService.getActiveProjects()
      setProjects(projectData)
    } catch (err) {
      console.error('Failed to load projects:', err)
    }
  }

  const loadProjectsForActivities = async (activityList: Activity[]) => {
    try {
      const projectIds = [...new Set(activityList.map(a => a.project))]
      
      const projectPromises = projectIds.map(async (projectId) => {
        try {
          const response = await FrappeAPI.getDoc<Project>('Project', projectId)
          return response.message
        } catch (error) {
          console.error(`Failed to load project ${projectId}:`, error)
          return null
        }
      })
      
      const projectResults = await Promise.all(projectPromises)
      const validProjects = projectResults.filter((p): p is Project => p !== null)
      
      setProjects(prevProjects => {
        const existingIds = new Set(prevProjects.map(p => p.name))
        const newProjects = validProjects.filter(p => !existingIds.has(p.name))
        return [...prevProjects, ...newProjects]
      })
    } catch (err) {
      console.error('Failed to load projects for activities:', err)
    }
  }

  const loadManageableProjects = async () => {
    try {
      if (currentUser) {
        const manageableProjectData = await ProjectService.getManageableProjects(currentUser.name)
        setManageableProjects(manageableProjectData)
      }
    } catch (err) {
      console.error('Failed to load manageable projects:', err)
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
      if (selectedUser) {
        const activityData = await ActivityService.getUserActivities(selectedUser)
        setActivities(activityData)
        
        if (activityData.length > 0) {
          await loadProjectsForActivities(activityData)
        }
      }
    } catch (err) {
      console.error('Failed to load activities:', err)
    }
  }

  const loadTimesheetEntries = async () => {
    if (!selectedUser) return

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
      
      const entries = await TimesheetService.getTimesheetEntries(
        startDate,
        endDate,
        selectedUser
      )
      setTimesheetEntries(entries)
      
      // Load projects and activities referenced by timesheet entries
      if (entries.length > 0) {
        const projectIds = [...new Set(entries.map(e => e.project))]
        const projectPromises = projectIds.map(async (projectId) => {
          try {
            const response = await FrappeAPI.getDoc<Project>('Project', projectId)
            return response.message
          } catch (error) {
            console.error(`Failed to load project ${projectId}:`, error)
            return null
          }
        })
        
        const activityIds = [...new Set(entries.map(e => e.activity))]
        const activityPromises = activityIds.map(async (activityId) => {
          try {
            const response = await FrappeAPI.getDoc<Activity>('Activity', activityId)
            return response.message
          } catch (error) {
            console.error(`Failed to load activity ${activityId}:`, error)
            return null
          }
        })
        
        const [projectResults, activityResults] = await Promise.all([
          Promise.all(projectPromises),
          Promise.all(activityPromises)
        ])
        
        const validProjects = projectResults.filter((p): p is Project => p !== null)
        const validActivities = activityResults.filter((a): a is Activity => a !== null)
        
        setProjects(prevProjects => {
          const existingIds = new Set(prevProjects.map(p => p.name))
          const newProjects = validProjects.filter(p => !existingIds.has(p.name))
          return [...prevProjects, ...newProjects]
        })
        
        setActivities(prevActivities => {
          const existingIds = new Set(prevActivities.map(a => a.name))
          const newActivities = validActivities.filter(a => !existingIds.has(a.name))
          return [...prevActivities, ...newActivities]
        })
      }
    } catch (err) {
      console.error('Failed to load timesheet entries:', err)
      setError('Failed to load timesheet entries.')
    }
  }

  const loadPendingApprovalCount = async () => {
    try {
      const data = await TimesheetService.getApprovalDashboardData()
      setPendingApprovalCount(data.pending_count || 0)
    } catch (err) {
      console.error('Failed to load pending approval count:', err)
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
      notes: entry.notes
    }))
  }

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const activeId = event.active.id as string
    const data = event.active.data.current
    
    if (data?.type === 'timesheet-entry') {
      setIsDuplicating(!!isShiftDown)
      document.body.style.cursor = isShiftDown ? 'copy' : ''
      setDraggedEntry(data.event)
      setDraggedActivity(null)
    } else if (data?.type === 'activity') {
      setIsDuplicating(false)
      setDraggedActivity(data.activity)
      setDraggedEntry(null)
    } else {
      setIsDuplicating(false)
      const activity = activities.find(a => a.name === activeId)
      setDraggedActivity(activity || null)
      setDraggedEntry(null)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    const data = active.data.current

    setDraggedActivity(null)
    setDraggedEntry(null)
    document.body.style.cursor = ''

    if (!over || !selectedUser) return

    const slotId = over.id as string
    const slotMatch = slotId.match(/^slot-(\d+)-(\d+)$/)
    if (!slotMatch) return

    const dayIndex = parseInt(slotMatch[1])
    const hour = parseInt(slotMatch[2])

    let targetDate: Date
    if (calendarView === 'day') {
      targetDate = currentDay
    } else {
      const weekData = getWeekData(currentWeek)
      targetDate = weekData.days[dayIndex]
    }

    if (data?.type === 'timesheet-entry') {
      const entry = data.event as CalendarEvent
      const checkInTime = createLocalDateTime(targetDate, hour, 0)
      const duration = entry.duration || 1
      const checkOutTime = createLocalDateTime(targetDate, hour + duration, 0)

      if (isDuplicating) {
        const overlappingEntries = findOverlappingEntries(
          timesheetEntries,
          checkInTime,
          checkOutTime
        )

        if (overlappingEntries.length > 0) {
          setToastError('Cannot create entry: time slot overlaps with existing entries.')
          setTimeout(() => setToastError(null), 3000)
          setIsDuplicating(false)
          return
        }

        TimesheetService.createTimesheetEntry({
          employee: selectedUser,
          project: entry.project,
          activity: entry.activity,
          check_in_time: formatDateTimeForBackend(checkInTime),
          check_out_time: formatDateTimeForBackend(checkOutTime),
          duration_hours: duration,
          description: entry.description,
          notes: entry.notes,
          status: 'Draft',
        }).then(() => {
          loadTimesheetEntries()
        }).catch((error) => {
          console.error('Duplicate create failed:', error)
        }).finally(() => {
          setIsDuplicating(false)
        })

        return
      }

      const overlappingEntries = findOverlappingEntries(
        timesheetEntries,
        checkInTime,
        checkOutTime,
        entry.id
      )

      if (overlappingEntries.length > 0) {
        setToastError('Cannot move entry: time slot overlaps with existing entries.')
        setTimeout(() => setToastError(null), 3000)
        setIsDuplicating(false)
        return
      }

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

      TimesheetService.updateTimesheetEntry(entry.id, {
        check_in_time: formatDateTimeForBackend(checkInTime),
        check_out_time: formatDateTimeForBackend(checkOutTime),
        duration_hours: duration,
      })
        .then(loadTimesheetEntries)
        .catch((err) => {
          console.error('Move update failed:', err)
          setToastError('Failed to save entry. Please try again.')
          setTimeout(() => setToastError(null), 3000)
        })
        .finally(() => setIsDuplicating(false))
    } else if (data?.type === 'activity') {
      const activity = data.activity as Activity
      if (!activity) return

      const checkInTime = createLocalDateTime(targetDate, hour, 0)
      const checkOutTime = createLocalDateTime(targetDate, hour + 1, 0)

      const overlappingEntries = findOverlappingEntries(
        timesheetEntries,
        checkInTime,
        checkOutTime
      )

      if (overlappingEntries.length > 0) {
        setToastError('Cannot create entry: time slot overlaps with existing entries.')
        setTimeout(() => setToastError(null), 3000)
        return
      }

      const tempId = `temp-${Date.now()}`;
      
      setTimesheetEntries((prev) => [
        ...prev,
        {
          name: tempId,
          employee: selectedUser,
          status: 'Draft',
          project: activity.project,
          activity: activity.name,
          check_in_time: formatDateTimeForBackend(checkInTime),
          check_out_time: formatDateTimeForBackend(checkOutTime),
          duration_hours: 1,
          description: `Working on: ${activity.activity_name}`,
        },
      ])

      setTimeout(() => {
        TimesheetService.createTimesheetEntry({
          employee: selectedUser,
          project: activity.project,
          activity: activity.name,
          check_in_time: formatDateTimeForBackend(checkInTime),
          check_out_time: formatDateTimeForBackend(checkOutTime),
          duration_hours: 1,
          description: `Working on: ${activity.activity_name}`,
          status: 'Draft',
        }).then(() => {
          setTimesheetEntries((prev) => prev.filter((e) => e.name !== tempId));
          loadTimesheetEntries();
        }).catch((error) => {
          console.error('Backend create failed:', error)
          setTimesheetEntries((prev) => prev.filter((e) => e.name !== tempId));
        });
      }, 0)
    }
  }

  const handleDragCancel = (event: DragCancelEvent) => {
    setDraggedActivity(null)
    setDraggedEntry(null)
    setIsDuplicating(false)
    document.body.style.cursor = ''
  }

  // Event handlers
  const handleWeekChange = (newWeek: Date) => setCurrentWeek(newWeek)
  const handleDayChange = (newDay: Date) => setCurrentDay(newDay)
  const handleCalendarViewChange = (view: 'week' | 'day') => setCalendarView(view)
  const handleUserChange = (userId: string) => setSelectedUser(userId)
  const handleViewModeChange = (mode: '6am-6pm' | 'full-day') => setViewMode(mode)

  const handleEntryClick = (event: CalendarEvent, clickPosition: { x: number; y: number }) => {
    setSelectedEntryId(event.id)
    const activityName = activities?.find(a => a.name === event.activity)?.activity_name || event.title
    setHistoryPanel({
      isOpen: true,
      doctype: 'Timesheet Entry',
      docname: event.id,
      title: activityName
    })
  }

  const handleAssignActivity = (activity: Activity) => {
    setSelectedActivityForAssignment(activity)
    setAssignmentModalOpen(true)
  }

  const handleAssignmentComplete = () => {
    loadActivities()
    loadPendingApprovalCount()
  }

  const handleNavigateToUser = (userId: string, weekDate: Date) => {
    setSelectedUser(userId)
    setCurrentWeek(weekDate)
    setApprovalDashboardModalOpen(false)
  }

  const handleStatusChange = () => {
    setHistoryRefreshTrigger(prev => prev + 1)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-600">Loading timesheet...</p>
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
          <ActionButton 
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </ActionButton>
        </div>
      </div>
    )
  }

  return (
    <DndContext 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="h-full flex flex-col overflow-hidden">
        {/* Page Header */}
        <PageHeader
          title="Timesheet"
          description="Drag, drop, done - timesheet manager"
        />

        {/* Controls */}
        <ControlsBar
          leftControls={
            <>
              {/* Selected User Display */}
              {selectedUser && users.length > 0 && (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {users.find(u => u.name === selectedUser)?.full_name || selectedUser}
                      </div>
                      <div className="text-xs text-slate-500">Timesheet View</div>
                    </div>
                  </div>
                  
                  {/* Switch User Button - Only for approvers */}
                  {currentUser && (currentUser.name === 'Administrator' || projects.some(p => p.timesheet_approver === currentUser.name)) && (
                    <ActionButton
                      variant="secondary"
                      icon={Users}
                      onClick={() => setUserSwitchModalOpen(true)}
                    >
                      Switch User
                    </ActionButton>
                  )}
                </div>
              )}

              {/* Bulk Actions */}
              {currentUser && (
                <BulkActions
                  currentWeek={calendarView === 'week' ? currentWeek : currentDay}
                  selectedUser={selectedUser}
                  currentUser={currentUser}
                  onUpdate={loadTimesheetEntries}
                  onToastError={setToastError}
                  projects={projects}
                  activities={activities}
                />
              )}
            </>
          }
          rightActions={
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
          }
        />

        {/* Content Area */}
        <ContentLayout
          leftPanel={
            <div className="p-6">
              <ActivityPalette 
                activities={activities}
                projects={projects}
                currentUser={currentUser || undefined}
                onAssignActivity={handleAssignActivity}
              />
            </div>
          }
          mainContent={
            <div className="h-full overflow-y-auto p-6">
              {calendarView === 'week' ? (
                <WeeklyCalendar
                  currentWeek={currentWeek}
                  events={getCalendarEvents()}
                  viewMode={viewMode}
                  onEventUpdate={loadTimesheetEntries}
                  projects={projects}
                  activities={activities}
                  allEntries={timesheetEntries}
                  onToastError={setToastError}
                  onEntryClick={handleEntryClick}
                  selectedEntryId={selectedEntryId}
                  onStatusChange={handleStatusChange}
                />
              ) : (
                <DailyCalendar
                  currentDay={currentDay}
                  events={getCalendarEvents()}
                  viewMode={viewMode}
                  onEventUpdate={loadTimesheetEntries}
                  projects={projects}
                  activities={activities}
                  allEntries={timesheetEntries}
                  onToastError={setToastError}
                  onEntryClick={handleEntryClick}
                  selectedEntryId={selectedEntryId}
                  onStatusChange={handleStatusChange}
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
                refreshTrigger={historyRefreshTrigger}
              />
            ) : undefined
          }
        />

        {/* Activity Assignment Modal */}
        <ActivityAssignmentModal
          activity={selectedActivityForAssignment}
          isOpen={assignmentModalOpen}
          onClose={() => setAssignmentModalOpen(false)}
          onAssignmentComplete={handleAssignmentComplete}
        />

        {/* Manage Assignments Modal */}
        <ManageAssignmentsModal
          isOpen={manageAssignmentsModalOpen}
          onClose={() => setManageAssignmentsModalOpen(false)}
          currentUser={currentUser || undefined}
          onAssignmentComplete={handleAssignmentComplete}
        />

        {/* Approval Dashboard Modal */}
        <ApprovalDashboardModal
          isOpen={approvalDashboardModalOpen}
          onClose={() => setApprovalDashboardModalOpen(false)}
          currentUser={currentUser || undefined}
          onNavigateToUser={handleNavigateToUser}
          onJumpToEntry={(entryId, weekDate) => {
            setSelectedUser(selectedUser)
            setCurrentWeek(weekDate)
            setApprovalDashboardModalOpen(false)
            setHistoryPanel({
              isOpen: true,
              doctype: 'Timesheet Entry',
              docname: entryId,
              title: 'Timesheet Entry'
            })
          }}
        />

        {/* User Switch Modal */}
        <UserSwitchModal
          isOpen={userSwitchModalOpen}
          onClose={() => setUserSwitchModalOpen(false)}
          users={users}
          selectedUser={selectedUser}
          onUserChange={handleUserChange}
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

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedActivity && (
            <div className={`activity-item opacity-90 transform rotate-3 ${getActivityColor(draggedActivity.name).bg} ${getActivityColor(draggedActivity.name).border} ${getActivityColor(draggedActivity.name).text}`}>
              <div className="font-medium text-sm">{draggedActivity.activity_name}</div>
              <div className="text-xs text-gray-600">{draggedActivity.activity_name}</div>
            </div>
          )}
          {draggedEntry && (
            <div 
              className={`rounded text-xs cursor-pointer transition-colors shadow-lg opacity-90 transform rotate-3 ${getActivityColor(draggedEntry.activity).bg} ${getActivityColor(draggedEntry.activity).border} ${getActivityColor(draggedEntry.activity).text}`}
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

export default Timesheet
