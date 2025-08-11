import React, { useState, useEffect } from 'react'
import { X, CheckCircle, Clock, AlertTriangle, Users, Calendar, Search, Filter } from 'lucide-react'
import { User } from '../../types'
import { TimesheetService } from '../../services/timesheetService'
import { getWeekData, formatWeekRange } from '../../lib/utils'

interface ApprovalDashboardModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser?: User
  onNavigateToUser: (userId: string, weekDate: Date) => void
}

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

interface DashboardData {
  users: UserApprovalData[]
  total_pending: number
  date_range: {
    start_date: string
    end_date: string
  }
}

const ApprovalDashboardModal: React.FC<ApprovalDashboardModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onNavigateToUser
}) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserApprovalData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'drafts' | 'mixed'>('all')
  const [weeksBack, setWeeksBack] = useState(4)

  useEffect(() => {
    if (isOpen && currentUser) {
      loadDashboardData()
    }
  }, [isOpen, currentUser, weeksBack])

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
    onNavigateToUser(user.name, currentWeek)
    onClose()
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-lg font-semibold text-white">Approval Dashboard</h2>
              <p className="text-sm text-blue-100">
                {dashboardData ? `${dashboardData.total_pending} pending approvals` : 'Loading...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-140px)]">
          {/* Left Panel - User List */}
          <div className="w-1/2 border-r flex flex-col">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-medium text-gray-900 mb-3">Team Members</h3>
              
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
            <div className="flex-1 overflow-y-auto p-4">
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
                <div className="space-y-2">
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
          <div className="w-1/2 flex flex-col">
            {selectedUser ? (
              <>
                <div className="p-4 border-b bg-gray-50">
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

                <div className="flex-1 p-4">
                  <div className="space-y-4">
                    {/* Priority Info */}
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        {getPriorityIcon(selectedUser.priority)}
                        <span className="font-medium text-gray-900">Priority: {selectedUser.priority}</span>
                      </div>
                      {selectedUser.oldest_pending_date && (
                        <p className="text-sm text-gray-600">
                          Oldest pending submission from {new Date(selectedUser.oldest_pending_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{selectedUser.submitted_count}</div>
                        <div className="text-sm text-blue-800">Needs Approval</div>
                      </div>
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">{selectedUser.draft_count}</div>
                        <div className="text-sm text-yellow-800">Still Draft</div>
                      </div>
                    </div>

                    {/* Date Range Info */}
                    {dashboardData && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <Calendar className="w-4 h-4 text-gray-600" />
                          <span className="font-medium text-gray-900">Date Range</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {formatWeekRange(
                            new Date(dashboardData.date_range.start_date),
                            new Date(dashboardData.date_range.end_date)
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t bg-gray-50 space-y-2">
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
    </div>
  )
}

export default ApprovalDashboardModal
