import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  MdChecklist, 
  MdCalendarToday, 
  MdSchedule, 
  MdTrendingUp,
  MdArrowForward,
  MdPriorityHigh,
  MdAccessTime
} from 'react-icons/md'
import { TodoService } from '../services/todoService'
import { UserService } from '../services/timesheetService'

interface DashboardMetrics {
  todos: {
    total: number
    high_priority: number
    overdue: number
    completed_today: number
  }
  planning: {
    hours_planned_today: number
    hours_planned_week: number
    entries_today: number
  }
  timesheet: {
    hours_today: number
    hours_week: number
    entries_today: number
  }
  activity: {
    recent_items: Array<{
      type: 'todo' | 'planning' | 'timesheet'
      action: string
      item: string
      time: string
    }>
  }
}

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const currentUser = UserService.getCurrentUser()

  useEffect(() => {
    loadDashboardMetrics()
  }, [])

  const loadDashboardMetrics = async () => {
    try {
      setLoading(true)
      
      // For now, we'll load basic todo metrics and mock the rest
      // In a real implementation, you'd have dedicated dashboard API endpoints
      const todos = await TodoService.getAllTodos()
      
      const mockMetrics: DashboardMetrics = {
        todos: {
          total: todos.length,
          high_priority: todos.filter(t => t.priority === 'High').length,
          overdue: 0, // TODO: Calculate based on due dates
          completed_today: todos.filter(t => t.status === 'Closed').length
        },
        planning: {
          hours_planned_today: 6.5,
          hours_planned_week: 32,
          entries_today: 4
        },
        timesheet: {
          hours_today: 4.2,
          hours_week: 28.5,
          entries_today: 3
        },
        activity: {
          recent_items: [
            { type: 'todo', action: 'Completed', item: 'Fix login bug', time: '2 min ago' },
            { type: 'planning', action: 'Started', item: 'Weekly planning session', time: '15 min ago' },
            { type: 'todo', action: 'Added', item: 'Review PR #123', time: '1 hour ago' },
            { type: 'timesheet', action: 'Logged', item: '2 hours on development', time: '2 hours ago' }
          ]
        }
      }
      
      setMetrics(mockMetrics)
    } catch (error) {
      console.error('Failed to load dashboard metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
  return (
    <div className="h-full overflow-y-auto p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-48 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg border border-slate-200">
                <div className="h-4 bg-slate-200 rounded w-20 mb-4"></div>
                <div className="h-8 bg-slate-200 rounded w-16 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-24"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-slate-600">Failed to load dashboard metrics</p>
        </div>
      </div>
    )
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'todo': return <MdChecklist className="w-4 h-4" />
      case 'planning': return <MdCalendarToday className="w-4 h-4" />
      case 'timesheet': return <MdSchedule className="w-4 h-4" />
      default: return <MdTrendingUp className="w-4 h-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'todo': return 'text-blue-600'
      case 'planning': return 'text-indigo-600'
      case 'timesheet': return 'text-green-600'
      default: return 'text-slate-600'
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Welcome back, {currentUser?.full_name || 'User'}
        </h1>
        <p className="text-slate-600">Here's what's happening with your work today.</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Todos Card */}
        <Link to="/todos" className="group">
          <div className="bg-white p-6 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <MdChecklist className="w-5 h-5 text-slate-600" />
                <span className="text-sm font-medium text-slate-600">Todos</span>
              </div>
              <MdArrowForward className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">{metrics.todos.total}</div>
            <div className="flex items-center space-x-4 text-xs text-slate-500">
              {metrics.todos.high_priority > 0 && (
                <div className="flex items-center space-x-1">
                  <MdPriorityHigh className="w-3 h-3 text-red-500" />
                  <span>{metrics.todos.high_priority} high</span>
                </div>
              )}
              <span>{metrics.todos.completed_today} completed today</span>
            </div>
          </div>
        </Link>

        {/* Planning Card */}
        <Link to="/planning" className="group">
          <div className="bg-white p-6 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <MdCalendarToday className="w-5 h-5 text-slate-600" />
                <span className="text-sm font-medium text-slate-600">Planning</span>
              </div>
              <MdArrowForward className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">{metrics.planning.hours_planned_today}h</div>
            <div className="text-xs text-slate-500">
              {metrics.planning.hours_planned_week}h this week • {metrics.planning.entries_today} entries today
            </div>
          </div>
        </Link>

        {/* Timesheet Card */}
        <Link to="/timesheet" className="group">
          <div className="bg-white p-6 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <MdSchedule className="w-5 h-5 text-slate-600" />
                <span className="text-sm font-medium text-slate-600">Time</span>
              </div>
              <MdArrowForward className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">{metrics.timesheet.hours_today}h</div>
            <div className="text-xs text-slate-500">
              {metrics.timesheet.hours_week}h this week • {metrics.timesheet.entries_today} entries today
            </div>
          </div>
        </Link>

        {/* Activity Card */}
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <div className="flex items-center space-x-2 mb-4">
            <MdTrendingUp className="w-5 h-5 text-slate-600" />
            <span className="text-sm font-medium text-slate-600">Activity</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mb-1">
            {metrics.activity.recent_items.length}
          </div>
          <div className="text-xs text-slate-500">actions today</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {metrics.activity.recent_items.map((item, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg bg-slate-50 ${getActivityColor(item.type)}`}>
                  {getActivityIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900">
                    <span className="font-medium">{item.action}</span> "{item.item}"
                  </p>
                  <p className="text-xs text-slate-500 flex items-center space-x-1">
                    <MdAccessTime className="w-3 h-3" />
                    <span>{item.time}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
