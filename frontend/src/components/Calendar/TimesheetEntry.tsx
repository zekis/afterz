import React, { useState, useRef, useCallback } from 'react'
import { Clock, Edit, Trash2, Square, GripHorizontal } from 'lucide-react'
import { CalendarEvent } from '../../types'
import { getStatusColor, formatTime, formatDateTimeForBackend } from '../../lib/utils'
import { TimesheetService } from '../../services/timesheetService'

interface TimesheetEntryProps {
  event: CalendarEvent
  onUpdate: () => void
  slotHeight?: number
  hourHeight?: number
}

const TimesheetEntry: React.FC<TimesheetEntryProps> = ({ 
  event, 
  onUpdate, 
  slotHeight = 60,
  hourHeight = 60 
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeType, setResizeType] = useState<'top' | 'bottom' | null>(null)
  const [resizeTooltip, setResizeTooltip] = useState<{ time: string; duration: string } | null>(null)
  const entryRef = useRef<HTMLDivElement>(null)
  const startY = useRef<number>(0)
  const startHeight = useRef<number>(0)
  const startTop = useRef<number>(0)

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    // TODO: Open edit modal
    console.log('Edit timesheet entry:', event.id)
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this timesheet entry?')) {
      return
    }

    try {
      setIsLoading(true)
      await TimesheetService.deleteTimesheetEntry(event.id)
      onUpdate()
    } catch (error) {
      console.error('Failed to delete timesheet entry:', error)
      alert('Failed to delete timesheet entry. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }


  // Resize functionality
  const handleResizeStart = useCallback((e: React.MouseEvent, type: 'top' | 'bottom') => {
    e.preventDefault()
    e.stopPropagation()
    
    console.log('Resize start:', type) // Debug log
    
    if (!entryRef.current) return
    
    setIsResizing(true)
    setResizeType(type)
    startY.current = e.clientY
    
    const rect = entryRef.current.getBoundingClientRect()
    startHeight.current = rect.height
    
    // Store original times for reference
    const originalStartTime = new Date(event.start)
    const originalEndTime = event.end ? new Date(event.end) : new Date(event.start.getTime() + (event.duration || 1) * 60 * 60 * 1000)
    const originalDuration = event.duration || 1
    
    // Create the event handlers with proper closure
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!entryRef.current) return
      
      const deltaY = moveEvent.clientY - startY.current
      const minHeight = hourHeight * 0.5 // 0.5 hour minimum
      const maxHeight = hourHeight * 24 // 24 hour maximum
      
      let newHeight = startHeight.current
      let newTop = 0
      
      if (type === 'bottom') {
        // Resize from bottom - increase/decrease height
        newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight.current + deltaY))
      } else if (type === 'top') {
        // Resize from top - when dragging up (negative deltaY), increase height and move up
        const proposedHeight = startHeight.current - deltaY
        newHeight = Math.max(minHeight, Math.min(maxHeight, proposedHeight))
        
        // Calculate how much we actually changed the height (accounting for constraints)
        const actualHeightChange = newHeight - startHeight.current
        
        // Move the entry up by the amount the height increased
        newTop = -actualHeightChange
      }
      
      // Apply the changes
      entryRef.current.style.height = `${newHeight}px`
      if (type === 'top') {
        entryRef.current.style.transform = `translateY(${newTop}px)`
      }
      
      // Update duration display and tooltip
      let newDurationHours = newHeight / hourHeight
      newDurationHours = Math.round(newDurationHours * 10) / 10 // Snap to 10-minute increments
      
      // Calculate preview times for tooltip
      let previewStartTime: Date
      let previewEndTime: Date
      
      if (type === 'bottom') {
        // Bottom resize: keep start time, adjust end time
        previewStartTime = new Date(originalStartTime)
        previewEndTime = new Date(originalStartTime.getTime() + (newDurationHours * 60 * 60 * 1000))
        setResizeTooltip({
          time: `End: ${formatTime(previewEndTime)}`,
          duration: `${newDurationHours.toFixed(1)}h`
        })
      } else {
        // Top resize: adjust start time, keep end time
        const currentDeltaY = moveEvent.clientY - startY.current
        let hourOffset = currentDeltaY / hourHeight
        hourOffset = Math.round(hourOffset * 10) / 10 // Snap to 10-minute increments
        
        previewEndTime = new Date(originalEndTime)
        previewStartTime = new Date(originalStartTime.getTime() + (hourOffset * 60 * 60 * 1000))
        
        // Ensure we don't have negative duration
        if (previewStartTime >= previewEndTime) {
          previewStartTime = new Date(previewEndTime.getTime() - (0.1 * 60 * 60 * 1000))
        }
        
        setResizeTooltip({
          time: `Start: ${formatTime(previewStartTime)}`,
          duration: `${newDurationHours.toFixed(1)}h`
        })
      }
      
      console.log('Resizing to:', newDurationHours.toFixed(1), 'hours') // Debug log
    }
    
    const handleMouseUp = async (upEvent: MouseEvent) => {
      console.log('Resize end') // Debug log
      
      if (!entryRef.current) return
      
      setIsResizing(false)
      setResizeType(null)
      setResizeTooltip(null) // Clear tooltip
      
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      
      // Calculate new duration based on the final height
      const rect = entryRef.current.getBoundingClientRect()
      let newDurationHours = Math.max(0.1, Math.min(24, rect.height / hourHeight))
      
      // Snap duration to 10-minute increments (0.1 hour)
      newDurationHours = Math.round(newDurationHours * 10) / 10
      
      // Calculate new times based on resize type - use simple duration-based calculation
      let newStartTime: Date
      let newEndTime: Date
      
      if (type === 'bottom') {
        // Bottom resize: keep start time, adjust end time based on new duration
        newStartTime = new Date(originalStartTime)
        newEndTime = new Date(originalStartTime.getTime() + (newDurationHours * 60 * 60 * 1000))
      } else {
        // Top resize: adjust start time, keep end time fixed
        const totalDeltaY = upEvent.clientY - startY.current
        let hourOffset = totalDeltaY / hourHeight // Positive deltaY = dragging down = later start time
        
        // Snap hour offset to 10-minute increments
        hourOffset = Math.round(hourOffset * 10) / 10
        
        // Keep the original end time and adjust start time
        newEndTime = new Date(originalEndTime)
        newStartTime = new Date(originalStartTime.getTime() + (hourOffset * 60 * 60 * 1000))
        
        // Ensure we don't have negative duration (minimum 10 minutes)
        if (newStartTime >= newEndTime) {
          newStartTime = new Date(newEndTime.getTime() - (0.1 * 60 * 60 * 1000)) // Minimum 0.1 hour (10 minutes)
        }
      }
      
      // Check if there's actually any change before making API call
      const startTimeChanged = Math.abs(newStartTime.getTime() - originalStartTime.getTime()) > 1000 // 1 second tolerance
      const endTimeChanged = Math.abs(newEndTime.getTime() - originalEndTime.getTime()) > 1000 // 1 second tolerance
      const durationChanged = Math.abs(newDurationHours - originalDuration) > 0.01 // Small tolerance for floating point
      
      if (!startTimeChanged && !endTimeChanged && !durationChanged) {
        console.log('No significant changes detected, skipping API call')
        // Reset styles and exit
        entryRef.current.style.height = ''
        entryRef.current.style.transform = ''
        return
      }
      
      try {
        setIsLoading(true)
        
        console.log('Updating entry:', {
          id: event.id,
          originalStart: originalStartTime.toISOString(),
          originalEnd: originalEndTime.toISOString(),
          originalDuration: originalDuration,
          newStartTime: newStartTime.toISOString(),
          newEndTime: newEndTime.toISOString(),
          newDurationHours,
          startTimeChanged,
          endTimeChanged,
          durationChanged
        }) // Debug log
        
        // Update the timesheet entry with new times
        await TimesheetService.updateTimesheetEntry(event.id, {
          check_in_time: formatDateTimeForBackend(newStartTime),
          check_out_time: formatDateTimeForBackend(newEndTime),
          duration_hours: newDurationHours
        })
        
        // Reset styles
        entryRef.current.style.height = ''
        entryRef.current.style.transform = ''
        
        onUpdate()
      } catch (error) {
        console.error('Failed to update timesheet entry:', error)
        alert('Failed to update timesheet entry. Please try again.')
        
        // Reset styles on error
        if (entryRef.current) {
          entryRef.current.style.height = ''
          entryRef.current.style.transform = ''
        }
      } finally {
        setIsLoading(false)
      }
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
  }, [hourHeight, event, onUpdate])

  const isActive = event.status === 'Draft' && !event.end
  const duration = event.duration || 0
  const statusColors = getStatusColor(event.status)

  return (
    <div
      ref={entryRef}
      className={`absolute inset-0 bg-blue-100 border border-blue-300 rounded text-xs cursor-pointer hover:bg-blue-200 transition-colors shadow-sm ${statusColors} ${isLoading ? 'opacity-50' : ''} ${isResizing ? 'z-50 shadow-lg' : 'z-10'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={`${event.title} - ${event.project}`}
    >
      {/* Top resize handle */}
      {(isHovered || isResizing) && !isActive && (
        <div
          className="absolute -top-1 left-0 right-0 h-2 cursor-ns-resize flex items-center justify-center hover:bg-blue-500 hover:bg-opacity-20 group"
          onMouseDown={(e) => handleResizeStart(e, 'top')}
        >
          <GripHorizontal className="w-4 h-2 text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      <div className="flex items-start justify-between p-1">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-xs truncate">
            {event.title}
          </div>
          <div className="text-xs opacity-75 truncate">
            {event.project}
          </div>
          
          {/* Only show time details for entries longer than 1 hour to prevent crowding */}
          {duration > 1.0 && (
            <div className="flex items-center space-x-2 mt-1">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span className="text-xs">
                  {formatTime(event.start)}
                  {event.end && ` - ${formatTime(event.end)}`}
                </span>
              </div>
              
              <span className="text-xs font-medium">
                {duration.toFixed(1)}h
              </span>
            </div>
          )}
        </div>

        {/* Action buttons - show on hover */}
        {isHovered && !isLoading && !isResizing && (
          <div className="flex items-center space-x-1 ml-2">
            <button
              onClick={handleEdit}
              className="p-1 hover:bg-black hover:bg-opacity-10 rounded"
              title="Edit"
            >
              <Edit className="w-3 h-3" />
            </button>
            
            <button
              onClick={handleDelete}
              className="p-1 hover:bg-red-500 hover:bg-opacity-20 rounded"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom resize handle */}
      {(isHovered || isResizing) && !isActive && (
        <div
          className="absolute -bottom-1 left-0 right-0 h-2 cursor-ns-resize flex items-center justify-center hover:bg-blue-500 hover:bg-opacity-20 group"
          onMouseDown={(e) => handleResizeStart(e, 'bottom')}
        >
          <GripHorizontal className="w-4 h-2 text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      {/* Description tooltip on hover */}
      {event.description && isHovered && !isResizing && (
        <div className="absolute z-10 bottom-full left-0 mb-1 p-2 bg-gray-900 text-white text-xs rounded shadow-lg max-w-xs">
          {event.description}
        </div>
      )}

      {/* Resize tooltip */}
      {isResizing && resizeTooltip && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
          <div>{resizeTooltip.time}</div>
          <div className="text-gray-300">{resizeTooltip.duration}</div>
        </div>
      )}

      {/* Resize indicator */}
      {isResizing && (
        <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-1 py-0.5 rounded-bl">
          {duration.toFixed(1)}h
        </div>
      )}
    </div>
  )
}

export default TimesheetEntry
