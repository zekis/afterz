import React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { GroupedTableProps, TableGroup } from './types'
import Table from './Table'

const GroupedTable = <T,>({
  groups,
  groupBy,
  collapsedGroups = new Set(),
  onToggleGroup,
  renderGroupHeader,
  ...tableProps
}: GroupedTableProps<T>) => {
  const defaultRenderGroupHeader = (group: TableGroup<T>) => (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          {collapsedGroups.has(group.key) ? (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
          <div className="w-3 h-3 rounded-full bg-gray-300" />
        </div>
        
        <div>
          <h3 className="font-medium text-gray-900">
            {group.label}
          </h3>
          <p className="text-xs text-gray-500">
            {group.count} item{group.count !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4 text-xs text-gray-500">
        {group.metadata && Object.entries(group.metadata).map(([key, value]) => (
          <span key={key} className="flex items-center space-x-1">
            <span>{key}: {value}</span>
          </span>
        ))}
      </div>
    </div>
  )

  if (groups.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <Table {...tableProps} data={[]} />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {groups.map((group, index) => {
        const isCollapsed = collapsedGroups.has(group.key)
        
        return (
          <div key={group.key} className={index > 0 ? 'border-t border-gray-200' : ''}>
            {/* Group Header */}
            <div
              className="px-6 py-4 bg-gray-50 cursor-pointer select-none hover:bg-gray-100 transition-colors"
              onClick={() => onToggleGroup?.(group.key)}
            >
              {renderGroupHeader ? renderGroupHeader(group) : defaultRenderGroupHeader(group)}
            </div>

            {/* Group Content */}
            {!isCollapsed && (
              <div className="border-t border-gray-100">
                <Table
                  {...tableProps}
                  data={group.items}
                  className="border-0 shadow-none"
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default GroupedTable
