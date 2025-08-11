import React from 'react'
import { ChevronLeft, ChevronRight, Users, ChevronDown } from 'lucide-react'
import { getWeekData, formatWeekRange, getNextWeek, getPreviousWeek } from '../../lib/utils'
import BulkActions from './BulkActions'
import UserSelector from './UserSelector'
import { User } from '../../types'

interface WeekSelectorProps {
  currentWeek: Date
  onWeekChange: (week: Date) => void
  selectedUser?: string
  currentUser?: User
  users?: User[]
  onUserChange?: (userId: string) => void
  onUpdate?: () => void
  onToastError?: (message: string) => void
  showBulkActions?: boolean
}

const WeekSelector: React.FC<WeekSelectorProps> = ({ 
  currentWeek, 
  onWeekChange, 
  selectedUser, 
  currentUser, 
  users,
  onUserChange,
  onUpdate, 
  onToastError,
  showBulkActions = true
}) => {
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

      <div className="flex items-center space-x-3">
        {/* User selector for administrators and managers who can view multiple users */}
        {currentUser && onUserChange && users && users.length > 0 && (currentUser.name === 'Administrator' || users.length > 1) && (
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-gray-600" />
            <div className="relative">
              <select
                value={selectedUser || ''}
                onChange={(e) => onUserChange(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-48"
              >
                <option value={currentUser.name}>
                  {currentUser.full_name} (Me) - {currentUser.email}
                </option>
                {users
                  .filter(user => user.name !== currentUser.name)
                  .map(user => (
                    <option key={user.name} value={user.name}>
                      {user.full_name} - {user.email}
                    </option>
                  ))
                }
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Viewing indicator when manager is viewing someone else's timesheet */}
        {selectedUser && currentUser && selectedUser !== currentUser.name && users && (
          <div className="flex items-center space-x-1 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-sm font-medium text-blue-700">Viewing:</span>
            <span className="text-sm text-blue-600">
              {users.find(u => u.name === selectedUser)?.full_name || selectedUser}
            </span>
          </div>
        )}

        {/* Bulk Actions */}
        {showBulkActions && selectedUser && currentUser && onUpdate && (
          <BulkActions
            currentWeek={currentWeek}
            selectedUser={selectedUser}
            currentUser={currentUser}
            onUpdate={onUpdate}
            onToastError={onToastError}
          />
        )}

        {/* Current Week Button */}
        {!isCurrentWeek() && (
          <button
            onClick={handleCurrentWeek}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            <span>Current Week</span>
          </button>
        )}
        
        {/* Current Week Indicator - styled like a disabled button */}
        {isCurrentWeek() && (
          <div className="flex items-center space-x-2 px-4 py-2 bg-gray-300 text-gray-600 rounded-lg text-sm font-medium cursor-default">
            <span>Current Week</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default WeekSelector
