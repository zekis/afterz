import React from 'react'
import { Calendar, CalendarDays, ChevronLeft, ChevronRight, Clock, Sun } from 'lucide-react'
import { format } from 'date-fns'

interface CalendarViewToggleProps {
  calendarView: 'week' | 'day'
  onCalendarViewChange: (view: 'week' | 'day') => void
  currentWeek?: Date
  currentDay?: Date
  onWeekChange?: (date: Date) => void
  onDayChange?: (date: Date) => void
  viewMode?: '6am-6pm' | 'full-day'
  onViewModeChange?: (mode: '6am-6pm' | 'full-day') => void
}

const CalendarViewToggle: React.FC<CalendarViewToggleProps> = ({
  calendarView,
  onCalendarViewChange,
  currentWeek,
  currentDay,
  onWeekChange,
  onDayChange,
  viewMode,
  onViewModeChange
}) => {
  const handlePrev = () => {
    if (calendarView === 'day' && currentDay && onDayChange) {
      const prevDay = new Date(currentDay)
      prevDay.setDate(prevDay.getDate() - 1)
      onDayChange(prevDay)
    } else if (calendarView === 'week' && currentWeek && onWeekChange) {
      const prevWeek = new Date(currentWeek)
      prevWeek.setDate(prevWeek.getDate() - 7)
      onWeekChange(prevWeek)
    }
  }

  const handleNext = () => {
    if (calendarView === 'day' && currentDay && onDayChange) {
      const nextDay = new Date(currentDay)
      nextDay.setDate(nextDay.getDate() + 1)
      onDayChange(nextDay)
    } else if (calendarView === 'week' && currentWeek && onWeekChange) {
      const nextWeek = new Date(currentWeek)
      nextWeek.setDate(nextWeek.getDate() + 7)
      onWeekChange(nextWeek)
    }
  }

  const handleToday = () => {
    const today = new Date()
    if (calendarView === 'day' && onDayChange) {
      onDayChange(today)
    } else if (calendarView === 'week' && onWeekChange) {
      onWeekChange(today)
    }
  }

  return (
    <div className="flex items-center space-x-4">
      {/* Today Button */}
      <button
        onClick={handleToday}
        className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        Today
      </button>

      {/* Navigation Controls - Always visible */}
      <div className="flex items-center space-x-2">
        <button
          onClick={handlePrev}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          title={calendarView === 'day' ? 'Previous day' : 'Previous week'}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        <div className="px-3 py-1.5 text-sm font-medium text-gray-900 min-w-[120px] text-center">
          {calendarView === 'day' && currentDay && format(currentDay, 'MMM d, yyyy')}
          {calendarView === 'week' && currentWeek && format(currentWeek, 'MMM yyyy')}
        </div>
        
        <button
          onClick={handleNext}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          title={calendarView === 'day' ? 'Next day' : 'Next week'}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Calendar View Toggle Buttons */}
      <div className="flex items-center bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => onCalendarViewChange('week')}
          className={`flex items-center space-x-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            calendarView === 'week'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Week</span>
        </button>
        
        <button
          onClick={() => onCalendarViewChange('day')}
          className={`flex items-center space-x-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            calendarView === 'day'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Day</span>
        </button>
      </div>

      {/* Time View Toggle Buttons */}
      {viewMode && onViewModeChange && (
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => onViewModeChange('6am-6pm')}
            className={`flex items-center space-x-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === '6am-6pm'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>6AM-6PM</span>
          </button>
          
          <button
            onClick={() => onViewModeChange('full-day')}
            className={`flex items-center space-x-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'full-day'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Sun className="w-4 h-4" />
            <span>Full Day</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default CalendarViewToggle
