import React from 'react'
import { Users, ChevronDown } from 'lucide-react'
import { User } from '../../types'

interface UserSelectorProps {
  users: User[]
  selectedUser: string
  onUserChange: (userId: string) => void
  currentUser: User
}

const UserSelector: React.FC<UserSelectorProps> = ({ 
  users, 
  selectedUser, 
  onUserChange, 
  currentUser 
}) => {
  const selectedUserData = users.find(u => u.name === selectedUser) || currentUser
  const isViewingOwnTimesheet = selectedUser === currentUser.name

  // Check if current user is a manager (simplified check)
  const isManager = currentUser.name.includes('manager') || 
                   currentUser.name === 'Administrator' ||
                   users.length > 1 // If they can see multiple users, assume manager

  return (
    <div className="relative">
      <div className="flex items-center space-x-2">
        <Users className="w-4 h-4 text-white text-opacity-70" />
        
        {isManager ? (
          <div className="relative">
            <select
              value={selectedUser}
              onChange={(e) => onUserChange(e.target.value)}
              className="appearance-none bg-white bg-opacity-90 border border-white border-opacity-30 rounded-md px-3 py-2 pr-8 text-sm text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 focus:border-white focus:border-opacity-50 backdrop-blur-sm min-w-48"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              <option value={currentUser.name} className="text-gray-900">
                {currentUser.full_name} (Me) - {currentUser.email}
              </option>
              {users
                .filter(user => user.name !== currentUser.name)
                .map(user => (
                  <option key={user.name} value={user.name} className="text-gray-900">
                    {user.full_name} - {user.email}
                  </option>
                ))
              }
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white text-opacity-70 pointer-events-none" />
          </div>
        ) : (
          <span className="text-sm text-white text-opacity-90">
            {currentUser.full_name}
          </span>
        )}
      </div>

    </div>
  )
}

export default UserSelector
