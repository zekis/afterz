import { FrappeAPI } from './api'
import { TodoLite } from '../types'

export class TodoService {
  static async createTodo(subject: string, project?: string, user?: string): Promise<{ success: boolean; name?: string; error?: string }> {
    try {
      const todoData: any = {
        description: subject,
        status: 'Open',
        priority: 'Medium',
        allocated_to: user || 'Administrator'
      }

      if (project) {
        todoData.reference_type = 'Project'
        todoData.reference_name = project
      }

      const res = await FrappeAPI.post<any>('frappe.client.insert', {
        doc: {
          doctype: 'ToDo',
          ...todoData
        }
      })

      return {
        success: true,
        name: res.message?.name
      }
    } catch (error: any) {
      console.error('Create todo failed:', error)
      return {
        success: false,
        error: error.message || 'Failed to create todo'
      }
    }
  }

  static async assignTodo(todoName: string, newUser: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await FrappeAPI.post<any>('frappe.client.set_value', {
        doctype: 'ToDo',
        name: todoName,
        fieldname: 'allocated_to',
        value: newUser
      })

      return { success: true }
    } catch (error: any) {
      console.error('Assign todo failed:', error)
      return {
        success: false,
        error: error.message || 'Failed to assign todo'
      }
    }
  }

  static async completeTodo(todoName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await FrappeAPI.post<any>('frappe.client.set_value', {
        doctype: 'ToDo',
        name: todoName,
        fieldname: 'status',
        value: 'Closed'
      })

      return { success: true }
    } catch (error: any) {
      console.error('Complete todo failed:', error)
      return {
        success: false,
        error: error.message || 'Failed to complete todo'
      }
    }
  }

  static async cancelTodo(todoName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await FrappeAPI.post<any>('frappe.client.set_value', {
        doctype: 'ToDo',
        name: todoName,
        fieldname: 'status',
        value: 'Cancelled'
      })

      return { success: true }
    } catch (error: any) {
      console.error('Cancel todo failed:', error)
      return {
        success: false,
        error: error.message || 'Failed to cancel todo'
      }
    }
  }

  static async getAllTodos(): Promise<TodoLite[]> {
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0]
      
      // Get active todos (Open, Working, Planned, Backlog)
      const activeRes = await FrappeAPI.post<any>('frappe.client.get_list', {
        doctype: 'ToDo',
        fields: [
          'name',
          'description as subject',
          'reference_name as project',
          'reference_type',
          'allocated_to',
          'priority',
          'status',
          'creation',
          'modified',
          'owner'
        ],
        filters: [['status', 'in', ['Open', 'Working', 'Planned', 'Backlog']]],
        order_by: 'creation desc',
        limit_page_length: 1000
      })

      // Get today's completed and cancelled todos
      const completedRes = await FrappeAPI.post<any>('frappe.client.get_list', {
        doctype: 'ToDo',
        fields: [
          'name',
          'description as subject',
          'reference_name as project',
          'reference_type',
          'allocated_to',
          'priority',
          'status',
          'creation',
          'modified',
          'owner'
        ],
        filters: [
          ['status', 'in', ['Closed', 'Cancelled']],
          ['modified', '>=', today + ' 00:00:00']
        ],
        order_by: 'modified desc',
        limit_page_length: 100
      })

      // Combine both results
      const activeTodos = activeRes.message || []
      const completedTodos = completedRes.message || []
      
      return [...activeTodos, ...completedTodos]
    } catch (error: any) {
      console.error('Get all todos failed:', error)
      return []
    }
  }

  static async updateTodo(todoName: string, updates: Partial<TodoLite>): Promise<{ success: boolean; error?: string }> {
    try {
      // Convert TodoLite fields to Frappe ToDo fields
      const frappeUpdates: any = {}
      
      if (updates.subject !== undefined) {
        frappeUpdates.description = updates.subject
      }
      if (updates.status !== undefined) {
        frappeUpdates.status = updates.status
      }
      if (updates.priority !== undefined) {
        frappeUpdates.priority = updates.priority
      }
      if (updates.allocated_to !== undefined) {
        frappeUpdates.allocated_to = updates.allocated_to
      }
      if (updates.project !== undefined) {
        frappeUpdates.reference_name = updates.project
        frappeUpdates.reference_type = updates.project ? 'Project' : null
      }

      // Update multiple fields at once
      const res = await FrappeAPI.post<any>('frappe.client.save', {
        doc: {
          doctype: 'ToDo',
          name: todoName,
          ...frappeUpdates
        }
      })

      return { success: true }
    } catch (error: any) {
      console.error('Update todo failed:', error)
      return {
        success: false,
        error: error.message || 'Failed to update todo'
      }
    }
  }

  static async deleteTodo(todoName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await FrappeAPI.post<any>('frappe.client.delete', {
        doctype: 'ToDo',
        name: todoName
      })

      return { success: true }
    } catch (error: any) {
      console.error('Delete todo failed:', error)
      return {
        success: false,
        error: error.message || 'Failed to delete todo'
      }
    }
  }
}
