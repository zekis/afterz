import React from 'react'
import { Clock, Sun } from 'lucide-react'

interface ViewToggleProps {
  viewMode: '6am-6pm' | 'full-day'
  onViewModeChange: (mode: '6am-6pm' | 'full-day') => void
}

const ViewToggle: React.FC<ViewToggleProps> = ({ viewMode, onViewModeChange }) => {
  return (
    <div className="flex items-center space-x-2">
      <Clock className="w-4 h-4 text-white text-opacity-70" />
      <div className="flex bg-white bg-opacity-20 rounded-lg p-1 backdrop-blur-sm">
        <button
          onClick={() => onViewModeChange('6am-6pm')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            viewMode === '6am-6pm'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-white text-opacity-90 hover:text-white hover:bg-white hover:bg-opacity-10'
          }`}
        >
          6AM - 6PM
        </button>
        <button
          onClick={() => onViewModeChange('full-day')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            viewMode === 'full-day'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-white text-opacity-90 hover:text-white hover:bg-white hover:bg-opacity-10'
          }`}
        >
          Full Day
        </button>
      </div>
    </div>
  )
}

export default ViewToggle
