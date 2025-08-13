import React, { useState, useMemo, useEffect } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Search, Folder, Activity as ActivityIcon } from 'lucide-react'
import { Activity, Project, User as UserType } from '../../types'
import { getActivityColor } from '../../lib/utils'

interface ActivityPaletteProps {
  activities: Activity[]
  projects: Project[]
  currentUser?: UserType
  onAssignActivity?: (activity: Activity) => void
}

interface DraggableActivityProps {
  activity: Activity
  project?: Project
  currentUser?: UserType
  onAssignActivity?: (activity: Activity) => void
}

const DraggableActivity: React.FC<DraggableActivityProps> = ({ 
  activity, 
  project, 
  currentUser, 
  onAssignActivity 
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: activity.name,
    data: { type: 'activity', activity }
  })

  const activityColors = getActivityColor(activity.name)
  
  // Check if current user is project manager
  const isProjectManager = currentUser && project?.project_lead === currentUser.name

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`activity-item p-3 rounded-lg border cursor-grab active:cursor-grabbing transition-colors hover:shadow-md ${activityColors.bg} ${activityColors.border} ${activityColors.leftBorder} ${activityColors.leftBorderThick} ${activityColors.text} ${isDragging ? 'opacity-30' : ''} relative`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-900 truncate">
            {activity.activity_name}
          </div>
          <div className="text-xs text-gray-600 truncate">
            {project?.project_name || activity.project}
          </div>
        </div>
        
        <div className="flex flex-col items-end space-y-1 ml-2">
        </div>
      </div>
      
    </div>
  )
}

const ActivityPalette: React.FC<ActivityPaletteProps> = ({ 
  activities, 
  projects, 
  currentUser, 
  onAssignActivity 
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  // Create project lookup map (by both name and ID for flexibility)
  const projectMap = useMemo(() => {
    const map = new Map<string, Project>()
    projects.forEach(project => {
      map.set(project.name, project) // Map by project ID
      if (project.project_name) {
        map.set(project.project_name, project) // Also map by project name for backwards compatibility
      }
    })
    return map
  }, [projects])

  // Filter activities based on search and project selection
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      const matchesSearch = !searchTerm || 
        activity.activity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (activity.description && activity.description.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesProject = !selectedProject || activity.project === selectedProject

      return matchesSearch && matchesProject
    })
  }, [activities, searchTerm, selectedProject])

  // Group activities by project
  const groupedActivities = useMemo(() => {
    const groups = new Map<string, Activity[]>()
    
    filteredActivities.forEach(activity => {
      const projectName = activity.project
      if (!groups.has(projectName)) {
        groups.set(projectName, [])
      }
      groups.get(projectName)!.push(activity)
    })

    return Array.from(groups.entries()).map(([projectName, projectActivities]) => ({
      project: projectMap.get(projectName),
      projectName,
      activities: projectActivities.sort((a, b) => {
        const aName = (a.activity_name != null ? String(a.activity_name) : '')
        const bName = (b.activity_name != null ? String(b.activity_name) : '')
        return aName.localeCompare(bName)
      })
    }))
  }, [filteredActivities, projectMap])

  // Ensure newly discovered projects default to expanded
  useEffect(() => {
    setCollapsed(prev => {
      const next = { ...prev }
      groupedActivities.forEach(({ projectName }) => {
        if (next[projectName] === undefined) next[projectName] = false
      })
      return next
    })
  }, [groupedActivities])

  return (
    <div className="bg-white rounded-lg shadow-sm border flex flex-col h-full">
      <div className="p-4 border-b flex-shrink-0">
        <div className="flex items-center space-x-2 mb-4">
          <ActivityIcon className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Activities</h3>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search activities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Project Filter */}
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Projects</option>
          {projects
            .filter(project => activities.some(activity => activity.project === project.name))
            .map(project => (
              <option key={project.name} value={project.name}>
                {project.project_name}
              </option>
            ))}
        </select>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {groupedActivities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ActivityIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No activities found</p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-blue-600 text-sm hover:underline mt-1"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {groupedActivities.map(({ project, projectName, activities }) => (
              <div key={projectName}>
                <div
                  className="flex items-center justify-between mb-2 cursor-pointer select-none"
                  onClick={() => setCollapsed(prev => ({ ...prev, [projectName]: !prev[projectName] }))}
                >
                  <div className="flex items-center space-x-2">
                    <Folder className="w-4 h-4 text-gray-400" />
                    <h4 className="font-medium text-sm text-gray-700">
                      {project?.project_name || projectName}
                    </h4>
                    <span className="text-xs text-gray-500">
                      ({activities.length})
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {collapsed[projectName] ? '►' : '▼'}
                  </span>
                </div>
                
                {!collapsed[projectName] && (
                  <div className="space-y-2 ml-6">
                    {activities.map(activity => (
                      <DraggableActivity
                        key={activity.name}
                        activity={activity}
                        project={project}
                        currentUser={currentUser}
                        onAssignActivity={onAssignActivity}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t bg-gray-50 rounded-b-lg">
        <p className="text-xs text-gray-600">
          💡 Drag activities to calendar slots to create timesheet entries. Only activities assigned to you are shown here. If you are missing activities to book to, please contact your project's timesheet approver or project lead.
        </p>
      </div>
    </div>
  )
}

export default ActivityPalette
