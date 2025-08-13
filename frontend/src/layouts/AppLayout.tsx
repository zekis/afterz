import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

const AppLayout: React.FC = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(true)

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        expanded={sidebarExpanded} 
        onToggle={() => setSidebarExpanded(!sidebarExpanded)} 
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <main className="flex-1 min-h-0 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
