import React from 'react'

interface ControlsBarProps {
  leftControls?: React.ReactNode
  centerInfo?: React.ReactNode
  rightActions?: React.ReactNode
  className?: string
}

const ControlsBar: React.FC<ControlsBarProps> = ({
  leftControls,
  centerInfo,
  rightActions,
  className = ''
}) => {
  return (
    <div className={`flex-shrink-0 p-6 border-b border-slate-200 bg-white ${className}`}>
      <div className="flex justify-between items-center">
        {/* Left Controls - Search, Filters, etc. */}
        <div className="flex items-center space-x-4">
          {leftControls}
        </div>

        {/* Center Info - User context, status, etc. */}
        {centerInfo && (
          <div className="hidden md:flex items-center space-x-4 text-sm text-slate-600">
            {centerInfo}
          </div>
        )}

        {/* Right Actions - Primary actions, view controls */}
        <div className="flex items-center space-x-3">
          {rightActions}
        </div>
      </div>
    </div>
  )
}

export default ControlsBar
