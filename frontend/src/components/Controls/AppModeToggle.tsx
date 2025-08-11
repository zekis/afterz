import React from 'react'
import { Calendar, CheckSquare } from 'lucide-react'

interface AppModeToggleProps {
  currentMode: 'plan' | 'book'
  onModeChange: (mode: 'plan' | 'book') => void
}

const AppModeToggle: React.FC<AppModeToggleProps> = ({ currentMode, onModeChange }) => {
  const handleToggle = () => {
    const newMode = currentMode === 'plan' ? 'book' : 'plan'
    onModeChange(newMode)
    
    // Navigate to the appropriate page
    if (newMode === 'plan') {
      window.location.href = '/beforez'
    } else {
      window.location.href = '/afterz'
    }
  }

  return (
    <div className="flex items-center space-x-3 mb-4">
      <div className="relative inline-flex items-center bg-gray-100 rounded-lg p-1">
        {/* Background slider */}
        <div
          className={`absolute top-1 bottom-1 w-1/2 bg-white rounded-md shadow-sm transition-transform duration-200 ease-in-out ${
            currentMode === 'book' ? 'translate-x-full' : 'translate-x-0'
          }`}
        />
        
        {/* Plan button */}
        <button
          onClick={() => currentMode !== 'plan' && handleToggle()}
          className={`relative z-10 flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
            currentMode === 'plan'
              ? 'text-indigo-700'
              : 'text-gray-600 hover:text-indigo-600'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Plan</span>
        </button>
        
        {/* Book button */}
        <button
          onClick={() => currentMode !== 'book' && handleToggle()}
          className={`relative z-10 flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
            currentMode === 'book'
              ? 'text-blue-700'
              : 'text-gray-600 hover:text-blue-600'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Book</span>
        </button>
      </div>
    </div>
  )
}

export default AppModeToggle
