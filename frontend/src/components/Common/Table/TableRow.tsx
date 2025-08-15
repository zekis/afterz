import React from 'react'
import { TableColumn } from './types'
import TableCell from './TableCell'

interface TableRowProps<T = any> {
  item: T
  columns: TableColumn<T>[]
  isSelected: boolean
  onSelectItem?: (itemId: string, selected: boolean) => void
  onRowClick?: (item: T) => void
  onRowContextMenu?: (item: T, event: React.MouseEvent) => void
  className?: string
  itemId: string
}

const TableRow = <T,>({
  item,
  columns,
  isSelected,
  onSelectItem,
  onRowClick,
  onRowContextMenu,
  className = '',
  itemId
}: TableRowProps<T>) => {
  const handleRowClick = (e: React.MouseEvent) => {
    // Don't trigger row click if clicking on checkbox or other interactive elements
    if ((e.target as HTMLElement).closest('input, button, a')) {
      return
    }
    onRowClick?.(item)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    if (onRowContextMenu) {
      onRowContextMenu(item, e)
    }
  }

  const baseClassName = `hover:bg-gray-50 transition-colors ${
    isSelected ? 'bg-blue-50' : ''
  } ${onRowClick ? 'cursor-pointer' : ''} ${className}`

  return (
    <tr 
      className={baseClassName} 
      onClick={handleRowClick}
      onContextMenu={handleContextMenu}
    >
      {/* Selection Column */}
      {onSelectItem && (
        <td className="px-6 py-4 whitespace-nowrap w-12">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelectItem(itemId, e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            onClick={(e) => e.stopPropagation()}
          />
        </td>
      )}

      {/* Data Columns */}
      {columns.map((column) => {
        const value = (item as any)[column.key]
        return (
          <TableCell
            key={column.key}
            column={column}
            value={value}
            item={item}
          />
        )
      })}
    </tr>
  )
}

export default TableRow
