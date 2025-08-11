"""
After-Workz API Entry Point

This file serves as the main API entry point and imports functions from specialized modules:
- auth_api.py: Authentication and authorization
- afterz_api.py: Timesheet/After-Workz functionality  
- beforez_api.py: Planner/Before-Workz functionality
- shared_api.py: Shared data and utilities
"""

# Authentication & Authorization
from afterz.auth_api import has_app_permission

# After-Workz (Timesheet) APIs
from afterz.afterz_api import (
    get_timesheet_entries,
    create_timesheet_entry,
    update_timesheet_entry,
    delete_timesheet_entry,
    get_approval_dashboard_data,
    get_users_with_submission_counts,
    submit_week_entries,
    approve_all_entries,
    reject_entry_with_reason,
    unapprove_entry
)

# Before-Workz (Planner) APIs
from afterz.beforez_api import (
    get_user_todos,
    get_planner_entries,
    create_planner_entry,
    update_planner_entry,
    delete_planner_entry,
    complete_planner_entry,
    cancel_planner_entry
)

# Shared Data & Utilities
from afterz.shared_api import (
    get_projects,
    get_activities,
    get_users,
    get_user_project_permissions,
    get_user_assigned_activities,
    get_assignable_activities,
    assign_activity_to_users,
    get_activity_assignments,
    remove_activity_assignment
)

# Re-export all functions to maintain backward compatibility
__all__ = [
    # Auth
    'has_app_permission',
    
    # After-Workz
    'get_timesheet_entries',
    'create_timesheet_entry', 
    'update_timesheet_entry',
    'delete_timesheet_entry',
    'get_approval_dashboard_data',
    'get_users_with_submission_counts',
    'submit_week_entries',
    'approve_all_entries',
    'reject_entry_with_reason',
    'unapprove_entry',
    
    # Before-Workz
    'get_user_todos',
    'get_planner_entries',
    'create_planner_entry',
    'update_planner_entry',
    'delete_planner_entry',
    'complete_planner_entry',
    'cancel_planner_entry',
    
    # Shared
    'get_projects',
    'get_activities',
    'get_users',
    'get_user_project_permissions',
    'get_user_assigned_activities',
    'get_assignable_activities',
    'assign_activity_to_users',
    'get_activity_assignments',
    'remove_activity_assignment'
]
