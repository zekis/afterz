import React from 'react'
import { TableColumn } from './types'

interface TableCellProps<T = any> {
  column: TableColumn<T>
  value: any
  item: T
}

const TableCell = <T,>({ column, value, item }: TableCellProps<T>) => {
  const content = column.render ? column.render(value, item) : value

  return (
    <td 
      className={`px-6 py-4 text-sm ${column.className || 'text-gray-900'}`}
      style={{ width: column.width }}
    >
      <div className="truncate overflow-hidden">
        {content}
      </div>
    </td>
  )
}

export default TableCell
