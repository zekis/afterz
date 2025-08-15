import React from 'react'
import { TableProps } from './types'
import TableHeader from './TableHeader'
import TableBody from './TableBody'

const Table = <T,>({
  columns,
  data,
  selectedItems,
  onSelectItem,
  onSelectAll,
  sortBy,
  sortDirection,
  onSort,
  className = '',
  rowClassName,
  onRowClick,
  onRowContextMenu,
  getItemId = (item: any) => item.id || item.name
}: TableProps<T>) => {
  return (
    <div className={`w-full ${className}`}>
      <table className="w-full table-fixed divide-y divide-gray-200">
        <TableHeader
          columns={columns}
          selectedItems={selectedItems}
          onSelectAll={onSelectAll}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
          hasSelectColumn={!!onSelectItem}
          totalItems={data.length}
        />
        <TableBody
          columns={columns}
          data={data}
          selectedItems={selectedItems}
          onSelectItem={onSelectItem}
          rowClassName={rowClassName}
          onRowClick={onRowClick}
          onRowContextMenu={onRowContextMenu}
          getItemId={getItemId}
        />
      </table>
    </div>
  )
}

export default Table
