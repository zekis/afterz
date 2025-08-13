# Obsolete Files

This folder contains files that are no longer needed after the integration of the three separate Workz applications (What-Workz, Before-Workz, After-Workz) into a unified application.

## Files Moved Here

### Original Standalone Applications
- **App.tsx** - Original After-Workz (timesheet) standalone app
- **BeforezApp.tsx** - Original Before-Workz (planning) standalone app  
- **WhatWorkzApp.tsx** - Original What-Workz (todo) standalone app

### Entry Points
- **main.jsx** - Original main entry point
- **main-whatworkz.jsx** - What-Workz specific entry point

### Obsolete Components
- **AppModeToggle.tsx** - Component for switching between plan/book modes (replaced by unified sidebar navigation)
- **ViewToggle.tsx** - Old view toggle component (functionality integrated into CalendarViewToggle)
- **WeekSelector.tsx** - Old week selector component (functionality integrated into CalendarViewToggle)

### Styles
- **App.css** - Original app styles (replaced by Tailwind CSS)

## Why These Files Are Obsolete

After the integration:
- All three applications are now unified into `UnifiedWorkzApp.tsx` with React Router
- Individual app components have been converted to page components in `src/pages/`
- Navigation is handled by a unified sidebar instead of mode toggles
- Styling is now handled entirely by Tailwind CSS
- Entry points are consolidated to `main.tsx`

## Current Architecture

The new unified structure:
```
src/
├── UnifiedWorkzApp.tsx          # Main unified app with React Router
├── main.tsx                     # Single entry point
├── layouts/
│   ├── AppLayout.tsx           # Main layout with sidebar
│   └── Sidebar.tsx             # Unified navigation sidebar
├── pages/
│   ├── Dashboard.tsx           # Cross-module overview
│   ├── TodoManagement.tsx      # What-Workz functionality
│   ├── Planning.tsx            # Before-Workz functionality
│   └── Timesheet.tsx           # After-Workz functionality
└── components/                 # Shared components
```

These obsolete files are kept for reference but should not be imported or used in the new unified application.
