import React, { useState, useEffect } from 'react'
import { X, UserPlus, Search, Folder, Users, Calendar, AlertCircle } from 'lucide-react'
import { Activity, Project, User, ActivityAssignment } from '../../types'
import { ActivityService, UserService, ProjectService } from '../../services/timesheetService'
import { getPriorityColor } from '../../lib/utils'

interface ManageAssignmentsModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser?: User
  onAssignmentComplete: () => void
}

const ManageAssignmentsModal: React.FC<ManageAssignmentsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAssignmentComplete
}) => {
  const [projects, setProjects] = useState<Project[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentAssignments, setCurrentAssignments] = useState<ActivityAssignment[]>([])

  useEffect(() => {
    if (isOpen && currentUser) {
      loadData()
      resetForm()
    }
  }, [isOpen, currentUser])

  useEffect(() => {
    if (selectedActivity) {
      loadCurrentAssignments()
    }
  }, [selectedActivity])

  const loadData = async () => {
    try {
      setLoading(true)
      const [projectData, userData, activityData] = await Promise.all([
        ProjectService.getUserProjects(currentUser?.name || ''),
        UserService.getProjectUsers(),
        ActivityService.getAssignableActivities(currentUser?.name)
      ])
      
      setProjects(projectData)
      setUsers(userData)
      setActivities(activityData)
      
      if (projectData.length > 0) {
        setSelectedProject(projectData[0].name)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadCurrentAssignments = async () => {
    if (!selectedActivity) return
    
    try {
      const assignments = await ActivityService.getActivityAssignments(selectedActivity.name)
      setCurrentAssignments(assignments)
    } catch (error) {
      console.error('Failed to load current assignments:', error)
    }
  }

  const resetForm = () => {
    setSelectedActivity(null)
    setSelectedUsers([])
    setPriority('Medium')
    setDueDate('')
    setNotes('')
    setSearchTerm('')
    setError('')
    setCurrentAssignments([])
  }

  const handleAssign = async () => {
    if (!selectedActivity || selectedUsers.length === 0) return

    setLoading(true)
    setError('')

    try {
      const result = await ActivityService.assignActivityToUsers(
        selectedActivity.name,
        selectedUsers,
        priority,
        dueDate || undefined,
        notes
      )

      if (result.success) {
        onAssignmentComplete()
        resetForm()
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
    if (!selectedActivity) return

    try {
      const result = await ActivityService.removeActivityAssignment(selectedActivity.name, user)
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

  if (!isOpen) return null

  // Filter activities by selected project and search term
  const filteredActivities = activities.filter(activity => {
    const matchesProject = !selectedProject || activity.project === selectedProject
    const matchesSearch = !searchTerm || 
      activity.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (activity.description && activity.description.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return matchesProject && matchesSearch
  })

  // Filter out already assigned users
  const assignedUserIds = currentAssignments.map(a => a.user)
  const availableUsers = users.filter(user => !assignedUserIds.includes(user.name))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center space-x-3">
            <UserPlus className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-lg font-semibold text-white">Manage Activity Assignments</h2>
              <p className="text-sm text-blue-100">Assign activities to team members</p>
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
          {/* Left Panel - Activity Selection */}
          <div className="w-1/2 border-r flex flex-col">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-medium text-gray-900 mb-3">Select Activity to Assign</h3>
              
              {/* Project Filter */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Projects</option>
                  {projects.map(project => (
                    <option key={project.name} value={project.name}>
                      {project.project_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Activity List */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading activities...</div>
              ) : filteredActivities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Folder className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No activities found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredActivities.map(activity => {
                    const project = projects.find(p => p.name === activity.project)
                    const isSelected = selectedActivity?.name === activity.name
                    
                    return (
                      <div
                        key={activity.name}
                        onClick={() => setSelectedActivity(activity)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {activity.subject}
                        </div>
                        <div className="text-xs text-gray-600 truncate">
                          {project?.project_name || activity.project}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getPriorityColor(activity.priority)}`}>
                            {activity.priority}
                          </span>
                          {activity.estimated_hours && (
                            <span className="text-xs text-gray-500">
                              {activity.estimated_hours}h
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Assignment Details */}
          <div className="w-1/2 flex flex-col">
            {selectedActivity ? (
              <>
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="font-medium text-gray-900 mb-1">Assign: {selectedActivity.subject}</h3>
                  <p className="text-sm text-gray-600">
                    {projects.find(p => p.name === selectedActivity.project)?.project_name}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {/* Current Assignments */}
                  {currentAssignments.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Current Assignments</h4>
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
                        <div className="max-h-80 overflow-y-auto border border-gray-300 rounded-lg">
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

                {/* Assignment Actions */}
                {availableUsers.length > 0 && (
                  <div className="p-4 border-t bg-gray-50">
                    <button
                      onClick={handleAssign}
                      disabled={loading || selectedUsers.length === 0}
                      className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Assigning...' : `Assign to ${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''}`}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">Select an activity to manage assignments</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ManageAssignmentsModal
