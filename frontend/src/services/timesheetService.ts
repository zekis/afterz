import { FrappeAPI } from './api'
import { TimesheetEntry, Project, Activity, User } from '../types'
import { formatDate, formatDateTime } from '../lib/utils'

export class TimesheetService {
  // Get timesheet entries for a date range
  static async getTimesheetEntries(
    startDate: Date,
    endDate: Date,
    employee?: string
  ): Promise<TimesheetEntry[]> {
    const response = await FrappeAPI.post<TimesheetEntry[]>('afterz.api.get_timesheet_entries', {
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      employee: employee
    })

    return response.message
  }

  // Create a new timesheet entry
  static async createTimesheetEntry(entry: Partial<TimesheetEntry>): Promise<TimesheetEntry> {
    const response = await FrappeAPI.post<any>('afterz.api.create_timesheet_entry', entry)
    
    if (!response.message.success) {
      throw new Error(response.message.error || 'Failed to create timesheet entry')
    }
    
    // Return the created entry by fetching it
    return this.getTimesheetEntry(response.message.name)
  }

  // Update an existing timesheet entry
  static async updateTimesheetEntry(
    name: string,
    updates: Partial<TimesheetEntry>
  ): Promise<TimesheetEntry> {
    // Prepare the data with name as a separate parameter
    const data = {
      name: name,
      ...updates
    }
    
    const response = await FrappeAPI.post<any>('afterz.api.update_timesheet_entry', data)
    
    if (!response.message.success) {
      throw new Error(response.message.error || 'Failed to update timesheet entry')
    }
    
    // Return the updated entry by fetching it
    return this.getTimesheetEntry(name)
  }

  // Delete a timesheet entry
  static async deleteTimesheetEntry(name: string): Promise<void> {
    const response = await FrappeAPI.post<any>('afterz.api.delete_timesheet_entry', { name })
    
    if (!response.message.success) {
      throw new Error(response.message.error || 'Failed to delete timesheet entry')
    }
  }

  // Get a specific timesheet entry
  static async getTimesheetEntry(name: string): Promise<TimesheetEntry> {
    const response = await FrappeAPI.getDoc<TimesheetEntry>('Timesheet Entry', name)
    return response.message
  }


  // Submit timesheet entries for approval
  static async submitEntries(names: string[]): Promise<void> {
    for (const name of names) {
      await this.updateTimesheetEntry(name, { status: 'Submitted' })
    }
  }

  // Submit all entries for a week
  static async submitWeekEntries(employee: string, startDate: Date, endDate: Date): Promise<any> {
    const response = await FrappeAPI.post<any>('afterz.api.submit_week_entries', {
      employee: employee,
      start_date: formatDate(startDate),
      end_date: formatDate(endDate)
    })
    return response.message
  }

  // Approve timesheet entries (manager function)
  static async approveEntries(names: string[], approvalNotes?: string): Promise<void> {
    const updates: Partial<TimesheetEntry> = {
      status: 'Approved',
      approved_by: window.frappe_boot?.user.name || '',
      approval_date: formatDateTime(new Date()),
      approval_notes: approvalNotes
    }

    for (const name of names) {
      await this.updateTimesheetEntry(name, updates)
    }
  }

  // Approve all entries for a week
  static async approveAllEntries(employee: string, startDate: Date, endDate: Date, approvalNotes?: string): Promise<any> {
    const response = await FrappeAPI.post<any>('afterz.api.approve_all_entries', {
      employee: employee,
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      approval_notes: approvalNotes
    })
    return response.message
  }

  // Reject timesheet entries (manager function)
  static async rejectEntries(names: string[], rejectionNotes: string): Promise<void> {
    const updates: Partial<TimesheetEntry> = {
      status: 'Rejected',
      approved_by: window.frappe_boot?.user.name || '',
      approval_date: formatDateTime(new Date()),
      approval_notes: rejectionNotes
    }

    for (const name of names) {
      await this.updateTimesheetEntry(name, updates)
    }
  }

  // Reject single entry with reason
  static async rejectEntryWithReason(name: string, rejectionReason: string): Promise<any> {
    const response = await FrappeAPI.post<any>('afterz.api.reject_entry_with_reason', {
      name: name,
      rejection_reason: rejectionReason
    })
    return response.message
  }

  // Un-approve an approved entry back to draft
  static async unapproveEntry(name: string): Promise<any> {
    const response = await FrappeAPI.post<any>('afterz.api.unapprove_entry', {
      name: name
    })
    return response.message
  }

  // Get approval dashboard data
  static async getApprovalDashboardData(): Promise<any> {
    const response = await FrappeAPI.post<any>('afterz.api.get_approval_dashboard_data', {})
    return response.message
  }

