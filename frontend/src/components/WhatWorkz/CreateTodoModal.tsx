import React, { useState, useEffect } from 'react'
import { X, Plus, User, Tag, AlertCircle } from 'lucide-react'
import { TodoLite, Project, User as UserType } from '../../types'
import { ProjectService, UserService } from '../../services/timesheetService'

interface CreateTodoModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateTodo: (todoData: Partial<TodoLite>) => Promise<void>
}

const CreateTodoModal: React.FC<CreateTodoModalProps> = ({
  isOpen,
  onClose,
  onCreateTodo
}) => {
  const [formData, setFormData] = useState({
    subject: '',
    project: '',
    allocated_to: '',
    priority: 'Medium' as 'High' | 'Medium' | 'Low',
    description: ''
  })
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load projects and users when modal opens
  useEffect(() => {
    if (isOpen) {
      loadData()
      // Reset form
      setFormData({
        subject: '',
        project: '',
        allocated_to: '',
        priority: 'Medium',
        description: ''
      })
      setError(null)
    }
  }, [isOpen])

  const loadData = async () => {
    try {
      const [projectsData, usersData] = await Promise.all([
        ProjectService.getActiveProjects(),
        UserService.getProjectUsers()
      ])
      setProjects(projectsData)
      setUsers(usersData)
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Failed to load projects and users')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.subject.trim()) {
      setError('Subject is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await onCreateTodo({
        subject: formData.subject.trim(),
        project: formData.project || undefined,
        allocated_to: formData.allocated_to || undefined,
        priority: formData.priority,
        description: formData.description.trim() || undefined
      })
      onClose()
    } catch (err) {
      console.error('Create todo failed:', err)
      setError('Failed to create todo. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError(null) // Clear error when user starts typing
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Plus className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">
                  Create New Todo
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Subject */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  placeholder="What needs to be done?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  autoFocus
                />
              </div>

              {/* Priority */}
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              {/* Project */}
              <div>
                <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-1">
                  Project
                </label>
                <select
                  id="project"
                  value={formData.project}
                  onChange={(e) => handleInputChange('project', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">No Project</option>
                  {projects.map(project => (
                    <option key={project.name} value={project.name}>
                      {project.project_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assign To */}
              <div>
                <label htmlFor="allocated_to" className="block text-sm font-medium text-gray-700 mb-1">
                  Assign To
                </label>
                <select
                  id="allocated_to"
                  value={formData.allocated_to}
                  onChange={(e) => handleInputChange('allocated_to', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Unassigned</option>
                  {users.map(user => (
                    <option key={user.name} value={user.name}>
                      {user.full_name} ({user.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Additional details (optional)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                />
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading || !formData.subject.trim()}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Create Todo</span>
                </div>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateTodoModal
