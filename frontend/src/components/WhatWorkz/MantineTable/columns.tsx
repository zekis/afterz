import React from 'react'
import { DataTableColumn } from 'mantine-datatable'
import { ExtendedTodo } from './types'
import {
  PriorityRenderer,
  StatusRenderer,
  SubjectRenderer,
  AssigneeRenderer,
  CreatorRenderer,
  ProjectRenderer,
  CreatedRenderer,
  ActionsRenderer
} from './renderers'

// Define the columns for the Mantine DataTable
export const createTodoColumns = ({
  onUpdateTodo,
  onCompleteTodo,
  onEditTodo,
  onAssignTodo
}: {
  onUpdateTodo: (todoName: string, updates: Partial<ExtendedTodo>) => void
  onCompleteTodo?: (todoName: string) => void
  onEditTodo?: (todo: ExtendedTodo) => void
  onAssignTodo?: (todo: ExtendedTodo) => void
}): DataTableColumn<ExtendedTodo>[] => [
  {
    accessor: 'subject',
    title: 'Todo',
    sortable: true,
    width: '35%',
    render: (todo) => <SubjectRenderer todo={todo} />
  },
  {
    accessor: 'priority',
    title: 'Priority',
    sortable: true,
    width: '10%',
    textAlign: 'center',
    render: (todo) => <PriorityRenderer todo={todo} />
  },
  {
    accessor: 'status',
    title: 'Status',
    sortable: true,
    width: '12%',
    textAlign: 'center',
    render: (todo) => <StatusRenderer todo={todo} />
  },
  {
    accessor: 'allocated_to',
    title: 'Assignee',
    sortable: true,
    width: '18%',
    render: (todo) => <AssigneeRenderer todo={todo} />
  },
  {
    accessor: 'project',
    title: 'Project',
    sortable: true,
    width: '15%',
    render: (todo) => <ProjectRenderer todo={todo} />
  },
  {
    accessor: 'owner',
    title: 'Creator',
    sortable: true,
    width: '15%',
    render: (todo) => <CreatorRenderer todo={todo} />
  },
  {
    accessor: 'creation',
    title: 'Created',
    sortable: true,
    width: '12%',
    render: (todo) => <CreatedRenderer todo={todo} />
  },
  {
    accessor: 'actions',
    title: 'Actions',
    width: '15%',
    textAlign: 'center',
    render: (todo) => (
      <ActionsRenderer
        todo={todo}
        onUpdateTodo={onUpdateTodo}
        onCompleteTodo={onCompleteTodo}
        onEditTodo={onEditTodo}
        onAssignTodo={onAssignTodo}
      />
    )
  }
]

// Column definitions for different layouts
export const compactColumns = ({
  onUpdateTodo,
  onCompleteTodo,
  onEditTodo,
  onAssignTodo
}: {
  onUpdateTodo: (todoName: string, updates: Partial<ExtendedTodo>) => void
  onCompleteTodo?: (todoName: string) => void
  onEditTodo?: (todo: ExtendedTodo) => void
  onAssignTodo?: (todo: ExtendedTodo) => void
}): DataTableColumn<ExtendedTodo>[] => [
  {
    accessor: 'subject',
    title: 'Todo',
    sortable: true,
    width: '45%',
    render: (todo) => <SubjectRenderer todo={todo} />
  },
  {
    accessor: 'priority',
    title: 'P',
    sortable: true,
    width: '8%',
    textAlign: 'center',
    render: (todo) => <PriorityRenderer todo={todo} />
  },
  {
    accessor: 'status',
    title: 'Status',
    sortable: true,
    width: '15%',
    textAlign: 'center',
    render: (todo) => <StatusRenderer todo={todo} />
  },
  {
    accessor: 'allocated_to',
    title: 'Assignee',
    sortable: true,
    width: '20%',
    render: (todo) => <AssigneeRenderer todo={todo} />
  },
  {
    accessor: 'actions',
    title: 'Actions',
    width: '12%',
    textAlign: 'center',
    render: (todo) => (
      <ActionsRenderer
        todo={todo}
        onUpdateTodo={onUpdateTodo}
        onCompleteTodo={onCompleteTodo}
        onEditTodo={onEditTodo}
        onAssignTodo={onAssignTodo}
      />
    )
  }
]
