import React, { useState, useEffect } from 'react'
import { Send, CheckCircle, Users } from 'lucide-react'
import { TimesheetService, UserService } from '../../services/timesheetService'
import { getWeekData } from '../../lib/utils'
import { User, UserProjectPermissions } from '../../types'
import ConfirmationDialog from '../Common/ConfirmationDialog'

interface BulkActionsProps {
  currentWeek: Date
  selectedUser: string
  currentUser: User
  onUpdate: () => void
  onToastError?: (message: string) => void
}

const BulkActions: React.FC<BulkActionsProps> = ({
  currentWeek,
  selectedUser,
  currentUser,
  onUpdate,
  onToastError
}) => {
  const [loading, setLoading] = useState(false)
  const [permissions, setPermissions] = useState<UserProjectPermissions>({
    can_approve: false,
    projects: []
  })
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean
    type: 'submit-week'
    title: string
    message: string
  }>({
    isOpen: false,
    type: 'submit-week',
    title: '',
    message: ''
  })

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const permissionResponse = await UserService.getUserProjectPermissions()
        setPermissions(permissionResponse)
      } catch (error) {
        console.error('Failed to load permissions:', error)
      }
    }

    loadPermissions()
  }, [currentUser])

  const showSubmitWeekDialog = async () => {
    if (!selectedUser) return

    try {
      const weekData = getWeekData(currentWeek)
      
      // Get current entries to show summary
      const entries = await TimesheetService.getTimesheetEntries(
        weekData.startDate,
        weekData.endDate,
        selectedUser
      )
      
      const draftEntries = entries.filter(entry => entry.status === 'Draft')
      const totalHours = draftEntries.reduce((sum, entry) => sum + (entry.duration_hours || 0), 0)
      const entryCount = draftEntries.length
      
      if (entryCount === 0) {
        if (onToastError) {
          onToastError('No draft entries found to submit.')
        }
        return
      }

      // Group entries by project for summary
      const projectSummary = draftEntries.reduce((acc, entry) => {
        const project = entry.project || 'Unknown Project'
        if (!acc[project]) {
          acc[project] = { hours: 0, count: 0 }
        }
        acc[project].hours += entry.duration_hours || 0
        acc[project].count += 1
        return acc
      }, {} as Record<string, { hours: number; count: number }>)

      const projectBreakdown = Object.entries(projectSummary)
        .map(([project, data]) => `• ${project}: ${data.hours.toFixed(1)}h (${data.count} ${data.count === 1 ? 'entry' : 'entries'})`)
        .join('\n')

      const weekRange = `${weekData.startDate.toLocaleDateString()} - ${weekData.endDate.toLocaleDateString()}`

      setConfirmationDialog({
        isOpen: true,
        type: 'submit-week',
        title: 'Submit Week for Approval',
        message: `Are you sure you want to submit all draft entries for the week of ${weekRange}?\n\nWeek Summary:\n• Total Hours: ${totalHours.toFixed(1)}h\n• Total Entries: ${entryCount}\n\nProject Breakdown:\n${projectBreakdown}\n\nAll draft entries will be submitted for approval and cannot be edited until approved or rejected.`
      })
    } catch (error) {
      console.error('Failed to load week summary:', error)
      if (onToastError) {
        onToastError('Failed to load week summary. Please try again.')
      }
    }
  }

  const handleConfirmSubmitWeek = async () => {
    if (!selectedUser) return

    try {
      setLoading(true)
      const weekData = getWeekData(currentWeek)
      await TimesheetService.submitWeekEntries(selectedUser, weekData.startDate, weekData.endDate)
      onUpdate()
    } catch (error) {
      console.error('Failed to submit week entries:', error)
      if (onToastError) {
        onToastError('Failed to submit week entries. Please try again.')
      }
      throw error // Re-throw to let dialog handle loading state
    } finally {
      setLoading(false)
    }
  }

  const handleApproveAll = async () => {
    if (!selectedUser) return

    try {
      setLoading(true)
      const weekData = getWeekData(currentWeek)
      
      // Get the count of entries that will be approved (submitted entries only)
      const entries = await TimesheetService.getTimesheetEntries(
        weekData.startDate,
        weekData.endDate,
        selectedUser
      )
      
      const submittedEntries = entries.filter(entry => entry.status === 'Submitted')
      const submittedCount = submittedEntries.length
      
      if (submittedCount === 0) {
        if (onToastError) {
          onToastError('No submitted entries found to approve.')
        }
        return
      }
      
      const confirmed = confirm(
        `Approve ${submittedCount} submitted ${submittedCount === 1 ? 'entry' : 'entries'}?\n\n` +
        `This will approve all submitted timesheet entries for the selected week. ` +
        `Draft entries will be excluded and remain unchanged.`
      )
      
      if (!confirmed) return
      
      await TimesheetService.approveAllEntries(selectedUser, weekData.startDate, weekData.endDate)
      onUpdate()
    } catch (error) {
      console.error('Failed to approve all entries:', error)
      if (onToastError) {
        onToastError('Failed to approve all entries. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Show submit button for current user's own entries
  const showSubmitButton = selectedUser === currentUser.name

  // Show approve button for managers (can approve others, but also their own submitted entries)
  const showApproveButton = permissions.can_approve

  if (!showSubmitButton && !showApproveButton) {
    return null
  }

  return (
    <div className="flex items-center space-x-2">
      {showSubmitButton && (
        <button
          onClick={showSubmitWeekDialog}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          title="Submit all draft entries for this week"
        >
          <Send className="w-4 h-4" />
          <span>Submit Week</span>
        </button>
      )}

      {showApproveButton && (
        <button
          onClick={handleApproveAll}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          title="Approve all submitted entries for this week"
        >
          <CheckCircle className="w-4 h-4" />
          <span>Approve All</span>
        </button>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmationDialog.isOpen}
        onClose={() => setConfirmationDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmSubmitWeek}
        title={confirmationDialog.title}
        message={confirmationDialog.message}
        type={confirmationDialog.type}
      />
    </div>
  )
}

export default BulkActions
