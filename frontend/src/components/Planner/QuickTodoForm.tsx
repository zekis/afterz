import React, { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'

interface QuickTodoFormProps {
  onCreateTodo: (subject: string) => Promise<void>
}

const QuickTodoForm: React.FC<QuickTodoFormProps> = ({ onCreateTodo }) => {
  const [subject, setSubject] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim()) return

    try {
      setIsCreating(true)
      await onCreateTodo(subject.trim())
      setSubject('')
    } catch (error) {
      console.error('Failed to create todo:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
      <input
        type="text"
        placeholder="Quick todo..."
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        disabled={isCreating}
      />

      <button
        type="submit"
        disabled={!subject.trim() || isCreating}
        className="flex items-center justify-center px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isCreating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
      </button>
    </form>
  )
}

export default QuickTodoForm
