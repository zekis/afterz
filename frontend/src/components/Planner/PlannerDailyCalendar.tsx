import React, { useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { format } from 'date-fns'
import { Project } from '../../types'
import { getTimeSlots, createTimeSlotId, calculateHorizontalStacking } from '../../lib/utils'
import PlannerEntry, { PlannerCalendarEvent } from './PlannerEntry'

interface PlannerDailyCalendarProps {
  currentDay: Date
  events: PlannerCalendarEvent[]
  viewMode: '6am-6pm' | 'full-day'
  onEventUpdate: () => void
  projects?: Project[]
  allEntries?: any[]
  onToastError?: (message: string) => void
  onEntryClick?: (event: PlannerCalendarEvent, position: { x: number; y: number }) => void
  onEditEntry?: (event: PlannerCalendarEvent) => void
  onTodoUpdate?: () => void
  selectedEntryId?: string | null
}

interface DroppableTimeSlotProps {
  slotId: string
  hour: number
  children: React.ReactNode
}

const DroppableTimeSlot: React.FC<DroppableTimeSlotProps> = ({ slotId, hour, children }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: slotId,
    data: {
      accepts: ['todo', 'planner-entry']
    }
  })

  const topPosition = hour * 60 // 60px per hour

  return (
    <div
      ref={setNodeRef}
      className={`time-slot ${isOver ? 'bg-indigo-400 bg-opacity-40' : ''}`}
      style={{ top: `${topPosition}px` }}
    >
      {children}
    </div>
  )
}

const PlannerDailyCalendar: React.FC<PlannerDailyCalendarProps> = ({
  currentDay,
  events,
  viewMode,
  onEventUpdate,
  projects = [],
  allEntries = [],
  onToastError,
  onEntryClick,
  onEditEntry,
  onTodoUpdate,
  selectedEntryId
}) => {
  const startHour = viewMode === '6am-6pm' ? 6 : 0
  const endHour = viewMode === '6am-6pm' ? 18 : 23
  const timeSlots = getTimeSlots(startHour, endHour)
  const hourHeight = 60
  const totalHeight = timeSlots.length * hourHeight

  // Filter events for the current day and position them
  const positionedEvents = useMemo(() => {
    return events
      .filter(event => {
        const eventDate = new Date(event.start)
        return eventDate.toDateString() === currentDay.toDateString()
      })
      .map(event => {
        const eventDate = new Date(event.start)
        const eventHour = eventDate.getHours()
        const eventMinutes = eventDate.getMinutes()

        // Calculate position relative to the start hour
        const relativeHour = eventHour - startHour
        const topPosition = (relativeHour * hourHeight) + (eventMinutes * hourHeight / 60)

        // Calculate height based on duration
        const duration = event.duration || (event.end ? Math.max(0.1, (event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60)) : 1)
        const height = Math.max(30, duration * hourHeight) // Minimum 30px (0.5 hour)

        return {
          ...event,
          topPosition,
          height,
          isVisible: eventHour >= startHour && eventHour <= endHour
        }
      })
      .filter(event => event.isVisible) as (PlannerCalendarEvent & { topPosition: number; height: number; isVisible: boolean })[]
  }, [events, currentDay, startHour, endHour, hourHeight])

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Header */}
      <div className="calendar-header-daily">
        <div className="p-3 font-medium text-sm text-gray-700 w-20">
          Time
        </div>

        <div className="flex-1 p-3 text-center border-l border-gray-200">
          <div className="font-medium text-sm text-gray-900">
            {format(currentDay, 'EEEE')}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {format(currentDay, 'MMMM d, yyyy')}
          </div>
        </div>
      </div>

      {/* Calendar Body */}
      <div className="calendar-body-daily" style={{ minHeight: `${totalHeight}px` }}>
        {/* Time Labels */}
        <div className="time-labels-daily">
          {timeSlots.map((hour, index) => (
            <div
              key={hour}
              className="time-label-daily"
              style={{ top: `${index * hourHeight}px` }}
            >
              {format(new Date().setHours(hour, 0, 0, 0), 'h:mm a')}
            </div>
          ))}
        </div>

        {/* Day Column */}
        <div className="day-column-daily">
          {/* Hour Lines */}
          <div className="hour-lines-daily">
            {timeSlots.map((hour, index) => (
              <div
                key={hour}
                className="hour-line-daily"
                style={{ top: `${index * hourHeight}px` }}
              />
            ))}
          </div>

          {/* Droppable Time Slots */}
          {timeSlots.map((hour, index) => {
            const slotId = createTimeSlotId(0, hour) // dayIndex is always 0 for daily view
            return (
              <DroppableTimeSlot
                key={slotId}
                slotId={slotId}
                hour={index}
              >
                <></>
              </DroppableTimeSlot>
            )
          })}

          {/* Positioned Planner Entries */}
          {positionedEvents.map(event => {
            // Calculate horizontal stacking for overlapping entries
            const stacking = calculateHorizontalStacking(event, positionedEvents)
            
            return (
              <div
                key={event.id}
                style={{
                  position: 'absolute',
                  top: `${event.topPosition}px`,
                  height: `${event.height}px`,
                  left: `calc(${stacking.leftOffset}% + 4px)`,
                  width: `calc(${stacking.width}% - ${stacking.totalColumns > 1 ? '6px' : '8px'})`,
                  zIndex: 10
                }}
              >
                <PlannerEntry
                  event={event}
                  onUpdate={onEventUpdate}
                  hourHeight={hourHeight}
                  allEntries={allEntries}
                  onToastError={onToastError}
                  onEntryClick={onEntryClick}
                  onEdit={onEditEntry}
                  onTodoUpdate={onTodoUpdate}
                  isSelected={selectedEntryId === event.id}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary footer */}
      <div className="bg-gray-50 border-t p-4">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-600">
            {format(currentDay, 'EEEE, MMMM d, yyyy')}
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-gray-600">
              Total Items: <span className="font-medium">{positionedEvents.length}</span>
            </div>

            <div className="text-gray-600">
              Total Hours: <span className="font-medium">
                {positionedEvents.reduce((total, ev) => {
                  const d = ev.duration || (ev.end ? Math.max(0.0, (ev.end.getTime() - ev.start.getTime()) / (1000 * 60 * 60)) : 1)
                  return total + d
                }, 0).toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlannerDailyCalendar
