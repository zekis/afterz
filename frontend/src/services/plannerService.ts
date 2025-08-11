import { FrappeAPI } from './api'
import { PlannerEntry, TodoLite, User } from '../types'
import { formatDate } from '../lib/utils'

export class PlannerService {
  // Fetch planner entries for a date range (plan_start is the source of truth)
  static async getPlannerEntries(startDate: Date, endDate: Date, user?: string): Promise<PlannerEntry[]> {
    const res = await FrappeAPI.post<PlannerEntry[]>('afterz.api.get_planner_entries', {
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      user
    })
    return res.message || []
  }

  static async createPlannerEntry(entry: Partial<PlannerEntry>): Promise<{ success: boolean; name?: string; error?: string }> {
    const res = await FrappeAPI.post<any>('afterz.api.create_planner_entry', entry)
    return res.message
  }

  static async updatePlannerEntry(name: string, updates: Partial<PlannerEntry>): Promise<{ success: boolean; error?: string }> {
    const res = await FrappeAPI.post<any>('afterz.api.update_planner_entry', {
      name,
      ...updates
    })
    return res.message
  }

  static async deletePlannerEntry(name: string): Promise<{ success: boolean; error?: string }> {
    const res = await FrappeAPI.post<any>('afterz.api.delete_planner_entry', { name })
    return res.message
  }

  static async completeEntry(name: string): Promise<{ success: boolean; error?: string }> {
    const res = await FrappeAPI.post<any>('afterz.api.complete_planner_entry', { name })
    return res.message
  }

  static async cancelEntry(name: string): Promise<{ success: boolean; error?: string }> {
    const res = await FrappeAPI.post<any>('afterz.api.cancel_planner_entry', { name })
    return res.message
  }

  static async getUserTodos(user?: string): Promise<TodoLite[]> {
    const res = await FrappeAPI.post<TodoLite[]>('afterz.api.get_user_todos', { user })
    return res.message || []
  }
}

// Convenience accessor
export class PlannerUserService {
  static getCurrentUser(): User | null {
    if (window.frappe_boot?.user) {
      return {
        name: window.frappe_boot.user.name,
        full_name: window.frappe_boot.user.full_name,
        email: window.frappe_boot.user.email,
        user_image: window.frappe_boot.user.user_image
      }
    }
    return null
  }
}
