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
  projects?: any[]
  activities?: any[]
}

const BulkActions: React.FC<BulkActionsProps> = ({
  currentWeek,
  selectedUser,
  currentUser,
  onUpdate,
  onToastError,
  projects = [],
  activities = []
}) => {
  const [loading, setLoading] = useState(false)
  const [permissions, setPermissions] = useState<UserProjectPermissions>({
    can_approve: false,
    projects: []
  })
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean
    type: 'submit-week' | 'approve-all'
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
        const projectName = projects?.find(p => p.name === entry.project)?.project_name || entry.project || 'Unknown Project'
        if (!acc[projectName]) {
          acc[projectName] = { hours: 0, count: 0 }
        }
        acc[projectName].hours += entry.duration_hours || 0
        acc[projectName].count += 1
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

  const showApproveAllDialog = async () => {
    if (!selectedUser) return

    try {
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

      // Group entries by project for summary
      const projectSummary = submittedEntries.reduce((acc, entry) => {
        const projectName = projects?.find(p => p.name === entry.project)?.project_name || entry.project || 'Unknown Project'
        if (!acc[projectName]) {
          acc[projectName] = { hours: 0, count: 0 }
        }
        acc[projectName].hours += entry.duration_hours || 0
        acc[projectName].count += 1
        return acc
      }, {} as Record<string, { hours: number; count: number }>)

      const projectBreakdown = Object.entries(projectSummary)
        .map(([project, data]) => `• ${project}: ${data.hours.toFixed(1)}h (${data.count} ${data.count === 1 ? 'entry' : 'entries'})`)
        .join('\n')

      const totalHours = submittedEntries.reduce((sum, entry) => sum + (entry.duration_hours || 0), 0)
      const weekRange = `${weekData.startDate.toLocaleDateString()} - ${weekData.endDate.toLocaleDateString()}`

      setConfirmationDialog({
        isOpen: true,
        type: 'approve-all',
        title: 'Approve All Submitted Entries',
        message: `Are you sure you want to approve all submitted entries for the week of ${weekRange}?\n\nApproval Summary:\n• Total Hours: ${totalHours.toFixed(1)}h\n• Total Entries: ${submittedCount}\n\nProject Breakdown:\n${projectBreakdown}\n\nAll submitted entries will be approved and marked as completed. Draft entries will remain unchanged.`
      })
    } catch (error) {
      console.error('Failed to load approval summary:', error)
      if (onToastError) {
        onToastError('Failed to load approval summary. Please try again.')
      }
    }
  }

  const handleConfirmApproveAll = async () => {
    if (!selectedUser) return

    try {
      setLoading(true)
      const weekData = getWeekData(currentWeek)
      await TimesheetService.approveAllEntries(selectedUser, weekData.startDate, weekData.endDate)
      onUpdate()
    } catch (error) {
      console.error('Failed to approve all entries:', error)
      if (onToastError) {
        onToastError('Failed to approve all entries. Please try again.')
      }
      throw error // Re-throw to let dialog handle loading state
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
          onClick={showApproveAllDialog}
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
        onConfirm={confirmationDialog.type === 'submit-week' ? handleConfirmSubmitWeek : handleConfirmApproveAll}
        title={confirmationDialog.title}
        message={confirmationDialog.message}
        type={confirmationDialog.type}
      />
    </div>
  )
}

export default BulkActions
