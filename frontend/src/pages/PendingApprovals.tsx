import React, { useState, useEffect } from 'react'
import { CheckCircle, Clock, AlertTriangle, Users, Calendar, Search, FileText } from 'lucide-react'
import { PageHeader } from '../components/Layout'
import { User } from '../types'
import { TimesheetService, UserService } from '../services/timesheetService'
import { getWeekData, formatWeekRange } from '../lib/utils'

interface UserApprovalData {
  name: string
  full_name: string
  email: string
  submitted_count: number
  draft_count: number
  approved_count: number
  priority: 'High' | 'Medium' | 'Low'
  latest_submission_date?: string
  oldest_pending_date?: string
}

interface PendingApprovalEntry {
  name: string
  employee: string
  employee_name: string
  date: string
  project: string
  activity: string
  check_in_time: string
  check_out_time: string
  duration_hours: number
  status: string
  description?: string
  week_start: string
  week_end: string
}

interface DashboardData {
  users: UserApprovalData[]
  total_pending: number
  date_range: {
    start_date: string
    end_date: string
  }
}

const PendingApprovals: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserApprovalData | null>(null)
  const [pendingEntries, setPendingEntries] = useState<PendingApprovalEntry[]>([])
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'drafts' | 'mixed'>('all')
  const [weeksBack, setWeeksBack] = useState(4)

  useEffect(() => {
    const user = UserService.getCurrentUser()
    setCurrentUser(user)
    if (user) {
      loadDashboardData()
    }
  }, [weeksBack])

  useEffect(() => {
    if (selectedUser) {
      loadPendingEntries()
    } else {
      setPendingEntries([])
    }
  }, [selectedUser])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await TimesheetService.getDetailedApprovalDashboard(weeksBack)
      setDashboardData(data)
    } catch (error) {
      console.error('Failed to load approval dashboard:', error)
      setError('Failed to load approval data')
    } finally {
      setLoading(false)
    }
  }

  const loadPendingEntries = async () => {
    if (!selectedUser) return
    
    try {
      setLoadingEntries(true)
      const entries = await TimesheetService.getUserPendingApprovals(selectedUser.name)
      setPendingEntries(entries)
    } catch (error) {
      console.error('Failed to load pending entries:', error)
      setPendingEntries([])
    } finally {
      setLoadingEntries(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'High':
        return <AlertTriangle className="w-4 h-4" />
      case 'Medium':
        return <Clock className="w-4 h-4" />
      case 'Low':
        return <CheckCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getStatusBadge = (user: UserApprovalData) => {
    if (user.submitted_count > 0 && user.draft_count > 0) {
      return (
        <div className="flex items-center space-x-1">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
            {user.submitted_count} submitted
          </span>
          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
            {user.draft_count} draft
          </span>
        </div>
      )
    } else if (user.submitted_count > 0) {
      return (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
          {user.submitted_count} submitted
        </span>
      )
    } else if (user.draft_count > 0) {
      return (
        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
          {user.draft_count} draft only
        </span>
      )
    } else if (user.approved_count > 0) {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
          All approved
        </span>
      )
    } else {
      return (
        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
          No entries
        </span>
      )
    }
  }

  const filteredUsers = dashboardData?.users.filter(user => {
    // Search filter
    const matchesSearch = !searchTerm || 
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())

    // Status filter
    let matchesStatus = true
    switch (statusFilter) {
      case 'submitted':
        matchesStatus = user.submitted_count > 0
        break
      case 'drafts':
        matchesStatus = user.draft_count > 0 && user.submitted_count === 0
        break
      case 'mixed':
        matchesStatus = user.submitted_count > 0 && user.draft_count > 0
        break
      case 'all':
      default:
        matchesStatus = true
        break
    }

    return matchesSearch && matchesStatus
  }) || []

  const handleUserSelect = (user: UserApprovalData) => {
    setSelectedUser(user)
  }

  const handleNavigateToUser = (user: UserApprovalData) => {
    // Navigate to current week for the selected user
    const currentWeek = new Date()
    console.log('Navigate to user:', user.name, 'week:', currentWeek)
    // This would typically use React Router navigation to go to timesheet
  }

  const handleApproveAllForUser = async (user: UserApprovalData) => {
    if (!user.submitted_count) return

    const confirmed = confirm(
      `Approve ${user.submitted_count} submitted ${user.submitted_count === 1 ? 'entry' : 'entries'} for ${user.full_name}?\n\n` +
      `This will approve all submitted timesheet entries for the current week. ` +
      `Draft entries will be excluded and remain unchanged.`
    )
    
    if (!confirmed) return

    try {
      setLoading(true)
      const currentWeek = new Date()
      const weekData = getWeekData(currentWeek)
      
      await TimesheetService.approveAllEntries(
        user.name,
        weekData.startDate,
        weekData.endDate
      )
      
      // Reload dashboard data
      await loadDashboardData()
      setSelectedUser(null)
    } catch (error) {
      console.error('Failed to approve entries:', error)
      setError('Failed to approve entries')
    } finally {
      setLoading(false)
    }
  }

  const groupEntriesByWeek = (entries: PendingApprovalEntry[]) => {
    const groups: { [key: string]: PendingApprovalEntry[] } = {}
    
    entries.forEach(entry => {
      const weekKey = `${entry.week_start}_${entry.week_end}`
      if (!groups[weekKey]) {
        groups[weekKey] = []
      }
      groups[weekKey].push(entry)
    })

    return Object.entries(groups).map(([weekKey, entries]) => ({
      weekStart: new Date(entries[0].week_start),
      weekEnd: new Date(entries[0].week_end),
      entries: entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    })).sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime()) // Most recent first
  }

  const handleJumpToWeek = (weekGroup: { weekStart: Date; weekEnd: Date; entries: PendingApprovalEntry[] }) => {
    if (selectedUser) {
      // Navigate to the week for the selected user
      console.log('Navigate to user:', selectedUser.name, 'week:', weekGroup.weekStart)
      // This would typically use React Router navigation
    }
  }

  if (loading && !dashboardData) {
    return (
      <div className="h-full flex flex-col">
        <PageHeader
          title="Pending Approvals"
          description="Review and approve timesheet entries from your team"
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading approvals...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <PageHeader
        title="Approval Dashboard"
        description={`💡 Shows users from projects where you are timesheet approver. ${dashboardData ? `${dashboardData.total_pending} pending approvals` : 'Loading...'}`}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - User List */}
        <div className="w-1/2 border-r flex flex-col bg-white">
          <div className="p-6 border-b bg-gray-50">
            <h3 className="font-medium text-gray-900 mb-4">Team Members</h3>
            
            {/* Filters */}
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Filters Row */}
              <div className="flex space-x-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="submitted">Has Submitted</option>
                  <option value="drafts">Drafts Only</option>
                  <option value="mixed">Mixed Status</option>
                </select>

                <select
                  value={weeksBack}
                  onChange={(e) => setWeeksBack(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={1}>Last 1 week</option>
                  <option value={2}>Last 2 weeks</option>
                  <option value={4}>Last 4 weeks</option>
                  <option value={8}>Last 8 weeks</option>
                </select>
              </div>
            </div>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading users...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">{error}</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No users found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map(user => {
                  const isSelected = selectedUser?.name === user.name
                  
                  return (
                    <div
                      key={user.name}
                      onClick={() => handleUserSelect(user)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {user.full_name.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-sm text-gray-900 truncate">
                                {user.full_name}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {user.email}
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-2">
                            {getStatusBadge(user)}
                          </div>
                        </div>

                        <div className="flex flex-col items-end space-y-1 ml-2">
                          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full border text-xs font-medium ${getPriorityColor(user.priority)}`}>
                            {getPriorityIcon(user.priority)}
                            <span>{user.priority}</span>
                          </div>
                          
                          {user.oldest_pending_date && (
                            <div className="text-xs text-gray-500">
                              Since {new Date(user.oldest_pending_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - User Details & Actions */}
        <div className="w-1/2 flex flex-col bg-white">
          {selectedUser ? (
            <>
              <div className="p-6 border-b bg-gray-50">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-medium text-blue-600">
                      {selectedUser.full_name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{selectedUser.full_name}</h3>
                    <p className="text-sm text-gray-600">{selectedUser.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <span className="font-medium text-blue-600">{selectedUser.submitted_count}</span>
                    <span className="text-gray-600">submitted</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="font-medium text-yellow-600">{selectedUser.draft_count}</span>
                    <span className="text-gray-600">draft</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="font-medium text-green-600">{selectedUser.approved_count}</span>
                    <span className="text-gray-600">approved</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loadingEntries ? (
                  <div className="flex items-center justify-center py-8">
                    <Clock className="w-6 h-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-600">Loading entries...</span>
                  </div>
                ) : pendingEntries.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No pending entries found</p>
                    <p className="text-xs text-gray-400 mt-1">All timesheets are up to date!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Quick Stats Header */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{selectedUser.submitted_count}</div>
                        <div className="text-sm text-blue-800">Needs Approval</div>
                      </div>
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">{selectedUser.draft_count}</div>
                        <div className="text-sm text-yellow-800">Still Draft</div>
                      </div>
                    </div>

                    {/* Pending Entries by Week */}
                    {groupEntriesByWeek(pendingEntries).map((weekGroup, weekIndex) => (
                      <div 
                        key={weekIndex} 
                        onClick={() => handleJumpToWeek(weekGroup)}
                        className="border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        {/* Week Header */}
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-gray-600" />
                              <span className="font-medium text-gray-900">
                                {formatWeekRange(weekGroup.weekStart, weekGroup.weekEnd)}
                              </span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                {weekGroup.entries.length} {weekGroup.entries.length === 1 ? 'entry' : 'entries'}
                              </span>
                            </div>
                            <div className="text-xs text-blue-600 font-medium">
                              Click to view week →
                            </div>
                          </div>
                        </div>

                        {/* Week Summary */}
                        <div className="p-4">
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div className="text-center">
                              <div className="text-lg font-bold text-blue-600">
                                {weekGroup.entries.reduce((sum, entry) => sum + entry.duration_hours, 0).toFixed(1)}h
                              </div>
                              <div className="text-xs text-gray-600">Total Hours</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-green-600">
                                {new Set(weekGroup.entries.map(e => e.project)).size}
                              </div>
                              <div className="text-xs text-gray-600">Projects</div>
                            </div>
                          </div>

                          {/* Days with entries */}
                          <div className="flex flex-wrap gap-1">
                            {Array.from(new Set(weekGroup.entries.map(entry => {
                              const date = new Date(entry.date)
                              return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
                            }))).map((day, dayIndex) => (
                              <span 
                                key={dayIndex}
                                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                              >
                                {day}
                              </span>
                            ))}
                          </div>

                          {/* Top projects */}
                          <div className="mt-3">
                            <div className="text-xs text-gray-600 mb-1">Projects:</div>
                            <div className="flex flex-wrap gap-1">
                              {Array.from(new Set(weekGroup.entries.map(e => e.project))).slice(0, 3).map((project, projIndex) => (
                                <span 
                                  key={projIndex}
                                  className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full truncate max-w-32"
                                  title={project}
                                >
                                  {project}
                                </span>
                              ))}
                              {new Set(weekGroup.entries.map(e => e.project)).size > 3 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                  +{new Set(weekGroup.entries.map(e => e.project)).size - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-6 border-t bg-gray-50 space-y-2">
                <button
                  onClick={() => handleNavigateToUser(selectedUser)}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  View {selectedUser.full_name}'s Timesheet
                </button>
                
                {selectedUser.submitted_count > 0 && (
                  <button
                    onClick={() => handleApproveAllForUser(selectedUser)}
                    disabled={loading}
                    className="w-full px-4 py-2 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Approving...' : `Approve ${selectedUser.submitted_count} Submitted Entries`}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">Select a user to view details and actions</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PendingApprovals
