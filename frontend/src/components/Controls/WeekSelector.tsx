import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getWeekData, formatWeekRange, getNextWeek, getPreviousWeek } from '../../lib/utils'

interface WeekSelectorProps {
  currentWeek: Date
  onWeekChange: (week: Date) => void
}

const WeekSelector: React.FC<WeekSelectorProps> = ({ currentWeek, onWeekChange }) => {
  const weekData = getWeekData(currentWeek)
  const weekRange = formatWeekRange(weekData.startDate, weekData.endDate)

  const handlePreviousWeek = () => {
    onWeekChange(getPreviousWeek(currentWeek))
  }

  const handleNextWeek = () => {
    onWeekChange(getNextWeek(currentWeek))
  }

  const handleCurrentWeek = () => {
    onWeekChange(new Date())
  }

  const isCurrentWeek = () => {
    const now = new Date()
    const currentWeekData = getWeekData(now)
    return weekData.startDate.getTime() === currentWeekData.startDate.getTime()
  }

  return (
    <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center space-x-4">
        <button
          onClick={handlePreviousWeek}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Previous Week"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>

        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">{weekRange}</h2>
          <p className="text-sm text-gray-500">
            Week of {weekData.startDate.toLocaleDateString()}
          </p>
        </div>

        <button
          onClick={handleNextWeek}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Next Week"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="flex items-center space-x-2">
        {!isCurrentWeek() && (
          <button
            onClick={handleCurrentWeek}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
          >
            Current Week
          </button>
        )}
        
        <div className="text-sm text-gray-500">
          {isCurrentWeek() ? 'Current Week' : ''}
        </div>
      </div>
    </div>
  )
}

export default WeekSelector
