import { ExtendedTodo } from '../../../types'

// Re-export the main todo interface
export type { ExtendedTodo }

// Group by options for the Mantine table
export type GroupBy = 'status' | 'priority' | 'assignee' | 'project' | 'due_date' | 'owner' | 'reference_type'

// Props interface for the Mantine Todo Table
export interface MantineTodoTableProps {
  todos: ExtendedTodo[]
  groupBy: GroupBy
  selectedTodos: Set<string>
  onSelectTodo: (todoName: string, selected: boolean) => void
  onUpdateTodo: (todoName: string, updates: Partial<ExtendedTodo>) => void
  onCompleteTodo?: (todoName: string) => void
  onCancelTodo?: (todoName: string) => void
  onDeleteTodo: (todoName: string) => void
  onEditTodo?: (todo: ExtendedTodo) => void
  onAssignTodo?: (todo: ExtendedTodo) => void
  onTodoClick?: (todo: ExtendedTodo) => void
  onCreateTodo?: (todoData: Partial<ExtendedTodo>) => Promise<void>
  searchTerm: string
  onSearchChange: (value: string) => void
}

// Column configuration for Mantine DataTable
export interface TodoColumn {
  accessor: keyof ExtendedTodo | string
  title: string
  sortable?: boolean
  width?: number | string
  render?: (record: ExtendedTodo) => React.ReactNode
  filter?: boolean
  filterFn?: (record: ExtendedTodo, filterValue: string) => boolean
}

// Action button configuration
export interface TodoAction {
  icon: React.ReactNode
  label: string
  onClick: (todo: ExtendedTodo) => void
  color?: string
  variant?: 'filled' | 'light' | 'outline' | 'subtle'
  disabled?: (todo: ExtendedTodo) => boolean
  visible?: (todo: ExtendedTodo) => boolean
}
