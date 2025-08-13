import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Home, Grid, LogOut, User, Search, Calendar, Clock } from 'lucide-react'
import { User as UserType } from '../../types'

interface NavigationDropdownProps {
  currentUser?: UserType
}

const NavigationDropdown: React.FC<NavigationDropdownProps> = ({ 
  currentUser
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNavigation = (path: string) => {
    setIsOpen(false)
    
    // Navigate to different Frappe pages
    if (path === 'desk') {
      window.location.href = '/app'
    } else if (path === 'apps') {
      window.location.href = '/apps'
    } else if (path === 'logout') {
      window.location.href = '/logout'
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors backdrop-blur-sm"
        title="Navigation Menu"
      >
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-white bg-opacity-30 rounded-full flex items-center justify-center">
            <User className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm text-white font-medium hidden sm:block">
            {currentUser?.full_name || 'Menu'}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* User Info */}
          {currentUser && (
            <>
              <div className="px-4 py-2 border-b border-gray-100">
                <div className="text-sm font-medium text-gray-900">{currentUser.full_name}</div>
                <div className="text-xs text-gray-500">{currentUser.email}</div>
              </div>
            </>
          )}


          {/* Workz Apps */}
          <div className="px-4 py-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Workz Apps</div>
          </div>

          <button
            onClick={() => window.location.href = '/whatz'}
            className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
          >
            <Search className="w-4 h-4 text-purple-500" />
            <span>What-Workz</span>
            <span className="text-xs text-gray-400 ml-auto">Manage</span>
          </button>

          <button
            onClick={() => window.location.href = '/beforez'}
            className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
          >
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span>Before-Workz</span>
            <span className="text-xs text-gray-400 ml-auto">Plan</span>
          </button>

          <button
            onClick={() => window.location.href = '/afterz'}
            className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
          >
            <Clock className="w-4 h-4 text-green-500" />
            <span>After-Workz</span>
            <span className="text-xs text-gray-400 ml-auto">Track</span>
          </button>

          <div className="border-t border-gray-100 my-1"></div>

          {/* Navigation Options */}
          <button
            onClick={() => handleNavigation('desk')}
            className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Home className="w-4 h-4 text-gray-500" />
            <span>Go to Desk</span>
          </button>

          <button
            onClick={() => handleNavigation('apps')}
            className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Grid className="w-4 h-4 text-gray-500" />
            <span>Apps</span>
          </button>

          <div className="border-t border-gray-100 my-1"></div>

          <button
            onClick={() => handleNavigation('logout')}
            className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 text-red-500" />
            <span>Logout</span>
          </button>
        </div>
      )}

    </div>
  )
}

export default NavigationDropdown
