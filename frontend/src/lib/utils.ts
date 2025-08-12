import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getWeekData(date: Date) {
  const startDate = startOfWeek(date, { weekStartsOn: 1 }) // Monday start
  const endDate = endOfWeek(date, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: startDate, end: endDate })
  
  return {
    startDate,
    endDate,
    days
  }
}

export function getNextWeek(date: Date) {
  return addWeeks(date, 1)
}

export function getPreviousWeek(date: Date) {
  return subWeeks(date, 1)
}

export function formatWeekRange(startDate: Date, endDate: Date) {
  return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`
}

export function formatTime(date: Date) {
  return format(date, 'HH:mm')
}

export function formatDate(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

export function formatDateTime(date: Date) {
  // Always send UTC ISO string to backend for proper timezone handling
  return date.toISOString()
}

export function parseDateTime(dateTimeString: string): Date {
  return new Date(dateTimeString)
}

export function createLocalDateTime(date: Date, hour: number, minute: number = 0): Date {
  // Create a new date in the user's local timezone
  const localDate = new Date(date)
  localDate.setHours(hour, minute, 0, 0)
  return localDate
}

export function formatDateTimeForBackend(date: Date): string {
  // Format as local datetime string for backend (no timezone conversion)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

export function getTimeSlots(startHour: number = 6, endHour: number = 18) {
  const slots = []
  for (let hour = startHour; hour <= endHour; hour++) {
    slots.push(hour)
  }
  return slots
}

export function calculateDuration(startTime: Date, endTime: Date): number {
  const diffMs = endTime.getTime() - startTime.getTime()
  return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100 // Round to 2 decimal places
}

export function createTimeSlotId(day: number, hour: number): string {
  return `slot-${day}-${hour}`
}

export function parseTimeSlotId(slotId: string): { day: number; hour: number } | null {
  const match = slotId.match(/^slot-(\d+)-(\d+)$/)
  if (match) {
    return {
      day: parseInt(match[1]),
      hour: parseInt(match[2])
    }
  }
  return null
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'Draft':
      return 'bg-gray-100 border-gray-300 text-gray-700'
    case 'Submitted':
      return 'bg-blue-100 border-blue-300 text-blue-700'
    case 'Approved':
      return 'bg-green-100 border-green-300 text-green-700'
    case 'Rejected':
      return 'bg-red-100 border-red-300 text-red-700'
    case 'Scheduled':
      return 'bg-yellow-100 border-yellow-300 text-yellow-700'
    case 'Processed':
      return 'bg-purple-100 border-purple-300 text-purple-700'
    default:
      return 'bg-gray-100 border-gray-300 text-gray-700'
  }
}

export function getStatusDisplayText(status: string): string {
  switch (status) {
    case 'Draft':
      return 'Draft'
    case 'Submitted':
      return 'Submitted'
    case 'Approved':
      return 'Approved'
    case 'Rejected':
      return 'Rejected'
    case 'Scheduled':
      return 'Scheduled'
    case 'Processed':
      return '$ Processed'
    default:
      return status
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'Low':
      return 'bg-green-100 text-green-800'
    case 'Medium':
      return 'bg-yellow-100 text-yellow-800'
    case 'High':
      return 'bg-orange-100 text-orange-800'
    case 'Urgent':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// Overlap detection utilities
export function checkTimeOverlap(
  start1: Date, 
  end1: Date, 
  start2: Date, 
  end2: Date
): boolean {
  // Two time ranges overlap if one starts before the other ends
  return start1 < end2 && start2 < end1
}

export function findOverlappingEntries(
  entries: any[], 
  targetStart: Date, 
  targetEnd: Date, 
  excludeId?: string
): any[] {
  return entries.filter(entry => {
    // Skip the entry we're currently moving/resizing
    if (excludeId && entry.name === excludeId) {
      return false
    }
    
    const entryStart = parseDateTime(entry.check_in_time)
    const entryEnd = entry.check_out_time 
      ? parseDateTime(entry.check_out_time)
      : new Date(entryStart.getTime() + (entry.duration_hours || 1) * 60 * 60 * 1000)
    
    return checkTimeOverlap(targetStart, targetEnd, entryStart, entryEnd)
  })
}

export function isTimeSlotAvailable(
  entries: any[],
  targetDate: Date,
  targetHour: number,
  durationHours: number = 1,
  excludeId?: string
): boolean {
  const targetStart = createLocalDateTime(targetDate, targetHour, 0)
  const targetEnd = new Date(targetStart.getTime() + durationHours * 60 * 60 * 1000)
  
  const overlapping = findOverlappingEntries(entries, targetStart, targetEnd, excludeId)
  return overlapping.length === 0
}

// Activity color utilities - using left border highlights with light gray backgrounds
const ACTIVITY_COLORS = [
  { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-900', leftBorder: 'border-l-blue-500', leftBorderThick: 'border-l-4' },
  { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-900', leftBorder: 'border-l-green-500', leftBorderThick: 'border-l-4' },
  { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-900', leftBorder: 'border-l-purple-500', leftBorderThick: 'border-l-4' },
  { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-900', leftBorder: 'border-l-pink-500', leftBorderThick: 'border-l-4' },
  { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-900', leftBorder: 'border-l-yellow-500', leftBorderThick: 'border-l-4' },
  { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-900', leftBorder: 'border-l-indigo-500', leftBorderThick: 'border-l-4' },
  { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-900', leftBorder: 'border-l-red-500', leftBorderThick: 'border-l-4' },
  { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-900', leftBorder: 'border-l-orange-500', leftBorderThick: 'border-l-4' },
  { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-900', leftBorder: 'border-l-teal-500', leftBorderThick: 'border-l-4' },
  { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-900', leftBorder: 'border-l-cyan-500', leftBorderThick: 'border-l-4' },
]

export function getActivityColor(activityName: string) {
  // Use a simple hash function to consistently assign colors based on activity name
  let hash = 0
  for (let i = 0; i < activityName.length; i++) {
    const char = activityName.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  const colorIndex = Math.abs(hash) % ACTIVITY_COLORS.length
  return ACTIVITY_COLORS[colorIndex]
}

// Planner entry overlap detection and stacking utilities
export function checkPlannerTimeOverlap(
  start1: Date, 
  end1: Date, 
  start2: Date, 
  end2: Date
): boolean {
  // Two time ranges overlap if one starts before the other ends
  return start1 < end2 && start2 < end1
}

export function findOverlappingPlannerEntries(
  entries: any[], 
  targetEntry: any
): any[] {
  const targetStart = new Date(targetEntry.start)
  const targetEnd = targetEntry.end ? new Date(targetEntry.end) : new Date(targetStart.getTime() + (targetEntry.duration || 1) * 60 * 60 * 1000)
  
  return entries.filter(entry => {
    // Skip the target entry itself
    if (entry.id === targetEntry.id) {
      return false
    }
    
    const entryStart = new Date(entry.start)
    const entryEnd = entry.end ? new Date(entry.end) : new Date(entryStart.getTime() + (entry.duration || 1) * 60 * 60 * 1000)
    
    return checkPlannerTimeOverlap(targetStart, targetEnd, entryStart, entryEnd)
  })
}

export function calculateHorizontalStacking(
  entry: any,
  allEntries: any[]
): { width: number; leftOffset: number; totalColumns: number } {
  // Find all entries that overlap with this entry
  const overlappingEntries = findOverlappingPlannerEntries(allEntries, entry)
  
  if (overlappingEntries.length === 0) {
    return {
      width: 80, // 80% width percentage for single entries
      leftOffset: 0,
      totalColumns: 1
    }
  }
  
  // Create the full group including this entry
  const groupEntries = [entry, ...overlappingEntries]
  
  // Sort by start time for consistent ordering, then by ID for stability
  groupEntries.sort((a, b) => {
    const timeA = new Date(a.start).getTime()
    const timeB = new Date(b.start).getTime()
    if (timeA !== timeB) {
      return timeA - timeB
    }
    // If same start time, sort by ID for consistent ordering
    return a.id.localeCompare(b.id)
  })
  
  const totalColumns = groupEntries.length
  const columnIndex = groupEntries.findIndex(e => e.id === entry.id)
  
  const width = Math.floor(80 / totalColumns) // Width as percentage (80% of available space)
  const leftOffset = columnIndex * width // Left offset as percentage
  
  return {
    width,
    leftOffset,
    totalColumns
  }
}
