import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import AppLayout from './layouts/AppLayout'
import Dashboard from './pages/Dashboard'
import TodoManagement from './pages/TodoManagement'
import Planning from './pages/Planning'
import Timesheet from './pages/Timesheet'
import ManageAssignments from './pages/ManageAssignments'
import PendingApprovals from './pages/PendingApprovals'

// Import Mantine styles
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/notifications/styles.css'

// Placeholder components for remaining modules

const Settings: React.FC = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-slate-900 mb-4">Settings</h1>
    <p className="text-slate-600">Application settings and preferences.</p>
  </div>
)

const UnifiedWorkzApp: React.FC = () => {
  return (
    <MantineProvider>
      <Notifications />
      <Router>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="todos" element={<TodoManagement />} />
            <Route path="planning" element={<Planning />} />
            <Route path="timesheet" element={<Timesheet />} />
            <Route path="timesheet/assignments" element={<ManageAssignments />} />
            <Route path="timesheet/approvals" element={<PendingApprovals />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </Router>
    </MantineProvider>
  )
}

export default UnifiedWorkzApp
