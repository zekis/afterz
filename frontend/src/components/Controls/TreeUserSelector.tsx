import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Users, User as UserIcon } from 'lucide-react'
import { User, UserProjectPermissions } from '../../types'
import { TimesheetService, UserService } from '../../services/timesheetService'
import { getWeekData } from '../../lib/utils'

interface TreeUserSelectorProps {
  currentWeek: Date
  selectedUser: string
  onUserChange: (userId: string) => void
  currentUser: User
}

const TreeUserSelector: React.FC<TreeUserSelectorProps> = ({
  currentWeek,
  selectedUser,
  onUserChange,
  currentUser
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [permissions, setPermissions] = useState<UserProjectPermissions>({
    can_approve: false,
    projects: []
  })
  const [loading, setLoading] = useState(false)

  const loadUsers = async () => {
    try {
      setLoading(true)
      
      // Check if current user can approve
      const permissionResponse = await UserService.getUserProjectPermissions()
      setPermissions(permissionResponse)
      
      if (permissionResponse.can_approve) {
        // Load users with submission counts for approval view
        const weekData = getWeekData(currentWeek)
        const usersWithCounts = await TimesheetService.getUsersWithSubmissionCounts(
          weekData.startDate,
          weekData.endDate
        )
        setUsers(usersWithCounts)
      } else {
        // Regular user - only show themselves
        setUsers([currentUser])
      }
    } catch (error) {
      console.error('Failed to load users:', error)
      setUsers([currentUser])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [currentWeek, currentUser])

  const selectedUserData = users.find(u => u.name === selectedUser) || currentUser

  if (!permissions.can_approve) {
    // Regular user - no selector needed
    return null
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <Users className="w-4 h-4 text-gray-500" />
        <span className="truncate max-w-[150px]">
          {selectedUserData.full_name || selectedUserData.name}
        </span>
        {loading ? (
          <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full" />
        ) : (
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide px-2 py-1">
              Users with Submissions
            </div>
            
            {users.length === 0 ? (
              <div className="px-2 py-3 text-sm text-gray-500 text-center">
                No users with submissions found
              </div>
            ) : (
              <div className="space-y-1">
                {users.map(user => (
                  <button
                    key={user.name}
                    onClick={() => {
                      onUserChange(user.name)
                      setIsOpen(false)
                    }}
                    className={`w-full text-left px-2 py-2 rounded text-sm hover:bg-gray-100 flex items-center justify-between ${
                      selectedUser === user.name ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <UserIcon className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                    
                    {user.submission_count && user.submission_count > 0 && (
                      <div className="flex items-center space-x-1">
                        <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                          {user.submission_count}
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default TreeUserSelector
