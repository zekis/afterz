import React, { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useDraggable } from '@dnd-kit/core'
import { Clock, CheckCircle, XCircle, Trash2, GripHorizontal, RotateCcw } from 'lucide-react'
import { PlannerEntry as PlannerEntryType } from '../../types'
import { PlannerService } from '../../services/plannerService'
import { formatTime, formatDateTimeForBackend, findOverlappingEntries, getActivityColor } from '../../lib/utils'
import ContextMenu from '../Common/ContextMenu'

export interface PlannerCalendarEvent {
  id: string
  title: string
  start: Date
  end?: Date
  project?: string
  status: 'Planned' | 'In Progress' | 'Completed' | 'Cancelled'
  duration?: number
  notes?: string
}

interface PlannerEntryProps {
  event: PlannerCalendarEvent
  onUpdate: () => void
  hourHeight?: number
  allEntries?: any[]
  onToastError?: (message: string) => void
  onEntryClick?: (event: PlannerCalendarEvent, position: { x: number; y: number }) => void
  isSelected?: boolean
}

const PlannerEntry: React.FC<PlannerEntryProps> = ({
  event,
  onUpdate,
  hourHeight = 60,
  allEntries = [],
  onToastError,
  onEntryClick,
  isSelected = false
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeType, setResizeType] = useState<'top' | 'bottom' | null>(null)
  const [resizeTooltip, setResizeTooltip] = useState<{ time: string; duration: string } | null>(null)
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; position: { x: number; y: number } }>({
    isOpen: false,
    position: { x: 0, y: 0 }
  })

  const entryRef = useRef<HTMLDivElement>(null)
  const startY = useRef<number>(0)
  const startHeight = useRef<number>(0)
  const startTop = useRef<number>(0)

  const isEditable = event.status === 'Planned'
  const duration = event.duration || (event.end ? Math.max(0.1, (event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60)) : 1)

  // Color based on title to be consistent
  const activityColors = getActivityColor(event.title || 'planner')

  // Draggable only for Planned entries
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `planner-${event.id}`,
    data: {
      type: 'planner-entry',
      event: event
    },
    disabled: !isEditable
  })

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onEntryClick) {
      onEntryClick(event, { x: e.clientX, y: e.clientY })
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY }
    })
  }

  const handleComplete = async () => {
    try {
      setIsLoading(true)
      await PlannerService.completeEntry(event.id)
      onUpdate()
    } catch (err) {
      console.error('Complete failed', err)
      onToastError?.('Failed to complete entry.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    try {
      setIsLoading(true)
      await PlannerService.cancelEntry(event.id)
      onUpdate()
    } catch (err) {
      console.error('Cancel failed', err)
      onToastError?.('Failed to cancel entry.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this planner entry?')) return
    try {
      setIsLoading(true)
      await PlannerService.deletePlannerEntry(event.id)
      onUpdate()
    } catch (err) {
      console.error('Delete failed', err)
      onToastError?.('Failed to delete entry.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReopen = async () => {
    try {
      setIsLoading(true)
      // Reopen by setting status back to 'Planned'
      await PlannerService.updatePlannerEntry(event.id, { status: 'Planned' })
      onUpdate()
    } catch (err) {
      console.error('Reopen failed', err)
      onToastError?.('Failed to reopen entry.')
    } finally {
      setIsLoading(false)
    }
  }

  const getContextMenuItems = () => {
    const items: any[] = []
    if (event.status === 'Planned' || event.status === 'In Progress') {
      items.push({
        label: 'Complete',
        onClick: handleComplete,
        icon: <CheckCircle className="w-4 h-4" />,
        className: 'text-green-600 hover:bg-green-50'
      })
      items.push({
        label: 'Cancel',
        onClick: handleCancel,
        icon: <XCircle className="w-4 h-4" />,
        className: 'text-red-600 hover:bg-red-50'
      })
      items.push({
        label: 'Delete',
        onClick: handleDelete,
        icon: <Trash2 className="w-4 h-4" />,
        className: 'text-red-600 hover:bg-red-50'
      })
    } else {
      // Completed / Cancelled -> reopen and delete allowed
      items.push({
        label: 'Reopen',
        onClick: handleReopen,
        icon: <RotateCcw className="w-4 h-4" />,
        className: 'text-blue-600 hover:bg-blue-50'
      })
      items.push({
        label: 'Delete',
        onClick: handleDelete,
        icon: <Trash2 className="w-4 h-4" />,
        className: 'text-red-600 hover:bg-red-50'
      })
    }
    return items
  }

  // Resize similar to TimesheetEntry but using plan_start/plan_end
  const handleResizeStart = useCallback((e: React.MouseEvent, type: 'top' | 'bottom') => {
    if (!isEditable) return

    e.preventDefault()
    e.stopPropagation()

    if (!entryRef.current) return

    setIsResizing(true)
    setResizeType(type)
    startY.current = e.clientY

    const rect = entryRef.current.getBoundingClientRect()
    startHeight.current = rect.height

    const originalStartTime = new Date(event.start)
    const originalEndTime = event.end ? new Date(event.end) : new Date(event.start.getTime() + duration * 60 * 60 * 1000)
    const originalDuration = duration

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!entryRef.current) return

      const deltaY = moveEvent.clientY - startY.current
      const minHeight = hourHeight * 0.5
      const maxHeight = hourHeight * 24

      let newHeight = startHeight.current
      let newTop = 0

      if (type === 'bottom') {
        newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight.current + deltaY))
      } else {
        const proposedHeight = startHeight.current - deltaY
        newHeight = Math.max(minHeight, Math.min(maxHeight, proposedHeight))
        const actualHeightChange = newHeight - startHeight.current
        newTop = -actualHeightChange
      }

      entryRef.current.style.height = `${newHeight}px`
      if (type === 'top') {
        entryRef.current.style.transform = `translateY(${newTop}px)`
      }

      let newDurationHours = newHeight / hourHeight
      newDurationHours = Math.round(newDurationHours * 10) / 10

      let previewStartTime: Date
      let previewEndTime: Date

      if (type === 'bottom') {
        previewStartTime = new Date(originalStartTime)
        previewEndTime = new Date(originalStartTime.getTime() + (newDurationHours * 60 * 60 * 1000))
        setResizeTooltip({
          time: `End: ${formatTime(previewEndTime)}`,
          duration: `${newDurationHours.toFixed(1)}h`
        })
      } else {
        const currentDeltaY = moveEvent.clientY - startY.current
        let hourOffset = currentDeltaY / hourHeight
        hourOffset = Math.round(hourOffset * 10) / 10

        previewEndTime = new Date(originalEndTime)
        previewStartTime = new Date(originalStartTime.getTime() + (hourOffset * 60 * 60 * 1000))

        if (previewStartTime >= previewEndTime) {
          previewStartTime = new Date(previewEndTime.getTime() - (0.1 * 60 * 60 * 1000))
        }

        setResizeTooltip({
          time: `Start: ${formatTime(previewStartTime)}`,
          duration: `${newDurationHours.toFixed(1)}h`
        })
      }
    }

    const handleMouseUp = async (upEvent: MouseEvent) => {
      if (!entryRef.current) return

      setIsResizing(false)
      setResizeType(null)
      setResizeTooltip(null)

      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''

      const rect = entryRef.current.getBoundingClientRect()
      let newDurationHours = Math.max(0.1, Math.min(24, rect.height / hourHeight))
      newDurationHours = Math.round(newDurationHours * 10) / 10

      let newStartTime: Date
      let newEndTime: Date

      if (type === 'bottom') {
        newStartTime = new Date(event.start)
        newEndTime = new Date(newStartTime.getTime() + (newDurationHours * 60 * 60 * 1000))
      } else {
        const totalDeltaY = upEvent.clientY - startY.current
        let hourOffset = Math.round((totalDeltaY / hourHeight) * 10) / 10
        newEndTime = event.end ? new Date(event.end) : new Date(event.start.getTime() + (originalDuration * 60 * 60 * 1000))
        newStartTime = new Date(event.start.getTime() + (hourOffset * 60 * 60 * 1000))
        if (newStartTime >= newEndTime) {
          newStartTime = new Date(newEndTime.getTime() - (0.1 * 60 * 60 * 1000))
        }
      }

      // Overlap check (excluding self)
      const overlappingEntries = findOverlappingEntries(
        allEntries,
        newStartTime,
        newEndTime,
        event.id
      )

      if (overlappingEntries.length > 0) {
        onToastError?.('Cannot resize entry: would overlap with existing entries.')
        entryRef.current.style.height = ''
        entryRef.current.style.transform = ''
        return
      }

      try {
        setIsLoading(true)
        await PlannerService.updatePlannerEntry(event.id, {
          plan_start: formatDateTimeForBackend(newStartTime),
          plan_end: formatDateTimeForBackend(newEndTime)
        })
        entryRef.current.style.height = ''
        entryRef.current.style.transform = ''
        onUpdate()
      } catch (err) {
        console.error('Resize update failed', err)
        onToastError?.('Failed to update entry.')
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
  }, [event, hourHeight, isEditable, onUpdate, allEntries, onToastError, duration])

  // Styling
  const statusStyling = (() => {
    switch (event.status) {
      case 'Planned':
        return {
          bg: activityColors.bg,
          border: activityColors.border,
          text: activityColors.text,
          header: activityColors.header,
          opacity: ''
        }
      case 'Completed':
        return {
          bg: 'bg-gray-200',
          border: 'border-gray-400',
          text: 'text-gray-700',
          header: 'bg-gray-300',
          opacity: 'opacity-80'
        }
      case 'Cancelled':
        return {
          bg: 'bg-gray-200',
          border: 'border-gray-400',
          text: 'text-gray-700',
          header: 'bg-gray-300',
          opacity: 'opacity-80'
        }
      case 'In Progress':
      default:
        return {
          bg: 'bg-gray-200',
          border: 'border-gray-400',
          text: 'text-gray-700',
          header: 'bg-gray-300',
          opacity: 'opacity-80'
        }
    }
  })()

  return (
    <div
      ref={entryRef}
      className={`absolute inset-0 ${statusStyling.bg} ${isSelected ? 'border-2 border-blue-500' : statusStyling.border} rounded text-xs ${isEditable ? 'cursor-pointer hover:opacity-90' : 'cursor-default'} transition-opacity shadow-sm ${statusStyling.text} ${statusStyling.opacity} ${isLoading ? 'opacity-50' : ''} ${isResizing ? 'z-40 shadow-lg' : 'z-10'} ${isSelected ? 'shadow-lg' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      title={`${event.title} ${event.project ? '- ' + event.project : ''} (${event.status}) - Click for history, right-click for options`}
    >
      {/* Top resize handle - only for planned entries */}
      {(isHovered || isResizing) && isEditable && (
        <div
          className="absolute -top-1 left-0 right-0 h-2 cursor-ns-resize flex items-center justify-center hover:bg-indigo-500 hover:bg-opacity-20 group"
          onMouseDown={(e) => handleResizeStart(e, 'top')}
        >
          <GripHorizontal className="w-4 h-2 text-gray-400 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      {/* Header (draggable area) */}
      <div
        ref={setNodeRef}
        {...(isEditable ? listeners : {})}
        {...(isEditable ? attributes : {})}
        className={`px-1 py-0.5 ${statusStyling.header} rounded-t ${isEditable ? 'cursor-move' : 'cursor-default'} select-none relative`}
        title={isEditable ? 'Drag to move entry' : ''}
      >
        <div className="font-semibold text-xs truncate">{event.title}</div>
        {event.project && <div className={`text-xs ${statusStyling.text} truncate`}>{event.project}</div>}

        {/* Status badge */}
        {event.status === 'Completed' && (
          <div className="absolute top-0.5 right-0.5">
            <div className="bg-green-500 text-white p-1 rounded-full" title="Completed">
              <CheckCircle className="w-3 h-3" />
            </div>
          </div>
        )}
        {event.status === 'Cancelled' && (
          <div className="absolute top-0.5 right-0.5">
            <div className="bg-red-500 text-white p-1 rounded-full" title="Cancelled">
              <XCircle className="w-3 h-3" />
            </div>
          </div>
        )}
      </div>

      {/* Show time and duration for entries longer than 1 hour */}
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

      {/* Bottom resize handle - only for planned entries */}
      {(isHovered || isResizing) && isEditable && (
        <div
          className="absolute -bottom-1 left-0 right-0 h-2 cursor-ns-resize flex items-center justify-center hover:bg-indigo-500 hover:bg-opacity-20 group"
          onMouseDown={(e) => handleResizeStart(e, 'bottom')}
        >
          <GripHorizontal className="w-4 h-2 text-gray-400 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      {/* Resize tooltip */}
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

      {/* Context Menu */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        items={getContextMenuItems()}
        onClose={() => setContextMenu({ isOpen: false, position: { x: 0, y: 0 } })}
      />
    </div>
  )
}

export default PlannerEntry
