import React, { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useDraggable } from '@dnd-kit/core'
import { Clock, Edit, Trash2, Square, GripHorizontal, Move, Send, CheckCircle, XCircle, Check, FileText } from 'lucide-react'
import { CalendarEvent } from '../../types'
import { getStatusColor, getStatusDisplayText, formatTime, formatDateTimeForBackend, findOverlappingEntries, getActivityColor } from '../../lib/utils'
import { TimesheetService } from '../../services/timesheetService'
import { HistoryService } from '../../services/historyService'
import EditTimesheetModal from './EditTimesheetModal'
import ContextMenu from '../Common/ContextMenu'
import ConfirmationDialog from '../Common/ConfirmationDialog'

interface TimesheetEntryProps {
  event: CalendarEvent
  onUpdate: () => void
  slotHeight?: number
  hourHeight?: number
  projects?: any[]
  activities?: any[]
  allEntries?: any[]
  onToastError?: (message: string) => void
  onEntryClick?: (event: CalendarEvent, position: { x: number; y: number }) => void
  isSelected?: boolean
  onStatusChange?: () => void // Add callback for status changes
}

const TimesheetEntry: React.FC<TimesheetEntryProps> = ({ 
  event, 
  onUpdate, 
  slotHeight = 60,
  hourHeight = 60,
  projects = [],
  activities = [],
  allEntries = [],
  onToastError,
  onEntryClick,
  isSelected = false,
  onStatusChange
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeType, setResizeType] = useState<'top' | 'bottom' | null>(null)
  const [resizeTooltip, setResizeTooltip] = useState<{ time: string; duration: string } | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; position: { x: number; y: number } }>({
    isOpen: false,
    position: { x: 0, y: 0 }
  })
  // Confirmation dialog state
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean
    type: 'submit' | 'approve' | 'reject' | 'unapprove' | 'delete'
    title: string
    message: string
    requiresInput?: boolean
    inputLabel?: string
    inputPlaceholder?: string
  }>({
    isOpen: false,
    type: 'submit',
    title: '',
    message: ''
  })
  // Hover + modifier for header cursor feedback (copy vs move)
  const [isHeaderHovered, setIsHeaderHovered] = useState(false)
  const [isShiftDown, setIsShiftDown] = useState(false)
  const entryRef = useRef<HTMLDivElement>(null)
  const startY = useRef<number>(0)
  const startHeight = useRef<number>(0)
  const startTop = useRef<number>(0)

  // Draggable functionality - only enable for draft entries
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `entry-${event.id}`,
    data: {
      type: 'timesheet-entry',
      event: event
    },
    disabled: event.status !== 'Draft'
  })

  const handleEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (event.status === 'Draft') {
      setIsEditModalOpen(true)
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onEntryClick) {
      onEntryClick(event, { x: e.clientX, y: e.clientY })
    }
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsEditModalOpen(true)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY }
    })
  }

  // Dialog handlers
  const showSubmitDialog = () => {
    const activityName = activities?.find(a => a.name === event.activity)?.activity_name || event.title
    const projectName = projects?.find(p => p.name === event.project)?.project_name || event.project
    
    setConfirmationDialog({
      isOpen: true,
      type: 'submit',
      title: 'Submit Entry',
      message: `Are you sure you want to submit this timesheet entry for approval?\n\nEntry: ${activityName}\nProject: ${projectName}\nDuration: ${(event.duration || 0).toFixed(1)} hours`
    })
  }

  const showApproveDialog = () => {
    const activityName = activities?.find(a => a.name === event.activity)?.activity_name || event.title
    const projectName = projects?.find(p => p.name === event.project)?.project_name || event.project
    
    setConfirmationDialog({
      isOpen: true,
      type: 'approve',
      title: 'Approve Entry',
      message: `Are you sure you want to approve this timesheet entry?\n\nEntry: ${activityName}\nProject: ${projectName}\nDuration: ${(event.duration || 0).toFixed(1)} hours`
    })
  }

  const showRejectDialog = () => {
    const activityName = activities?.find(a => a.name === event.activity)?.activity_name || event.title
    const projectName = projects?.find(p => p.name === event.project)?.project_name || event.project
    
    setConfirmationDialog({
      isOpen: true,
      type: 'reject',
      title: 'Reject Entry',
      message: `Please provide a reason for rejecting this timesheet entry:\n\nEntry: ${activityName}\nProject: ${projectName}\nDuration: ${(event.duration || 0).toFixed(1)} hours`,
      requiresInput: true,
      inputLabel: 'Rejection Reason',
      inputPlaceholder: 'Please explain why this entry is being rejected...'
    })
  }

  const showUnapproveDialog = () => {
    const activityName = activities?.find(a => a.name === event.activity)?.activity_name || event.title
    const projectName = projects?.find(p => p.name === event.project)?.project_name || event.project
    
    setConfirmationDialog({
      isOpen: true,
      type: 'unapprove',
      title: 'Un-approve Entry',
      message: `Are you sure you want to un-approve this entry and revert it to draft status?\n\nEntry: ${activityName}\nProject: ${projectName}\nDuration: ${(event.duration || 0).toFixed(1)} hours`
    })
  }

  const showDeleteDialog = () => {
    const activityName = activities?.find(a => a.name === event.activity)?.activity_name || event.title
    const projectName = projects?.find(p => p.name === event.project)?.project_name || event.project
    
    setConfirmationDialog({
      isOpen: true,
      type: 'delete',
      title: 'Delete Entry',
      message: `Are you sure you want to permanently delete this timesheet entry?\n\nEntry: ${activityName}\nProject: ${projectName}\nDuration: ${(event.duration || 0).toFixed(1)} hours\n\nThis action cannot be undone.`
    })
  }

  const handleConfirmAction = async (data?: string) => {
    try {
      setIsLoading(true)
      
      switch (confirmationDialog.type) {
        case 'submit':
          await TimesheetService.updateTimesheetEntry(event.id, { status: 'Submitted' })
          break
        case 'approve':
          await TimesheetService.updateTimesheetEntry(event.id, { 
            status: 'Approved',
            approved_by: window.frappe_boot?.user.name || '',
            approval_date: formatDateTimeForBackend(new Date())
          })
          break
        case 'reject':
          if (data) {
            await TimesheetService.rejectEntryWithReason(event.id, data)
            await HistoryService.addComment('Timesheet Entry', event.id, `Entry rejected: ${data}`)
          }
          break
        case 'unapprove':
          await TimesheetService.unapproveEntry(event.id)
          break
        case 'delete':
          await TimesheetService.deleteTimesheetEntry(event.id)
          break
      }
      
      onUpdate()
      onStatusChange?.() // Trigger history refresh
    } catch (error) {
      console.error(`Failed to ${confirmationDialog.type} entry:`, error)
      if (onToastError) {
        onToastError(`Failed to ${confirmationDialog.type} entry. Please try again.`)
      }
      throw error // Re-throw to let dialog handle loading state
    } finally {
      setIsLoading(false)
    }
  }

  // Track Shift key globally to update cursor while hovering header (before drag starts)
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftDown(true)
    }
    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftDown(false)
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])

  // When hovering the draggable header, reflect Shift with copy cursor; otherwise move/default
  useEffect(() => {
    if (isHeaderHovered) {
      document.body.style.cursor = isShiftDown && (event.status === 'Draft') ? 'copy' : (event.status === 'Draft' ? 'move' : 'default')
    }
    // Cleanup on unmount to avoid stuck cursors (mouseleave also resets)
    return () => {}
  }, [isHeaderHovered, isShiftDown, event.status])

  // Get context menu items based on entry status and user permissions
  const getContextMenuItems = () => {
    const items = []

    // View details for non-draft entries
    if (event.status !== 'Draft') {
      items.push({
        label: 'View Details',
        onClick: () => setIsEditModalOpen(true),
        icon: <FileText className="w-4 h-4" />
      })
    }

    // Always show edit for draft entries
    if (event.status === 'Draft') {
      items.push({
        label: 'Edit Entry',
        onClick: () => handleEdit(),
        icon: <Edit className="w-4 h-4" />
      })

      items.push({
        label: 'Submit Entry',
        onClick: showSubmitDialog,
        icon: <Send className="w-4 h-4" />
      })

      items.push({
        label: 'Delete Entry',
        onClick: showDeleteDialog,
        icon: <Trash2 className="w-4 h-4" />,
        className: 'text-red-600 hover:bg-red-50'
      })
    }

    // Show approval options for submitted entries (if user has permissions)
    if (event.status === 'Submitted') {
      items.push({
        label: 'Approve Entry',
        onClick: showApproveDialog,
        icon: <CheckCircle className="w-4 h-4" />,
        className: 'text-green-600 hover:bg-green-50'
      })

      items.push({
        label: 'Reject Entry',
        onClick: showRejectDialog,
        icon: <XCircle className="w-4 h-4" />,
        className: 'text-red-600 hover:bg-red-50'
      })
    }

    // Show un-approve option for approved entries (if user has permissions)
    if (event.status === 'Approved') {
      items.push({
        label: 'Un-approve Entry',
        onClick: showUnapproveDialog,
        icon: <XCircle className="w-4 h-4" />,
        className: 'text-orange-600 hover:bg-orange-50'
      })
    }

    return items
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

  // Resize functionality - only for draft entries
  const handleResizeStart = useCallback((e: React.MouseEvent, type: 'top' | 'bottom') => {
    if (event.status !== 'Draft') return
    
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

      // Check for overlaps with other entries (excluding the current entry)
      const overlappingEntries = findOverlappingEntries(
        allEntries,
        newStartTime,
        newEndTime,
        event.id
      )

      if (overlappingEntries.length > 0) {
        console.log('Resize blocked: overlapping entries found', overlappingEntries)
        if (onToastError) {
          onToastError('Cannot resize entry: would overlap with existing entries.')
        }
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
  const activityColors = getActivityColor(event.activity)
  
  // Get status-based styling
  const getStatusStyling = () => {
    if (event.status === 'Draft') {
      // Use activity colors for draft entries
      return {
        bg: activityColors.bg,
        border: activityColors.border,
        text: activityColors.text,
        leftBorder: activityColors.leftBorder,
        leftBorderThick: activityColors.leftBorderThick,
        opacity: ''
      }
    } else {
      // Use grey styling for all non-draft entries with left border
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-300',
        text: 'text-gray-700',
        leftBorder: 'border-l-gray-400',
        leftBorderThick: 'border-l-4',
        header: 'bg-gray-100',
        opacity: 'opacity-90'
      }
    }
  }
  
  const statusStyling = getStatusStyling()
  const isEditable = event.status === 'Draft'

  return (
    <div
      ref={entryRef}
      className={`absolute inset-0 ${statusStyling.bg} border ${isSelected ? 'border-2 border-blue-500' : statusStyling.border} ${statusStyling.leftBorder} ${statusStyling.leftBorderThick} rounded text-xs ${isEditable ? 'cursor-pointer hover:opacity-90' : 'cursor-default'} transition-opacity shadow-sm ${statusStyling.text} ${statusStyling.opacity} ${isLoading ? 'opacity-50' : ''} ${isResizing ? 'z-40 shadow-lg' : 'z-10'} ${isSelected ? 'shadow-lg' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      title={`${event.title} - ${event.project} (${event.status}) ${isEditable ? '(Click for history, Double-click to edit, right-click for options)' : '(Click for history, Double-click to view, right-click for options)'}`}
    >
      {/* Top resize handle - only for draft entries */}
      {(isHovered || isResizing) && !isActive && isEditable && (
        <div
          className="absolute -top-1 left-0 right-0 h-2 cursor-ns-resize flex items-center justify-center hover:bg-blue-500 hover:bg-opacity-20 group"
          onMouseDown={(e) => handleResizeStart(e, 'top')}
        >
          <GripHorizontal className="w-4 h-2 text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      {/* Entry header (draggable area) */}
      <div
        ref={setNodeRef}
        {...(isEditable ? listeners : {})}
        {...(isEditable ? attributes : {})}
        className={`px-1 py-0.5 ${statusStyling.header} rounded-t ${isEditable ? 'cursor-move' : 'cursor-default'} select-none relative`}
        title={isEditable ? "Drag to move entry" : ""}
        onMouseEnter={() => {
          setIsHeaderHovered(true)
          document.body.style.cursor = isShiftDown && isEditable ? 'copy' : (isEditable ? 'move' : 'default')
        }}
        onMouseLeave={() => {
          setIsHeaderHovered(false)
          document.body.style.cursor = ''
        }}
      >
        <div className="font-semibold text-xs truncate">
          {activities?.find(a => a.name === event.activity)?.activity_name || event.title}
        </div>
        <div className={`text-xs ${statusStyling.text} truncate`}>
          {projects?.find(p => p.name === event.project)?.project_name || event.project}
        </div>
        
        {/* Status Badge */}
        {event.status !== 'Draft' && (
          <div className="absolute top-0.5 right-0.5">
            {event.status === 'Submitted' && (
              <div className="bg-blue-500 text-white p-1 rounded-full" title="Submitted">
                <Send className="w-3 h-3" />
              </div>
            )}
            {event.status === 'Approved' && (
              <div className="bg-green-500 text-white p-1 rounded-full" title="Approved">
                <Check className="w-3 h-3" />
              </div>
            )}
            {event.status === 'Processed' && (
              <div className="bg-purple-500 text-white px-1.5 py-0.5 rounded-full text-xs font-bold" title="Processed">
                $
              </div>
            )}
            {event.status === 'Rejected' && (
              <div className="bg-red-500 text-white p-1 rounded-full" title="Rejected">
                <XCircle className="w-3 h-3" />
              </div>
            )}
            {event.status === 'Scheduled' && (
              <div className="bg-yellow-500 text-white p-1 rounded-full" title="Scheduled">
                <Clock className="w-3 h-3" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Only show time details for entries longer than 1 hour to prevent crowding */}
      {duration > 1.0 && (
        <div className="flex items-center space-x-2 mt-1 px-1">
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


      {/* Bottom resize handle - only for draft entries */}
      {(isHovered || isResizing) && !isActive && isEditable && (
        <div
          className="absolute -bottom-1 left-0 right-0 h-2 cursor-ns-resize flex items-center justify-center hover:bg-blue-500 hover:bg-opacity-20 group"
          onMouseDown={(e) => handleResizeStart(e, 'bottom')}
        >
          <GripHorizontal className="w-4 h-2 text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      {/* Description tooltip on hover - rendered as portal */}
      {event.description && isHovered && !isResizing && !isEditModalOpen && entryRef.current && createPortal(
        <div
          className="timesheet-tooltip"
          style={{
            position: 'fixed',
            zIndex: 10001,
            left: entryRef.current.getBoundingClientRect().left,
            top: entryRef.current.getBoundingClientRect().top - 40,
            pointerEvents: 'none',
            background: '#111827',
            color: '#fff',
            fontSize: '12px',
            borderRadius: '0.375rem',
            boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)',
            padding: '8px',
            maxWidth: '320px',
            whiteSpace: 'pre-line'
          }}
        >
          {event.description}
        </div>,
        document.body
      )}

      {/* Resize tooltip - rendered as portal */}
      {isResizing && resizeTooltip && entryRef.current && createPortal(
        <div 
          className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap"
          style={{
            position: 'fixed',
            zIndex: 10001,
            left: entryRef.current.getBoundingClientRect().left + (entryRef.current.getBoundingClientRect().width / 2),
            top: entryRef.current.getBoundingClientRect().top - 32,
            transform: 'translateX(-50%)',
            pointerEvents: 'none'
          }}
        >
          <div>{resizeTooltip.time}</div>
          <div className="text-gray-300">{resizeTooltip.duration}</div>
        </div>,
        document.body
      )}

      {/* Resize indicator */}
      {isResizing && (
        <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-1 py-0.5 rounded-bl">
          {duration.toFixed(1)}h
        </div>
      )}

      {/* Edit/View Modal */}
      <EditTimesheetModal
        event={event}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={onUpdate}
        projects={projects}
        activities={activities}
        readOnly={event.status !== 'Draft'}
      />

      {/* Context Menu */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        items={getContextMenuItems()}
        onClose={() => setContextMenu({ isOpen: false, position: { x: 0, y: 0 } })}
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmationDialog.isOpen}
        onClose={() => setConfirmationDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmAction}
        title={confirmationDialog.title}
        message={confirmationDialog.message}
        type={confirmationDialog.type}
        requiresInput={confirmationDialog.requiresInput}
        inputLabel={confirmationDialog.inputLabel}
        inputPlaceholder={confirmationDialog.inputPlaceholder}
      />
    </div>
  )
}

export default TimesheetEntry
