import React from 'react'
import { CheckSquare, AlertCircle, Calendar } from 'lucide-react'

interface ActionToolbarProps {
  onCreateTodo: () => void
  onCreateIssue?: () => void
  onCreatePlan?: () => void
}

const ActionToolbar: React.FC<ActionToolbarProps> = ({
  onCreateTodo,
  onCreateIssue,
  onCreatePlan
}) => {
  const handlePlaceholderAction = (actionName: string) => {
    // Show toast for placeholder actions
    const toast = document.createElement('div')
    toast.className = 'fixed top-4 right-4 z-50 bg-gray-100 border border-gray-300 text-gray-700 px-4 py-3 rounded shadow-lg'
    toast.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-sm">${actionName} creation coming soon!</span>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-gray-500 hover:text-gray-700">×</button>
      </div>
    `
    document.body.appendChild(toast)
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast)
      }
    }, 3000)
  }

  return (
    <div className="flex items-center space-x-2">
      {/* Todo Button */}
      <button
        onClick={onCreateTodo}
        className="flex items-center justify-center w-10 h-10 border border-gray-300 text-gray-600 rounded-lg hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        title="Create Todo"
      >
        <CheckSquare className="w-5 h-5" />
      </button>

      {/* Issue Button (Placeholder) */}
      <button
        onClick={() => handlePlaceholderAction('Issue')}
        className="flex items-center justify-center w-10 h-10 border border-gray-300 text-gray-600 rounded-lg hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
        title="Create Issue (Coming Soon)"
      >
        <AlertCircle className="w-5 h-5" />
      </button>

      {/* Plan Button (Placeholder) */}
      <button
        onClick={() => handlePlaceholderAction('Plan')}
        className="flex items-center justify-center w-10 h-10 border border-gray-300 text-gray-600 rounded-lg hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
        title="Create Plan (Coming Soon)"
      >
        <Calendar className="w-5 h-5" />
      </button>
    </div>
  )
}

export default ActionToolbar
