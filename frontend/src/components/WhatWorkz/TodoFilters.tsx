import React from 'react'
import { Search, Filter, SortAsc, Calendar, User, Tag } from 'lucide-react'

interface TodoFiltersProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  groupBy: string
  onGroupByChange: (groupBy: string) => void
  sortBy: string
  onSortByChange: (sortBy: string) => void
  viewMode: string
  onViewModeChange: (viewMode: string) => void
}

const TodoFilters: React.FC<TodoFiltersProps> = ({
  searchTerm,
  onSearchChange,
  groupBy,
  onGroupByChange,
  sortBy,
  onSortByChange,
  viewMode,
  onViewModeChange
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search todos..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        {/* View Mode */}
        <select
          value={viewMode}
          onChange={(e) => onViewModeChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        >
          <option value="all">All Todos</option>
          <option value="my_todos">My Todos</option>
          <option value="assigned_to_me">Assigned to Me</option>
          <option value="shared_with_me">Shared with Me</option>
        </select>

        {/* Group By */}
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={groupBy}
            onChange={(e) => onGroupByChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="status">Group by Status</option>
            <option value="priority">Group by Priority</option>
            <option value="assignee">Group by Assignee</option>
            <option value="project">Group by Project</option>
            <option value="owner">Group by Owner</option>
          </select>
        </div>

        {/* Sort By */}
        <div className="flex items-center space-x-2">
          <SortAsc className="w-4 h-4 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="priority">Sort by Priority</option>
            <option value="created">Sort by Created</option>
            <option value="modified">Sort by Modified</option>
            <option value="assignee">Sort by Assignee</option>
          </select>
        </div>
      </div>
    </div>
  )
}

export default TodoFilters
