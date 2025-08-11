import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Home, Grid, LogOut, User, Users } from 'lucide-react'
import { User as UserType } from '../../types'
import UserSwitchModal from './UserSwitchModal'

interface NavigationDropdownProps {
  currentUser?: UserType
  users?: UserType[]
  selectedUser?: string
  onUserChange?: (userId: string) => void
}

const NavigationDropdown: React.FC<NavigationDropdownProps> = ({ 
  currentUser, 
  users = [], 
  selectedUser, 
  onUserChange 
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [userSwitchModalOpen, setUserSwitchModalOpen] = useState(false)
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
        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* User Info */}
          {currentUser && (
            <>
              <div className="px-4 py-2 border-b border-gray-100">
                <div className="text-sm font-medium text-gray-900">{currentUser.full_name}</div>
                <div className="text-xs text-gray-500">{currentUser.email}</div>
              </div>
            </>
          )}

          {/* User Switching - Only for Administrators */}
          {currentUser?.name === 'Administrator' && users.length > 0 && onUserChange && (
            <button
              onClick={() => {
                setUserSwitchModalOpen(true)
                setIsOpen(false)
              }}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Users className="w-4 h-4 text-gray-500" />
              <span>Switch User</span>
            </button>
          )}

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

      {/* User Switch Modal */}
      <UserSwitchModal
        isOpen={userSwitchModalOpen}
        onClose={() => setUserSwitchModalOpen(false)}
        users={users}
        selectedUser={selectedUser}
        onUserChange={onUserChange || (() => {})}
      />
    </div>
  )
}

export default NavigationDropdown
