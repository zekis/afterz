import React from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { TableColumn, SortDirection } from './types'

interface TableHeaderProps<T = any> {
  columns: TableColumn<T>[]
  selectedItems?: Set<string>
  onSelectAll?: (selected: boolean) => void
  sortBy?: string
  sortDirection?: SortDirection
  onSort?: (column: string, direction: SortDirection) => void
  hasSelectColumn: boolean
  totalItems: number
}

const TableHeader = <T,>({
  columns,
  selectedItems,
  onSelectAll,
  sortBy,
  sortDirection,
  onSort,
  hasSelectColumn,
  totalItems
}: TableHeaderProps<T>) => {
  const handleSort = (column: TableColumn<T>) => {
    if (!column.sortable || !onSort) return

    let newDirection: SortDirection = 'asc'
    if (sortBy === column.key) {
      if (sortDirection === 'asc') {
        newDirection = 'desc'
      } else if (sortDirection === 'desc') {
        newDirection = null
      }
    }
    onSort(column.key, newDirection)
  }

  const getSortIcon = (column: TableColumn<T>) => {
    if (!column.sortable || sortBy !== column.key) return null
    
    if (sortDirection === 'asc') {
      return <ChevronUp className="w-4 h-4" />
    } else if (sortDirection === 'desc') {
      return <ChevronDown className="w-4 h-4" />
    }
    return null
  }

  const isAllSelected = selectedItems && totalItems > 0 && selectedItems.size === totalItems
  const isIndeterminate = selectedItems && selectedItems.size > 0 && selectedItems.size < totalItems

  return (
    <thead className="bg-gray-50">
      <tr>
        {/* Selection Column */}
        {hasSelectColumn && (
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={(input) => {
                if (input) input.indeterminate = !!isIndeterminate
              }}
              onChange={(e) => onSelectAll?.(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </th>
        )}

        {/* Data Columns */}
        {columns.map((column) => (
          <th
            key={column.key}
            className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
              column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
            } ${column.headerClassName || ''}`}
            style={{ width: column.width }}
            onClick={() => handleSort(column)}
          >
            <div className="flex items-center space-x-1">
              <span>{column.label}</span>
              {getSortIcon(column)}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  )
}

export default TableHeader
