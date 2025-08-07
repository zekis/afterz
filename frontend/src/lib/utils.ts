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
    case 'Paid':
      return 'bg-purple-100 border-purple-300 text-purple-700'
    default:
      return 'bg-gray-100 border-gray-300 text-gray-700'
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
