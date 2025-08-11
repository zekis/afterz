export interface Project {
  name: string;
  project_name: string;
  customer?: string;
  status: 'Opportunity' | 'Estimate' | 'Open' | 'Archived';
  project_lead?: string;
  timesheet_approver?: string;
  division?: string;
  project_type?: string;
  start_date?: string;
  end_date?: string;
}

export interface Activity {
  name: string;
  activity_name: string;
  project: string;
  status: 'Estimate' | 'Open' | 'Complete' | 'Closed' | 'Cancelled';
  description?: string;
  due_date?: string;
  estimated_hours?: number;
  progress_percent?: number;
  // ToDo-based assignment fields
  todo_priority?: 'Low' | 'Medium' | 'High';
  todo_due_date?: string;
  todo_description?: string;
  assigned_by?: string;
}

export interface TimesheetEntry {
  name?: string;
  employee: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Processed' | 'Scheduled';
  is_active?: boolean;
  project: string;
  activity: string;
  location?: string;
  check_in_time: string;
  check_out_time?: string;
  duration_hours?: number;
  description?: string;
  notes?: string;
  approved_by?: string;
  approval_date?: string;
  approval_notes?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  project: string;
  activity: string;
  status: TimesheetEntry['status'];
  description?: string;
  duration?: number;
  notes?: string;
}

export interface TimeSlot {
  hour: number;
  day: number; // 0-6 (Sunday-Saturday)
  date: Date;
}

export interface WeekData {
  startDate: Date;
  endDate: Date;
  days: Date[];
}

export interface User {
  name: string;
  full_name: string;
  email: string;
  user_image?: string;
  submission_count?: number;
}

export interface ApprovalDashboardData {
  pending_count: number;
  projects: string[];
}

export interface UserProjectPermissions {
  can_approve: boolean;
  projects: Project[];
}

export interface FrappeResponse<T> {
  message: T;
}

export interface FrappeListResponse<T> {
  message: T[];
}

export interface ToDo {
  name: string;
  description: string;
  status: 'Backlog' | 'Planned' | 'Open' | 'Closed' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High';
  date?: string; // Due date
  allocated_to: string;
  assigned_by: string;
  assigned_by_full_name?: string;
  reference_type: string;
  reference_name: string;
  color?: string;
}

export interface ActivityAssignment {
  user: string;
  full_name: string;
  email: string;
  priority: 'Low' | 'Medium' | 'High';
  due_date?: string;
  status: 'Backlog' | 'Planned' | 'Open' | 'Closed' | 'Cancelled';
  assigned_by: string;
  assigned_by_full_name?: string;
}

export interface AssignmentRequest {
  activity_name: string;
  user_list: string[];
  priority?: 'Low' | 'Medium' | 'High';
  due_date?: string;
  notes?: string;
}

/* Before-Workz (Planner) types */
export interface PlannerEntry {
  name?: string;
  user: string;
  todo?: string;
  project?: string;
  title: string;
  notes?: string;
  status: 'Planned' | 'In Progress' | 'Completed' | 'Cancelled';
  plan_start: string; // ISO local datetime
  plan_end: string;   // ISO local datetime
}

export interface TodoLite {
  name: string;
  subject: string;
  project?: string;
  reference_type?: string;
  reference_name?: string;
  allocated_to?: string;
  priority?: 'Low' | 'Medium' | 'High';
  status?: string;
  creation?: string;
  modified?: string;
}
