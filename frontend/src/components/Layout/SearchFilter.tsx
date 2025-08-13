import React from 'react'
import { Search } from 'lucide-react'

interface SearchFilterProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filters?: Array<{
    label: string
    value: string
    options: Array<{ label: string; value: string; count?: number }>
    onChange: (value: string) => void
  }>
  className?: string
}

const SearchFilter: React.FC<SearchFilterProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  className = ''
}) => {
  return (
    <div className={`flex flex-col sm:flex-row gap-4 items-start sm:items-center ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
        />
      </div>

      {/* Filter Dropdowns */}
      {filters.map((filter, index) => (
        <select
          key={index}
          value={filter.value}
          onChange={(e) => filter.onChange(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
        >
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
              {option.count !== undefined && ` (${option.count})`}
            </option>
          ))}
        </select>
      ))}
    </div>
  )
}

export default SearchFilter
