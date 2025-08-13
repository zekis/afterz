import React from 'react'
import { NavLink } from 'react-router-dom'
import { 
  MdDashboard, 
  MdChecklist, 
  MdCalendarToday, 
  MdSchedule, 
  MdSettings,
  MdChevronLeft,
  MdChevronRight,
  MdAccountCircle
} from 'react-icons/md'
import { UserService } from '../services/timesheetService'

interface SidebarProps {
  expanded: boolean
  onToggle: () => void
}

interface NavItem {
  path: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  badge?: number
}

const Sidebar: React.FC<SidebarProps> = ({ expanded, onToggle }) => {
  const currentUser = UserService.getCurrentUser()

  const navItems: NavItem[] = [
    { path: '/', icon: MdDashboard, label: 'Dashboard' },
    { path: '/todos', icon: MdChecklist, label: 'Todos' },
    { path: '/planning', icon: MdCalendarToday, label: 'Planning' },
    { path: '/timesheet', icon: MdSchedule, label: 'Timesheet' },
    { path: '/settings', icon: MdSettings, label: 'Settings' },
  ]

  return (
    <div className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ${
      expanded ? 'w-60' : 'w-16'
    }`}>
      {/* Header with toggle */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        {expanded && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
              <MdDashboard className="w-5 h-5 text-slate-600" />
            </div>
            <span className="font-semibold text-slate-900">Workz</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1 hover:bg-slate-100 rounded-md transition-colors"
          title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {expanded ? (
            <MdChevronLeft className="w-5 h-5 text-slate-600" />
          ) : (
            <MdChevronRight className="w-5 h-5 text-slate-600" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={(navData) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors group ${
                    navData.isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
                title={!expanded ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {expanded && (
                  <>
                    <span className="font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User section at bottom */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
            <MdAccountCircle className="w-6 h-6 text-slate-600" />
          </div>
          {expanded && currentUser && (
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-slate-900 truncate">
                {currentUser.full_name || currentUser.name}
              </div>
              <div className="text-xs text-slate-500 truncate">
                {currentUser.email}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Sidebar
