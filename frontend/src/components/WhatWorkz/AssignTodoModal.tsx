import React, { useState, useEffect } from 'react'
import { X, UserPlus, Search, User, Check } from 'lucide-react'
import { User as UserType, ExtendedTodo } from '../../types'
import { UserService } from '../../services/timesheetService'

interface AssignTodoModalProps {
  isOpen: boolean
  onClose: () => void
  todo: ExtendedTodo | null
  onAssignTodo: (todoName: string, userId: string) => Promise<void>
}

const AssignTodoModal: React.FC<AssignTodoModalProps> = ({
  isOpen,
  onClose,
  todo,
  onAssignTodo
}) => {
  const [users, setUsers] = useState<UserType[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserType[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('')

  // Load users when modal opens
  useEffect(() => {
    if (isOpen) {
      loadUsers()
      setSearchTerm('')
      setSelectedUserId(todo?.allocated_to || '')
    }
  }, [isOpen, todo])

  // Filter users based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredUsers(users)
    } else {
      const searchLower = searchTerm.toLowerCase()
      setFilteredUsers(users.filter(user => 
        user.full_name.toLowerCase().includes(searchLower) ||
        user.name.toLowerCase().includes(searchLower) ||
        (user.email && user.email.toLowerCase().includes(searchLower))
      ))
    }
  }, [users, searchTerm])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const userData = await UserService.getProjectUsers()
      setUsers(userData)
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = async (userId: string) => {
    if (!todo) return

    try {
      setAssigning(true)
      await onAssignTodo(todo.name, userId)
      onClose()
    } catch (error) {
      console.error('Assign todo failed:', error)
    } finally {
      setAssigning(false)
    }
  }

  const handleUnassign = async () => {
    if (!todo) return

    try {
      setAssigning(true)
      await onAssignTodo(todo.name, '')
      onClose()
    } catch (error) {
      console.error('Unassign todo failed:', error)
    } finally {
      setAssigning(false)
    }
  }

  const getUserInitials = (fullName: string): string => {
    if (!fullName) return '?'
    return fullName
      .split(' ')
      .map(name => name.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('')
  }

  const getAvatarColor = (name: string): string => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
      'bg-indigo-500', 'bg-red-500', 'bg-yellow-500', 'bg-teal-500'
    ]
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[index % colors.length]
  }

  if (!isOpen || !todo) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Assign Todo
                  </h3>
                  <p className="text-sm text-gray-500 truncate">
                    {todo.subject}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>

            {/* Current Assignment */}
            {todo.allocated_to && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white ${getAvatarColor(todo.allocated_to)}`}>
                      {getUserInitials(todo.assigned_user_name || todo.allocated_to)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Currently assigned to
                      </p>
                      <p className="text-xs text-gray-600">
                        {todo.assigned_user_name || todo.allocated_to}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleUnassign}
                    disabled={assigning}
                    className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    Unassign
                  </button>
                </div>
              </div>
            )}

            {/* User List */}
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No users found</p>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="text-blue-600 text-sm hover:underline mt-1"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredUsers.map((user) => {
                    const isCurrentlyAssigned = user.name === todo.allocated_to
                    const isSelected = user.name === selectedUserId
                    
                    return (
                      <button
                        key={user.name}
                        onClick={() => handleAssign(user.name)}
                        disabled={assigning || isCurrentlyAssigned}
                        className={`w-full flex items-center space-x-3 p-3 rounded-md text-left transition-colors ${
                          isCurrentlyAssigned
                            ? 'bg-blue-50 border border-blue-200 cursor-default'
                            : 'hover:bg-gray-50 border border-transparent'
                        } ${assigning ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white ${getAvatarColor(user.name)}`}>
                          {getUserInitials(user.full_name)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user.full_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {user.name}
                          </p>
                          {user.email && (
                            <p className="text-xs text-gray-400 truncate">
                              {user.email}
                            </p>
                          )}
                        </div>

                        {isCurrentlyAssigned && (
                          <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AssignTodoModal
