import React, { useState } from 'react'
import { X, Users, Search } from 'lucide-react'
import { User } from '../../types'

interface UserSwitchModalProps {
  isOpen: boolean
  onClose: () => void
  users: User[]
  selectedUser: string
  onUserChange: (userId: string) => void
}

const UserSwitchModal: React.FC<UserSwitchModalProps> = ({
  isOpen,
  onClose,
  users,
  selectedUser,
  onUserChange
}) => {
  const [searchTerm, setSearchTerm] = useState('')

  if (!isOpen) return null

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleUserSelect = (userId: string) => {
    onUserChange(userId)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Switch User</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* User List */}
        <div className="max-h-96 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            <div className="py-2">
              {filteredUsers.map((user) => (
                <button
                  key={user.name}
                  onClick={() => handleUserSelect(user.name)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                    selectedUser === user.name ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-blue-600">
                      {user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-gray-900">
                      {user.full_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {user.email}
                    </div>
                  </div>
                  {selectedUser === user.name && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <p className="text-xs text-gray-600">
            💡 Switch to view another user's timesheet entries and activities. Only users assigned to activites in your projects are shown.
          </p>
        </div>
      </div>
    </div>
  )
}

export default UserSwitchModal
