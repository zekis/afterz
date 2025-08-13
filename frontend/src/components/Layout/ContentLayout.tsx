import React from 'react'

interface ContentLayoutProps {
  leftPanel?: React.ReactNode
  mainContent: React.ReactNode
  rightPanel?: React.ReactNode
  leftPanelWidth?: string
  rightPanelWidth?: string
  className?: string
}

const ContentLayout: React.FC<ContentLayoutProps> = ({
  leftPanel,
  mainContent,
  rightPanel,
  leftPanelWidth = 'w-80',
  rightPanelWidth = 'w-80',
  className = ''
}) => {
  return (
    <div className={`flex-1 min-h-0 overflow-hidden ${className}`}>
      <div className="flex gap-6 h-full">
        {/* Left Panel - Only show if content provided */}
        {leftPanel && (
          <div className={`${leftPanelWidth} flex-shrink-0 h-full`}>
            {leftPanel}
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 min-h-0 h-full">
          {mainContent}
        </div>

        {/* Right Panel - Only show if content provided */}
        {rightPanel && (
          <div className={`${rightPanelWidth} flex-shrink-0 h-full`}>
            <div className="h-full overflow-y-auto overflow-x-hidden">
              {rightPanel}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ContentLayout
