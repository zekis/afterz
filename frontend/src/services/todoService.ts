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
}