  // Get detailed approval dashboard data for managers
  static async getDetailedApprovalDashboard(weeksBack: number = 4): Promise<any> {
    const response = await FrappeAPI.post<any>('afterz.api.get_approval_dashboard_data', {
      weeks_back: weeksBack
    })
    return response.message
  }

  // Get users with submission counts
  static async getUsersWithSubmissionCounts(startDate: Date, endDate: Date): Promise<User[]> {
    const response = await FrappeAPI.post<User[]>('afterz.api.get_users_with_submission_counts', {
      start_date: formatDate(startDate),
      end_date: formatDate(endDate)
    })
    return response.message
  }
}

export class ProjectService {
  // Get all active projects
  static async getActiveProjects(): Promise<Project[]> {
    const response = await FrappeAPI.getList<Project>(
      'Project',
      ['name', 'project_name', 'customer', 'status', 'project_manager', 'division', 'work_type', 'timesheet_approver'],
      { status: 'Active' },
      'project_name asc'
    )

    console.log('ProjectService.getActiveProjects loaded:', response.message)
    return response.message
  }

  // Get projects for a specific user
  static async getUserProjects(user: string): Promise<Project[]> {
    const response = await FrappeAPI.getList<Project>(
      'Project',
      ['name', 'project_name', 'customer', 'status', 'project_manager', 'division', 'work_type'],
      { 
        status: 'Active',
        project_manager: user
      },
      'project_name asc'
    )

    return response.message
  }
}

export class ActivityService {
  // Get activities for a specific project
  static async getActivitiesByProject(projectName: string): Promise<Activity[]> {
    const response = await FrappeAPI.getList<Activity>(
      'Activity',
      [
        'name', 'subject', 'project', 'status', 'priority', 
        'location', 'description', 'assigned_to', 'estimated_hours'
      ],
      { 
        project: projectName,
        status: ['in', ['Open', 'In Progress']]
      },
      'subject asc'
    )

    return response.message
  }

  // Get all active activities
  static async getActiveActivities(): Promise<Activity[]> {
    const response = await FrappeAPI.getList<Activity>(
      'Activity',
      [
        'name', 'subject', 'project', 'status', 'priority', 
        'location', 'description', 'assigned_to', 'estimated_hours'
      ],
      { status: ['in', ['Open', 'In Progress']] },
      'subject asc'
    )

    return response.message
  }

  // Get activities assigned to a specific user via ToDo system
  static async getUserActivities(user: string): Promise<Activity[]> {
    const response = await FrappeAPI.post<Activity[]>('afterz.api.get_user_assigned_activities', {
      user: user
    })

    return response.message
  }

  // Get activities that can be assigned by project manager
  static async getAssignableActivities(projectManager?: string): Promise<Activity[]> {
    const response = await FrappeAPI.post<Activity[]>('afterz.api.get_assignable_activities', {
      project_manager: projectManager
    })

    return response.message
  }

  // Assign activity to multiple users
  static async assignActivityToUsers(
    activityName: string,
    userList: string[],
    priority: 'Low' | 'Medium' | 'High' = 'Medium',
    dueDate?: string,
    notes?: string
  ): Promise<any> {
    const response = await FrappeAPI.post<any>('afterz.api.assign_activity_to_users', {
      activity_name: activityName,
      user_list: JSON.stringify(userList),
      priority: priority,
      due_date: dueDate,
      notes: notes
    })

    return response.message
  }

  // Get activity assignments
  static async getActivityAssignments(activityName: string): Promise<any[]> {
    const response = await FrappeAPI.post<any[]>('afterz.api.get_activity_assignments', {
      activity_name: activityName
    })

    return response.message
  }

  // Remove activity assignment
  static async removeActivityAssignment(activityName: string, user: string): Promise<any> {
    const response = await FrappeAPI.post<any>('afterz.api.remove_activity_assignment', {
      activity_name: activityName,
      user: user
    })

    return response.message
  }
}

export class UserService {
  // Get all users with Projects User role
  static async getProjectUsers(): Promise<User[]> {
    // This would need a custom API endpoint in Frappe to get users by role
    // For now, we'll use a basic user list
    const response = await FrappeAPI.getList<User>(
      'User',
      ['name', 'full_name', 'email', 'user_image'],
      { enabled: 1 },
      'full_name asc'
    )

    return response.message
  }

  // Get current user info
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

  // Get user project permissions
  static async getUserProjectPermissions(user?: string): Promise<any> {
    const response = await FrappeAPI.post<any>('afterz.api.get_user_project_permissions', {
      user: user
    })
    return response.message
  }
}
