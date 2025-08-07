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
        <Users className="w-4 h-4 text-gray-500" />
        
        {isManager ? (
          <div className="relative">
            <select
              value={selectedUser}
              onChange={(e) => onUserChange(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-1 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={currentUser.name}>
                {currentUser.full_name} (Me)
              </option>
              {users
                .filter(user => user.name !== currentUser.name)
                .map(user => (
                  <option key={user.name} value={user.name}>
                    {user.full_name}
                  </option>
                ))
              }
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        ) : (
          <span className="text-sm text-gray-700">
            {currentUser.full_name}
          </span>
        )}
      </div>

      {!isViewingOwnTimesheet && (
        <div className="absolute top-full left-0 mt-1 text-xs text-blue-600 whitespace-nowrap">
          Viewing: {selectedUserData.full_name}
        </div>
      )}
    </div>
  )
}

export default UserSelector
