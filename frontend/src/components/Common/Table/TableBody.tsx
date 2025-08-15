import React from 'react'
import { TableColumn } from './types'
import TableRow from './TableRow'

interface TableBodyProps<T = any> {
  columns: TableColumn<T>[]
  data: T[]
  selectedItems?: Set<string>
  onSelectItem?: (itemId: string, selected: boolean) => void
  rowClassName?: string | ((item: T) => string)
  onRowClick?: (item: T) => void
  onRowContextMenu?: (item: T, event: React.MouseEvent) => void
  getItemId: (item: T) => string
}

const TableBody = <T,>({
  columns,
  data,
  selectedItems,
  onSelectItem,
  rowClassName,
  onRowClick,
  onRowContextMenu,
  getItemId
}: TableBodyProps<T>) => {
  if (data.length === 0) {
    return (
      <tbody>
        <tr>
          <td 
            colSpan={columns.length + (onSelectItem ? 1 : 0)} 
            className="px-6 py-12 text-center text-gray-500"
          >
            <div className="flex flex-col items-center space-y-2">
              <div className="text-gray-400">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium">No data found</p>
              <p className="text-xs text-gray-400">Try adjusting your filters or search terms</p>
            </div>
          </td>
        </tr>
      </tbody>
    )
  }

  return (
    <tbody className="bg-white divide-y divide-gray-200">
      {data.map((item, index) => {
        const itemId = getItemId(item)
        const isSelected = selectedItems?.has(itemId) || false
        const className = typeof rowClassName === 'function' ? rowClassName(item) : rowClassName

        return (
          <TableRow
            key={itemId}
            item={item}
            columns={columns}
            isSelected={isSelected}
            onSelectItem={onSelectItem}
            onRowClick={onRowClick}
            onRowContextMenu={onRowContextMenu}
            className={className}
            itemId={itemId}
          />
        )
      })}
    </tbody>
  )
}

export default TableBody
