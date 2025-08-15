import React, { useState } from 'react'
import { Search, Plus, Filter, Eye, Table2, LayoutGrid, List, X } from 'lucide-react'
import { TableToolbarProps, ViewMode, ActiveFilter } from './types'

const TableToolbar: React.FC<TableToolbarProps> = ({
  viewMode,
  onViewModeChange,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  showSearch = true,
  showViewToggle = true,
  showHideButton = true,
  showFilters = true,
  filters = [],
  activeFilters = [],
  onAddFilter,
  onRemoveFilter,
  onToggleColumnVisibility,
  children
}) => {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)

  const viewModeIcons = {
    table: Table2,
    board: LayoutGrid,
    list: List
  }

  const viewModeLabels = {
    table: 'Table',
    board: 'Board', 
    list: 'List'
  }

  const handleAddFilter = (filterConfig: any) => {
    // This would open a filter value selection dialog
    // For now, just close the dropdown
    setShowFilterDropdown(false)
    // onAddFilter?.(filterConfig, defaultValue)
  }

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
      {/* Left Side - View Toggle and Filters */}
      <div className="flex items-center space-x-4">
        {/* View Mode Toggle */}
        {showViewToggle && (
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {Object.entries(viewModeIcons).map(([mode, Icon]) => (
              <button
                key={mode}
                onClick={() => onViewModeChange(mode as ViewMode)}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === mode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{viewModeLabels[mode as ViewMode]}</span>
              </button>
            ))}
          </div>
        )}

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="flex items-center space-x-2">
            {activeFilters.map((filter) => (
              <div
                key={filter.key}
                className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm"
              >
                <span>{filter.label}: {filter.displayValue}</span>
                <button
                  onClick={() => onRemoveFilter?.(filter.key)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Filter Button */}
        {showFilters && (
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add filter</span>
            </button>

            {/* Filter Dropdown */}
            {showFilterDropdown && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-1">
                    Filter by...
                  </div>
                  {filters.map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => handleAddFilter(filter)}
                      className="w-full text-left px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center space-x-2"
                    >
                      <Filter className="w-4 h-4 text-gray-400" />
                      <span>{filter.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Custom Children */}
        {children}
      </div>

      {/* Right Side - Search and Hide */}
      <div className="flex items-center space-x-3">
        {/* Search */}
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
            />
          </div>
        )}

        {/* Hide Button */}
        {showHideButton && (
          <button
            onClick={onToggleColumnVisibility}
            className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span>Hide</span>
          </button>
        )}
      </div>

      {/* Click outside to close filter dropdown */}
      {showFilterDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowFilterDropdown(false)}
        />
      )}
    </div>
  )
}

export default TableToolbar
