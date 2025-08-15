import React from 'react'

export type ViewMode = 'table' | 'board' | 'list'

export type SortDirection = 'asc' | 'desc' | null

export interface TableColumn<T = any> {
  key: string
  label: string
  width?: string | number
  sortable?: boolean
  render?: (value: any, item: T) => React.ReactNode
  className?: string
  headerClassName?: string
}

export interface TableProps<T = any> {
  columns: TableColumn<T>[]
  data: T[]
  selectedItems?: Set<string>
  onSelectItem?: (itemId: string, selected: boolean) => void
  onSelectAll?: (selected: boolean) => void
  sortBy?: string
  sortDirection?: SortDirection
  onSort?: (column: string, direction: SortDirection) => void
  className?: string
  rowClassName?: string | ((item: T) => string)
  onRowClick?: (item: T) => void
  onRowContextMenu?: (item: T, event: React.MouseEvent) => void
  getItemId?: (item: T) => string
}

export interface GroupedTableProps<T = any> extends Omit<TableProps<T>, 'data'> {
  groups: TableGroup<T>[]
  groupBy: string
  collapsedGroups?: Set<string>
  onToggleGroup?: (groupKey: string) => void
  renderGroupHeader?: (group: TableGroup<T>) => React.ReactNode
}

export interface TableGroup<T = any> {
  key: string
  label: string
  items: T[]
  count: number
  metadata?: Record<string, any>
}

export type FilterType = 'text' | 'select' | 'multiselect' | 'date' | 'daterange' | 'user'

export interface FilterOption {
  label: string
  value: string
  icon?: React.ReactNode
}

export interface FilterConfig {
  key: string
  label: string
  type: FilterType
  options?: FilterOption[]
  placeholder?: string
  multiple?: boolean
}

export interface ActiveFilter {
  key: string
  label: string
  value: any
  displayValue: string
}

export interface TableToolbarProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  showSearch?: boolean
  showViewToggle?: boolean
  showHideButton?: boolean
  showFilters?: boolean
  filters?: FilterConfig[]
  activeFilters?: ActiveFilter[]
  onAddFilter?: (filter: FilterConfig, value: any) => void
  onRemoveFilter?: (filterKey: string) => void
  onToggleColumnVisibility?: () => void
  children?: React.ReactNode
}
