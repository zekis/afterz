import React from 'react'
import { Clock, Sun } from 'lucide-react'

interface ViewToggleProps {
  viewMode: '6am-6pm' | 'full-day'
  onViewModeChange: (mode: '6am-6pm' | 'full-day') => void
}

const ViewToggle: React.FC<ViewToggleProps> = ({ viewMode, onViewModeChange }) => {
  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => onViewModeChange('6am-6pm')}
        className={`flex items-center space-x-2 px-3 py-1 rounded-md text-sm transition-colors ${
          viewMode === '6am-6pm'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <Clock className="w-4 h-4" />
        <span>6AM - 6PM</span>
      </button>
      
      <button
        onClick={() => onViewModeChange('full-day')}
        className={`flex items-center space-x-2 px-3 py-1 rounded-md text-sm transition-colors ${
          viewMode === 'full-day'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <Sun className="w-4 h-4" />
        <span>Full Day</span>
      </button>
    </div>
  )
}

export default ViewToggle
