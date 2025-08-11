import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Clock, FileText, Calendar as CalendarIcon, Folder, Activity as ActivityIcon } from 'lucide-react'
import { CalendarEvent, Project, Activity } from '../../types'
import { formatTime, formatDateTimeForBackend, parseDateTime } from '../../lib/utils'
import { TimesheetService } from '../../services/timesheetService'

interface EditTimesheetModalProps {
  event: CalendarEvent | null
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
  projects: Project[]
  activities: Activity[]
  readOnly?: boolean
}

const EditTimesheetModal: React.FC<EditTimesheetModalProps> = ({
  event,
  isOpen,
  onClose,
  onUpdate,
  projects,
  activities,
  readOnly
}) => {
  const isReadOnly = !!readOnly
  const [formData, setFormData] = useState({
    project: '',
    activity: '',
    description: '',
    notes: '',
    startTime: '',
    endTime: '',
    duration: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle keyboard events for modal behavior
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
      // Prevent other keyboard interactions from reaching background
      e.stopPropagation()
    }

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown, true)
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  // Initialize form data when event changes
  useEffect(() => {
    if (event) {
      const startTime = event.start ? formatTime(event.start) : '';
      const endTime = event.end ? formatTime(event.end) : '';
      
      setFormData({
        project: event.project || '',
        activity: event.activity || '',
        description: event.description || '',
        notes: event.notes || '',
        startTime,
        endTime,
        duration: event.duration || 0
      });
    }
  }, [event]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Auto-calculate duration when times change
    if (field === 'startTime' || field === 'endTime') {
      const updatedData = { ...formData, [field]: value }
      if (updatedData.startTime && updatedData.endTime) {
        const start = new Date(`2000-01-01 ${updatedData.startTime}`)
        const end = new Date(`2000-01-01 ${updatedData.endTime}`)
        const durationMs = end.getTime() - start.getTime()
        const durationHours = durationMs / (1000 * 60 * 60)
        
        if (durationHours > 0) {
          setFormData(prev => ({
            ...prev,
            duration: Math.round(durationHours * 10) / 10 // Round to 0.1 hours
          }))
        }
      }
    }
  }

  const handleSave = async () => {
    if (!event) return

    try {
      setIsLoading(true)
      setError(null)

      // Create new datetime objects based on the original date but new times
      const originalDate = new Date(event.start)
      const [startHour, startMinute] = formData.startTime.split(':').map(Number)
      const [endHour, endMinute] = formData.endTime.split(':').map(Number)

      const newStartTime = new Date(originalDate)
      newStartTime.setHours(startHour, startMinute, 0, 0)

      const newEndTime = new Date(originalDate)
      newEndTime.setHours(endHour, endMinute, 0, 0)

      // Handle next day scenarios
      if (newEndTime <= newStartTime) {
        newEndTime.setDate(newEndTime.getDate() + 1)
      }

      // Update the timesheet entry
      await TimesheetService.updateTimesheetEntry(event.id, {
        project: formData.project,
        activity: formData.activity,
        check_in_time: formatDateTimeForBackend(newStartTime),
        check_out_time: formatDateTimeForBackend(newEndTime),
        duration_hours: formData.duration,
        description: formData.description,
        notes: formData.notes
      })

      onUpdate()
      onClose()
    } catch (err) {
      console.error('Failed to update timesheet entry:', err)
      setError('Failed to update timesheet entry. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen || !event) return null

  const modalContent = (
    <div 
      className="edit-modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      onClick={(e) => {
        // Close modal when clicking backdrop
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      onMouseDown={(e) => {
        // Block all mouse events from reaching background
        e.stopPropagation()
      }}
      onMouseUp={(e) => {
        e.stopPropagation()
      }}
      onMouseMove={(e) => {
        e.stopPropagation()
      }}
      onWheel={(e) => {
        e.stopPropagation()
      }}
      style={{
        // Ensure modal captures all pointer events
        pointerEvents: 'all',
        zIndex: 9999
      }}
    >
      <div 
        className="edit-modal-content bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => {
          // Prevent clicks inside modal from closing it
          e.stopPropagation()
        }}
        style={{
          zIndex: 10000
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {isReadOnly ? 'View Timesheet Entry' : 'Edit Timesheet Entry'}
            <span className="ml-2 text-base font-normal text-gray-500">
              {event.start
                ? event.start.toLocaleDateString(undefined, { day: 'numeric', month: 'numeric', year: 'numeric' })
                : ''}
            </span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          

          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Folder className="w-4 h-4 inline mr-1" />
              Project
            </label>
            <select
              value={formData.project}
              onChange={(e) => handleInputChange('project', e.target.value)}
              disabled={isReadOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a project...</option>
              {projects.map(project => (
                <option key={project.name} value={project.name}>
                  {project.project_name}
                </option>
              ))}
            </select>
          </div>

          {/* Activity Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <ActivityIcon className="w-4 h-4 inline mr-1" />
              Activity
            </label>
            <select
              value={formData.activity}
              onChange={(e) => handleInputChange('activity', e.target.value)}
              disabled={isReadOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select an activity...</option>
              {activities
                .filter(activity => !formData.project || activity.project === formData.project)
                .map(activity => (
                  <option key={activity.name} value={activity.name}>
                    {activity.subject}
                  </option>
                ))}
            </select>
          </div>

          {/* Time Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="w-4 h-4 inline mr-1" />
                Start Time
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => handleInputChange('startTime', e.target.value)}
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="w-4 h-4 inline mr-1" />
                End Time
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => handleInputChange('endTime', e.target.value)}
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Duration Display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
              {formData.duration.toFixed(1)} hours
            </div>
          </div>

          {/* Work Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="w-4 h-4 inline mr-1" />
              Work Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe what you worked on..."
              rows={3}
              readOnly={isReadOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Any additional notes or comments..."
              rows={2}
              readOnly={isReadOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50 rounded-b-lg">
          {isReadOnly ? (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Close
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default EditTimesheetModal
