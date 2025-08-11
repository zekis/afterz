import React, { useState, useEffect } from 'react'
import { Bell, CheckCircle, Clock } from 'lucide-react'
import { TimesheetService } from '../../services/timesheetService'
import { ApprovalDashboardData } from '../../types'

interface ApprovalDashboardProps {
  onRefresh?: () => void
}

const ApprovalDashboard: React.FC<ApprovalDashboardProps> = ({ onRefresh }) => {
  const [dashboardData, setDashboardData] = useState<ApprovalDashboardData>({
    pending_count: 0,
    projects: []
  })
  const [loading, setLoading] = useState(false)

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const data = await TimesheetService.getApprovalDashboardData()
      setDashboardData(data)
    } catch (error) {
      console.error('Failed to load approval dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Refresh when parent requests it
  useEffect(() => {
    if (onRefresh) {
      loadDashboardData()
    }
  }, [onRefresh])

  if (dashboardData.pending_count === 0) {
    return null // Don't show anything if no pending approvals
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 flex items-center space-x-3">
      <div className="flex items-center space-x-2">
        <Bell className="w-5 h-5 text-orange-600" />
        <span className="text-sm font-medium text-orange-800">
          {dashboardData.pending_count} pending approval{dashboardData.pending_count !== 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="flex items-center space-x-1 text-xs text-orange-600">
        <Clock className="w-4 h-4" />
        <span>
          {dashboardData.projects.length} project{dashboardData.projects.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading && (
        <div className="animate-spin">
          <CheckCircle className="w-4 h-4 text-orange-500" />
        </div>
      )}
    </div>
  )
}

export default ApprovalDashboard
