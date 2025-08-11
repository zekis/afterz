import React, { useState, useEffect } from 'react'
import { X, UserPlus, Calendar, AlertCircle } from 'lucide-react'
import { Activity, User, ActivityAssignment } from '../../types'
import { ActivityService, UserService } from '../../services/timesheetService'

interface ActivityAssignmentModalProps {
  activity: Activity | null
  isOpen: boolean
  onClose: () => void
  onAssignmentComplete: () => void
}

const ActivityAssignmentModal: React.FC<ActivityAssignmentModalProps> = ({
  activity,
  isOpen,
  onClose,
  onAssignmentComplete
}) => {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentAssignments, setCurrentAssignments] = useState<ActivityAssignment[]>([])

  useEffect(() => {
    if (isOpen && activity) {
      loadUsers()
      loadCurrentAssignments()
      // Reset form
      setSelectedUsers([])
      setPriority('Medium')
      setDueDate('')
      setNotes('')
      setError('')
    }
  }, [isOpen, activity])

  const loadUsers = async () => {
    try {
      const userList = await UserService.getProjectUsers()
      setUsers(userList)
    } catch (error) {
      console.error('Failed to load users:', error)
      setError('Failed to load users')
    }
  }

  const loadCurrentAssignments = async () => {
    if (!activity) return
    
    try {
      const assignments = await ActivityService.getActivityAssignments(activity.name)
      setCurrentAssignments(assignments)
    } catch (error) {
      console.error('Failed to load current assignments:', error)
    }
  }

  const handleAssign = async () => {
    if (!activity || selectedUsers.length === 0) return

    setLoading(true)
    setError('')

    try {
      const result = await ActivityService.assignActivityToUsers(
        activity.name,
        selectedUsers,
        priority,
        dueDate || undefined,
        notes
      )

      if (result.success) {
        onAssignmentComplete()
        onClose()
      } else {
        setError(result.error || 'Failed to assign activity')
      }
    } catch (error) {
      console.error('Assignment failed:', error)
      setError('Failed to assign activity. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveAssignment = async (user: string) => {
    if (!activity) return

    try {
      const result = await ActivityService.removeActivityAssignment(activity.name, user)
      if (result.success) {
        loadCurrentAssignments()
      } else {
        setError(result.error || 'Failed to remove assignment')
      }
    } catch (error) {
      console.error('Failed to remove assignment:', error)
      setError('Failed to remove assignment')
    }
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  if (!isOpen || !activity) return null

  // Filter out already assigned users
  const assignedUserIds = currentAssignments.map(a => a.user)
  const availableUsers = users.filter(user => !assignedUserIds.includes(user.name))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <UserPlus className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Assign Activity</h2>
              <p className="text-sm text-gray-600">{activity.activity_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Current Assignments */}
          {currentAssignments.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Current Assignments</h3>
              <div className="space-y-2">
                {currentAssignments.map(assignment => (
                  <div key={assignment.user} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {assignment.full_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{assignment.full_name}</div>
                        <div className="text-xs text-gray-500">
                          Priority: {assignment.priority}
                          {assignment.due_date && ` • Due: ${new Date(assignment.due_date).toLocaleDateString()}`}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveAssignment(assignment.user)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assignment Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Users to Assign
              </label>
              {availableUsers.length === 0 ? (
                <p className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
                  All available users are already assigned to this activity.
                </p>
              ) : (
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg">
                  {availableUsers.map(user => (
                    <label
                      key={user.name}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.name)}
                        onChange={() => toggleUserSelection(user.name)}
                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {user.full_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {availableUsers.length > 0 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as 'Low' | 'Medium' | 'High')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assignment Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Add any additional notes or instructions..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </>
            )}

            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          {availableUsers.length > 0 && (
            <button
              onClick={handleAssign}
              disabled={loading || selectedUsers.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Assigning...' : `Assign to ${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ActivityAssignmentModal
