export interface Project {
  name: string;
  project_name: string;
  customer?: string;
  status: 'Active' | 'On Hold' | 'Completed' | 'Cancelled';
  project_manager?: string;
  division?: string;
  work_type?: string;
  start_date?: string;
  end_date?: string;
}

export interface Activity {
  name: string;
  subject: string;
  project: string;
  status: 'Open' | 'In Progress' | 'Review' | 'Completed' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  location?: string;
  description?: string;
  assigned_to?: string;
  due_date?: string;
  estimated_hours?: number;
  progress_percent?: number;
}

export interface TimesheetEntry {
  name?: string;
  employee: string;
  date: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Scheduled' | 'Paid';
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
}

export interface FrappeResponse<T> {
  message: T;
}

export interface FrappeListResponse<T> {
  message: T[];
}
