import React, { useMemo, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { format } from 'date-fns'
import { Project } from '../../types'
import { getWeekData, getTimeSlots, createTimeSlotId } from '../../lib/utils'
import PlannerEntry, { PlannerCalendarEvent } from './PlannerEntry'
import HistoryPanel from '../Common/HistoryPanel'

interface PlannerWeeklyCalendarProps {
  currentWeek: Date
  events: PlannerCalendarEvent[]
  viewMode: '6am-6pm' | 'full-day'
  onEventUpdate: () => void
  projects?: Project[]
  allEntries?: any[]
  onToastError?: (message: string) => void
  onEntryClick?: (event: PlannerCalendarEvent, position: { x: number; y: number }) => void
  selectedEntryId?: string | null
}

interface DroppableTimeSlotProps {
  slotId: string
  dayIndex: number
  hour: number
  children: React.ReactNode
}

const DroppableTimeSlot: React.FC<DroppableTimeSlotProps> = ({ slotId, dayIndex, hour, children }) => {
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

const PlannerWeeklyCalendar: React.FC<PlannerWeeklyCalendarProps> = ({
  currentWeek,
  events,
  viewMode,
  onEventUpdate,
  projects = [],
  allEntries = [],
  onToastError,
  onEntryClick,
  selectedEntryId
}) => {
  const weekData = getWeekData(currentWeek)
  const startHour = viewMode === '6am-6pm' ? 6 : 0
  const endHour = viewMode === '6am-6pm' ? 18 : 23
  const timeSlots = getTimeSlots(startHour, endHour)
  const hourHeight = 60
  const totalHeight = timeSlots.length * hourHeight

  // Position events absolutely based on their time
  const positionedEvents = useMemo(() => {
    return events.map(event => {
      const eventDate = new Date(event.start)
      const dayIndex = weekData.days.findIndex(day =>
        day.toDateString() === eventDate.toDateString()
      )

      if (dayIndex === -1) return null

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
        dayIndex,
        topPosition,
        height,
        isVisible: eventHour >= startHour && eventHour <= endHour
      }
    }).filter((event: any) => event && event.isVisible) as (PlannerCalendarEvent & { dayIndex: number; topPosition: number; height: number; isVisible: boolean })[]
  }, [events, weekData.days, startHour, endHour, hourHeight])

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Header */}
      <div className="calendar-header">
        <div className="p-3 font-medium text-sm text-gray-700">
          Time
        </div>

        {weekData.days.map((day: Date) => (
          <div key={day.toISOString()} className="p-3 text-center">
            <div className="font-medium text-sm text-gray-900">
              {format(day, 'EEE')}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {format(day, 'MMM d')}
            </div>
          </div>
        ))}
      </div>

      {/* Calendar Body */}
      <div className="calendar-body" style={{ minHeight: `${totalHeight}px` }}>
        {/* Time Labels */}
        <div className="time-labels">
          {timeSlots.map((hour, index) => (
            <div
              key={hour}
              className="time-label"
              style={{ top: `${index * hourHeight}px` }}
            >
              {format(new Date().setHours(hour, 0, 0, 0), 'h:mm a')}
            </div>
          ))}
        </div>

        {/* Day Columns */}
        <div className="day-columns">
          {weekData.days.map((day: Date, dayIndex: number) => (
            <div key={day.toISOString()} className="day-column">
              {/* Hour Lines */}
              <div className="hour-lines">
                {timeSlots.map((hour, index) => (
                  <div
                    key={hour}
                    className="hour-line"
                    style={{ top: `${index * hourHeight}px` }}
                  />
                ))}
              </div>

              {/* Droppable Time Slots */}
              {timeSlots.map((hour, index) => {
                const slotId = createTimeSlotId(dayIndex, hour)
                return (
                  <DroppableTimeSlot
                    key={slotId}
                    slotId={slotId}
                    dayIndex={dayIndex}
                    hour={index}
                  >
                    <></>
                  </DroppableTimeSlot>
                )
              })}

              {/* Positioned Planner Entries */}
              {positionedEvents
                .filter(event => (event as any).dayIndex === dayIndex)
                .map(event => (
                  <div
                    key={event.id}
                    style={{
                      position: 'absolute',
                      top: `${(event as any).topPosition}px`,
                      height: `${(event as any).height}px`,
                      left: '2px',
                      right: '2px',
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
                      isSelected={selectedEntryId === event.id}
                    />
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>

      {/* Summary footer */}
      <div className="bg-gray-50 border-t p-4">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-600">
            Week of {format(weekData.startDate, 'MMM d')} - {format(weekData.endDate, 'MMM d, yyyy')}
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-gray-600">
              Total Items: <span className="font-medium">{events.length}</span>
            </div>

            <div className="text-gray-600">
              Total Hours: <span className="font-medium">
                {events.reduce((total, ev) => {
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

export default PlannerWeeklyCalendar
