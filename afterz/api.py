import frappe
import json
from datetime import datetime, timedelta

@frappe.whitelist()
def has_app_permission():
    """
    Check if the current user has permission to access the After-Workz app.
    
    Returns True if:
    - User is Administrator
    - User is assigned to any project (as team member, manager, or approver)
    - User has System Manager role
    
    Returns False otherwise.
    """
    if not frappe.session.user or frappe.session.user == "Guest":
        return False
    
    # Allow Administrator and System Manager
    if frappe.session.user == "Administrator" or "System Manager" in frappe.get_roles():
        return True
    
    try:
        # Check if user is assigned to any project in any capacity
        current_user = frappe.session.user
        
        # Check if user is a project manager
        project_manager_count = frappe.db.count("Project", {
            "project_manager": current_user,
            "status": ["!=", "Cancelled"]
        })
        
        if project_manager_count > 0:
            return True
        
        # Check if user is a timesheet approver
        timesheet_approver_count = frappe.db.count("Project", {
            "timesheet_approver": current_user,
            "status": ["!=", "Cancelled"]
        })
        
        if timesheet_approver_count > 0:
            return True
        
        # Check if user is assigned to any project team
        # This checks the Project User child table
        project_user_count = frappe.db.sql("""
            SELECT COUNT(*)
            FROM `tabProject User` pu
            INNER JOIN `tabProject` p ON pu.parent = p.name
            WHERE pu.user = %s AND p.status != 'Cancelled'
        """, (current_user,))[0][0]
        
        if project_user_count > 0:
            return True
        
        # Check if user has any activities assigned to them
        activity_count = frappe.db.count("ToDo", {
            "allocated_to": current_user,
            "reference_type": "Activity",
            "status": ["!=", "Cancelled"]
        })
        
        if activity_count > 0:
            return True
        
        # If none of the above conditions are met, deny access
        return False
        
    except Exception as e:
        frappe.log_error(f"Error checking app permission for user {frappe.session.user}: {str(e)}")
        return False


@frappe.whitelist()
def get_timesheet_entries(start_date, end_date, employee=None):
    """Get timesheet entries for a date range

    Important: Filter by check_in_time window instead of the separate date field.
    This ensures entries show correctly even if the 'date' field and check-in datetime get out of sync.
    """
    # Build full-day datetime window from provided dates
    start_dt = f"{start_date} 00:00:00"
    end_dt = f"{end_date} 23:59:59"

    filters = {
        'check_in_time': ['between', [start_dt, end_dt]]
    }
    
    if employee:
        filters['employee'] = employee
    
    fields = [
        'name', 'employee', 'status', 'is_active',
        'project', 'activity', 'location', 'check_in_time',
        'check_out_time', 'duration_hours', 'description', 'notes'
    ]
    
    entries = frappe.get_all(
        'Timesheet Entry',
        fields=fields,
        filters=filters,
        order_by='check_in_time asc'
    )
    
    return entries

@frappe.whitelist()
def create_timesheet_entry(**kwargs):
    """Create a new timesheet entry"""
    try:
        # Set default employee to current user if not provided
        if not kwargs.get('employee'):
            kwargs['employee'] = frappe.session.user
        
        # Handle datetime fields specially
        for key, value in kwargs.items():
            if key in ['check_in_time', 'check_out_time'] and isinstance(value, str):
                # Parse datetime string directly as local time (no timezone conversion)
                try:
                    # Remove timezone info and parse as naive datetime
                    if value.endswith('Z'):
                        value = value[:-1]  # Remove Z
                    elif '+' in value:
                        value = value.split('+')[0]  # Remove timezone offset
                    
                    # Parse as naive datetime - treat as local time already
                    dt = datetime.fromisoformat(value)
                    kwargs[key] = dt.replace(tzinfo=None)
                except ValueError:
                    # If parsing fails, fallback to current time
                    kwargs[key] = frappe.utils.now_datetime().replace(tzinfo=None)
            elif key == 'date' and isinstance(value, str):
                # Handle date field - convert to date object
                try:
                    if isinstance(value, datetime):
                        kwargs[key] = value.date()
                    else:
                        # Parse date string and extract date part
                        dt = datetime.fromisoformat(value.replace('Z', '').split('T')[0])
                        kwargs[key] = dt.date()
                except ValueError:
                    kwargs[key] = frappe.utils.getdate(value)
            
        doc = frappe.get_doc({
            'doctype': 'Timesheet Entry',
            **kwargs
        })
        doc.insert()
        
        return {
            'success': True,
            'name': doc.name,
            'message': 'Timesheet entry created successfully'
        }
    except Exception as e:
        frappe.log_error(f"Error creating timesheet entry: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

@frappe.whitelist()
def update_timesheet_entry(name, **kwargs):
    """Update an existing timesheet entry"""
    try:
        doc = frappe.get_doc('Timesheet Entry', name)
        
        # Check permissions
        if doc.employee != frappe.session.user and not frappe.has_permission('Timesheet Entry', 'write'):
            frappe.throw('You do not have permission to update this timesheet entry')
        
        for key, value in kwargs.items():
            if hasattr(doc, key):
                # Skip the 'name' field as it's the document identifier
                if key == 'name':
                    continue
                    
                # Handle datetime fields specially
                if key in ['check_in_time', 'check_out_time'] and isinstance(value, str):
                    # Parse datetime string directly as local time (no timezone conversion)
                    try:
                        # Remove timezone info and parse as naive datetime
                        if value.endswith('Z'):
                            value = value[:-1]  # Remove Z
                        elif '+' in value:
                            value = value.split('+')[0]  # Remove timezone offset
                        
                        # Parse as naive datetime - treat as local time already
                        dt = datetime.fromisoformat(value)
                        value = dt.replace(tzinfo=None)
                        
                        # Debug log to see what we're setting
                        # frappe.log_error(f"Setting {key} to {value} for doc {doc.name}")
                        
                    except Exception as e:
                        frappe.log_error(f"Failed to parse datetime {value} for field {key}: {str(e)}")
                        # Fallback to current time if parsing completely fails
                        value = frappe.utils.now_datetime().replace(tzinfo=None)
                
                setattr(doc, key, value)
        
        doc.save()
        
        return {
            'success': True,
            'message': 'Timesheet entry updated successfully'
        }
    except Exception as e:
        frappe.log_error(f"Error updating timesheet entry: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

@frappe.whitelist()
def delete_timesheet_entry(name):
    """Delete a timesheet entry"""
    try:
        doc = frappe.get_doc('Timesheet Entry', name)
        
        # Check permissions
        if doc.employee != frappe.session.user and not frappe.has_permission('Timesheet Entry', 'delete'):
            frappe.throw('You do not have permission to delete this timesheet entry')
        
        doc.delete()
        
        return {
            'success': True,
            'message': 'Timesheet entry deleted successfully'
        }
    except Exception as e:
        frappe.log_error(f"Error deleting timesheet entry: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }


@frappe.whitelist()
def get_projects():
    """Get active projects"""
    try:
        projects = frappe.get_all(
            'Project',
            fields=['name', 'project_name', 'customer', 'status', 'project_manager', 'division', 'work_type'],
            filters={'status': 'Active'},
            order_by='project_name asc'
        )
        
        return projects
    except Exception as e:
        frappe.log_error(f"Error getting projects: {str(e)}")
        return []

@frappe.whitelist()
def get_activities(project=None):
    """Get activities, optionally filtered by project"""
    try:
        filters = {'status': ['in', ['Open', 'In Progress']]}
        if project:
            filters['project'] = project
        
        activities = frappe.get_all(
            'Activity',
            fields=[
                'name', 'subject', 'project', 'status', 'priority',
                'location', 'description', 'assigned_to', 'estimated_hours'
            ],
            filters=filters,
            order_by='subject asc'
        )
        
        return activities
    except Exception as e:
        frappe.log_error(f"Error getting activities: {str(e)}")
        return []

@frappe.whitelist()
def get_users():
    """Get users for timesheet management"""
    try:
        # Check if current user is a manager
        if not frappe.has_permission('Timesheet Entry', 'read'):
            return [frappe.get_doc('User', frappe.session.user)]
        
        users = frappe.get_all(
            'User',
            fields=['name', 'full_name', 'email', 'user_image'],
            filters={'enabled': 1},
            order_by='full_name asc'
        )
        
        return users
    except Exception as e:
        frappe.log_error(f"Error getting users: {str(e)}")
        return []

@frappe.whitelist()
def get_approval_dashboard_data():
    """Get pending approval counts for the current user"""
    try:
        current_user = frappe.session.user
        
        # Get projects where current user is timesheet approver
        projects = frappe.get_all(
            'Project',
            fields=['name'],
            filters={'timesheet_approver': current_user, 'status': 'Active'}
        )
        
        if not projects:
            return {'pending_count': 0, 'projects': []}
        
        project_names = [p.name for p in projects]
        
        # Count submitted entries for these projects
        pending_count = frappe.db.count(
            'Timesheet Entry',
            filters={
                'status': 'Submitted',
                'project': ['in', project_names]
            }
        )
        
        return {
            'pending_count': pending_count,
            'projects': project_names
        }
        
    except Exception as e:
        frappe.log_error(f"Error getting approval dashboard data: {str(e)}")
        return {'pending_count': 0, 'projects': []}

@frappe.whitelist()
def get_users_with_submission_counts(start_date, end_date):
    """Get users with submission counts for approval tree view"""
    try:
        current_user = frappe.session.user
        
        # Get projects where current user is timesheet approver
        projects = frappe.get_all(
            'Project',
            fields=['name'],
            filters={'timesheet_approver': current_user, 'status': 'Active'}
        )
        
        if not projects:
            return []
        
        project_names = [p.name for p in projects]
        
        # Get submitted entries for these projects in date range
        # Build full-day datetime window from provided dates
        start_dt = f"{start_date} 00:00:00"
        end_dt = f"{end_date} 23:59:59"

        entries = frappe.get_all(
            'Timesheet Entry',
            fields=['employee', 'check_in_time'],
            filters={
                'status': 'Submitted',
                'project': ['in', project_names],
                'check_in_time': ['between', [start_dt, end_dt]]
            }
        )
        
        # Group by user and week
        user_data = {}
        for entry in entries:
            employee = entry.employee
            if employee not in user_data:
                user_doc = frappe.get_doc('User', employee)
                user_data[employee] = {
                    'name': employee,
                    'full_name': user_doc.full_name,
                    'email': user_doc.email,
                    'submission_count': 0
                }
            user_data[employee]['submission_count'] += 1
        
        return list(user_data.values())
        
    except Exception as e:
        frappe.log_error(f"Error getting users with submission counts: {str(e)}")
        return []

@frappe.whitelist()
def submit_week_entries(employee, start_date, end_date):
    """Submit all draft entries for a user's week"""
    try:
        # Get all draft entries for the user in the date range
        # Build full-day datetime window from provided dates
        start_dt = f"{start_date} 00:00:00"
        end_dt = f"{end_date} 23:59:59"

        entries = frappe.get_all(
            'Timesheet Entry',
            fields=['name'],
            filters={
                'employee': employee,
                'status': 'Draft',
                'check_in_time': ['between', [start_dt, end_dt]]
            }
        )
        
        if not entries:
            return {
                'success': True,
                'message': 'No draft entries found to submit',
                'count': 0
            }
        
        # Update all entries to submitted status
        for entry in entries:
            doc = frappe.get_doc('Timesheet Entry', entry.name)
            doc.status = 'Submitted'
            doc.save()
        
        return {
            'success': True,
            'message': f'Successfully submitted {len(entries)} entries',
            'count': len(entries)
        }
        
    except Exception as e:
        frappe.log_error(f"Error submitting week entries: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

@frappe.whitelist()
def approve_all_entries(employee, start_date, end_date, approval_notes=None):
    """Approve all entries for a user's week (regardless of status - draft, submitted, etc.)"""
    try:
        current_user = frappe.session.user
        
        # Get projects where current user is timesheet approver
        projects = frappe.get_all(
            'Project',
            fields=['name'],
            filters={'timesheet_approver': current_user, 'status': 'Active'}
        )
        
        if not projects:
            return {
                'success': False,
                'error': 'You do not have approval permissions for any projects'
            }
        
        project_names = [p.name for p in projects]
        
        # Get ONLY SUBMITTED entries for this user in date range for approved projects
        # Build full-day datetime window from provided dates
        start_dt = f"{start_date} 00:00:00"
        end_dt = f"{end_date} 23:59:59"

        entries = frappe.get_all(
            'Timesheet Entry',
            fields=['name', 'status'],
            filters={
                'employee': employee,
                'status': 'Submitted',  # Only approve submitted entries, not drafts
                'project': ['in', project_names],
                'check_in_time': ['between', [start_dt, end_dt]]
            }
        )
        
        if not entries:
            return {
                'success': True,
                'message': 'No submitted entries found to approve',
                'count': 0
            }
        
        # Update all submitted entries to approved status
        approved_count = 0
        for entry in entries:
            doc = frappe.get_doc('Timesheet Entry', entry.name)
            doc.status = 'Approved'
            doc.approved_by = current_user
            doc.approval_date = frappe.utils.now_datetime()
            if approval_notes:
                doc.approval_notes = approval_notes
            doc.save()
            approved_count += 1
        
        return {
            'success': True,
            'message': f'Successfully approved {approved_count} submitted entries',
            'count': approved_count
        }
        
    except Exception as e:
        frappe.log_error(f"Error approving all entries: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

@frappe.whitelist()
def reject_entry_with_reason(name, rejection_reason):
    """Reject a single entry with reason and revert to draft"""
    try:
        current_user = frappe.session.user
        doc = frappe.get_doc('Timesheet Entry', name)
        
        # Check if user can approve this project
        project_doc = frappe.get_doc('Project', doc.project)
        if project_doc.timesheet_approver != current_user:
            return {
                'success': False,
                'error': 'You do not have approval permissions for this project'
            }
        
        # Update entry status and add rejection notes
        doc.status = 'Draft'  # Revert to draft
        doc.approved_by = current_user
        doc.approval_date = frappe.utils.now_datetime()
        doc.approval_notes = f"Rejected: {rejection_reason}"
        doc.save()
        
        return {
            'success': True,
            'message': 'Entry rejected and reverted to draft'
        }
        
    except Exception as e:
        frappe.log_error(f"Error rejecting entry: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

@frappe.whitelist()
def get_user_project_permissions(user=None):
    """Check if user can approve timesheets for any projects"""
    try:
        if not user:
            user = frappe.session.user
        
        projects = frappe.get_all(
            'Project',
            fields=['name', 'project_name'],
            filters={'timesheet_approver': user, 'status': 'Active'}
        )
        
        return {
            'can_approve': len(projects) > 0,
            'projects': projects
        }
        
    except Exception as e:
        frappe.log_error(f"Error checking user project permissions: {str(e)}")
        return {
            'can_approve': False,
            'projects': []
        }

# ToDo-based Activity Assignment System

@frappe.whitelist()
def get_user_assigned_activities(user=None):
    """Get activities assigned to user via ToDo records"""
    try:
        if not user:
            user = frappe.session.user
        
        # Get ToDo records for activities assigned to this user
        todos = frappe.get_all(
            'ToDo',
            fields=['reference_name', 'priority', 'date', 'description', 'assigned_by'],
            filters={
                'reference_type': 'Activity',
                'allocated_to': user,
                'status': ['not in', ['Closed', 'Cancelled']]
            }
        )
        
        if not todos:
            return []
        
        # Get activity names from todos
        activity_names = [todo.reference_name for todo in todos]
        
        # Get full activity details
        activities = frappe.get_all(
            'Activity',
            fields=[
                'name', 'subject', 'project', 'status', 'priority',
                'location', 'description', 'estimated_hours'
            ],
            filters={
                'name': ['in', activity_names],
                'status': ['in', ['Open', 'In Progress']]
            },
            order_by='subject asc'
        )
        
        # Merge todo information with activity details
        todo_map = {todo.reference_name: todo for todo in todos}
        for activity in activities:
            todo = todo_map.get(activity.name)
            if todo:
                activity.todo_priority = todo.priority
                activity.todo_due_date = todo.date
                activity.todo_description = todo.description
                activity.assigned_by = todo.assigned_by
        
        return activities
        
    except Exception as e:
        frappe.log_error(f"Error getting user assigned activities: {str(e)}")
        return []

@frappe.whitelist()
def get_assignable_activities(project_manager=None):
    """Get activities that can be assigned by project manager"""
    try:
        if not project_manager:
            project_manager = frappe.session.user
        
        # Get projects managed by this user
        projects = frappe.get_all(
            'Project',
            fields=['name'],
            filters={'project_manager': project_manager, 'status': 'Active'}
        )
        
        if not projects:
            return []
        
        project_names = [p.name for p in projects]
        
        # Get activities from these projects
        activities = frappe.get_all(
            'Activity',
            fields=[
                'name', 'subject', 'project', 'status', 'priority',
                'location', 'description', 'estimated_hours'
            ],
            filters={
                'project': ['in', project_names],
                'status': ['in', ['Open', 'In Progress']]
            },
            order_by='project asc, subject asc'
        )
        
        return activities
        
    except Exception as e:
        frappe.log_error(f"Error getting assignable activities: {str(e)}")
        return []

@frappe.whitelist()
def assign_activity_to_users(activity_name, user_list, priority="Medium", due_date=None, notes=""):
    """Assign activity to multiple users via ToDo records"""
    try:
        current_user = frappe.session.user
        
        # Get activity to check project permissions
        activity = frappe.get_doc('Activity', activity_name)
        project = frappe.get_doc('Project', activity.project)
        
        # Check if current user can assign activities in this project
        if project.project_manager != current_user and not frappe.has_permission('Activity', 'write'):
            return {
                'success': False,
                'error': 'You do not have permission to assign activities in this project'
            }
        
        # Parse user_list if it's a string
        if isinstance(user_list, str):
            user_list = json.loads(user_list)
        
        created_todos = []
        
        for user in user_list:
            # Check if todo already exists for this user/activity
            existing_todo = frappe.get_all(
                'ToDo',
                filters={
                    'reference_type': 'Activity',
                    'reference_name': activity_name,
                    'allocated_to': user,
                    'status': ['not in', ['Closed', 'Cancelled']]
                }
            )
            
            if existing_todo:
                continue  # Skip if already assigned
            
            # Create ToDo record
            todo_doc = frappe.get_doc({
                'doctype': 'ToDo',
                'description': notes or f"Work on: {activity.subject}",
                'reference_type': 'Activity',
                'reference_name': activity_name,
                'allocated_to': user,
                'assigned_by': current_user,
                'priority': priority,
                'date': due_date,
                'status': 'Open'
            })
            todo_doc.insert()
            created_todos.append(todo_doc.name)
        
        return {
            'success': True,
            'message': f'Activity assigned to {len(created_todos)} users',
            'created_todos': created_todos
        }
        
    except Exception as e:
        frappe.log_error(f"Error assigning activity to users: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

@frappe.whitelist()
def get_activity_assignments(activity_name):
    """Get all users assigned to an activity"""
    try:
        todos = frappe.get_all(
            'ToDo',
            fields=['allocated_to', 'priority', 'date', 'status', 'assigned_by', 'assigned_by_full_name'],
            filters={
                'reference_type': 'Activity',
                'reference_name': activity_name,
                'status': ['not in', ['Closed', 'Cancelled']]
            }
        )
        
        # Get user details
        assignments = []
        for todo in todos:
            user_doc = frappe.get_doc('User', todo.allocated_to)
            assignments.append({
                'user': todo.allocated_to,
                'full_name': user_doc.full_name,
                'email': user_doc.email,
                'priority': todo.priority,
                'due_date': todo.date,
                'status': todo.status,
                'assigned_by': todo.assigned_by,
                'assigned_by_full_name': todo.assigned_by_full_name
            })
        
        return assignments
        
    except Exception as e:
        frappe.log_error(f"Error getting activity assignments: {str(e)}")
        return []

@frappe.whitelist()
def remove_activity_assignment(activity_name, user):
    """Remove ToDo assignment for activity/user"""
    try:
        current_user = frappe.session.user
        
        # Get activity to check project permissions
        activity = frappe.get_doc('Activity', activity_name)
        project = frappe.get_doc('Project', activity.project)
        
        # Check permissions
        if project.project_manager != current_user and not frappe.has_permission('Activity', 'write'):
            return {
                'success': False,
                'error': 'You do not have permission to remove assignments in this project'
            }
        
        # Find and close the ToDo
        todos = frappe.get_all(
            'ToDo',
            fields=['name'],
            filters={
                'reference_type': 'Activity',
                'reference_name': activity_name,
                'allocated_to': user,
                'status': ['not in', ['Closed', 'Cancelled']]
            }
        )
        
        for todo in todos:
            todo_doc = frappe.get_doc('ToDo', todo.name)
            todo_doc.status = 'Closed'
            todo_doc.save()
        
        return {
            'success': True,
            'message': f'Assignment removed for {user}'
        }
        
    except Exception as e:
        frappe.log_error(f"Error removing activity assignment: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

@frappe.whitelist()
def unapprove_entry(name):
    """Un-approve an approved entry back to draft status (manager function)"""
    try:
        current_user = frappe.session.user
        doc = frappe.get_doc('Timesheet Entry', name)
        
        # Check if user can approve this project
        project_doc = frappe.get_doc('Project', doc.project)
        if project_doc.timesheet_approver != current_user:
            return {
                'success': False,
                'error': 'You do not have approval permissions for this project'
            }
        
        # Only allow un-approving approved entries
        if doc.status != 'Approved':
            return {
                'success': False,
                'error': 'Only approved entries can be un-approved'
            }
        
        # Update entry status back to draft
        doc.status = 'Draft'
        doc.approved_by = ''
        doc.approval_date = None
        doc.approval_notes = f"Un-approved by {current_user} on {frappe.utils.now_datetime()}"
        doc.save()
        
        return {
            'success': True,
            'message': 'Entry un-approved and reverted to draft'
        }
        
    except Exception as e:
        frappe.log_error(f"Error un-approving entry: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

@frappe.whitelist()
def get_approval_dashboard_data(weeks_back=4):
    """Get approval dashboard data for managers"""
    try:
        current_user = frappe.session.user
        
        # Debug logging
        # frappe.log_error("Approval Dashboard Debug", f"get_approval_dashboard_data called by user: {current_user}")
        
        # Get projects where current user is timesheet approver
        projects = frappe.get_all(
            'Project',
            fields=['name', 'project_name', 'timesheet_approver'],
            filters={'timesheet_approver': current_user, 'status': 'Active'}
        )
        
        # frappe.log_error("User Projects Found", f"Found projects for {current_user}: {projects}")
        
        if not projects:
            # Also check if user is Administrator - they should see all projects
            if current_user == 'Administrator':
                all_projects = frappe.get_all(
                    'Project',
                    fields=['name', 'project_name', 'timesheet_approver'],
                    filters={'status': 'Active'}
                )
                # frappe.log_error("Admin All Projects", f"Administrator - all active projects: {all_projects}")
                projects = all_projects
            
            if not projects:
                return {
                    'users': [],
                    'total_pending': 0,
                    'debug_info': f'No projects found for user {current_user}'
                }
        
        project_names = [p.name for p in projects]
        
        # Calculate date range for last N weeks
        from datetime import datetime, timedelta
        end_date = datetime.now().date()
        start_date = end_date - timedelta(weeks=weeks_back)
        
        # Get all entries in date range for managed projects
        # Build full-day datetime window from computed dates
        start_dt = f"{start_date} 00:00:00"
        end_dt = f"{end_date} 23:59:59"

        entries = frappe.get_all(
            'Timesheet Entry',
            fields=['employee', 'status', 'check_in_time', 'name'],
            filters={
                'project': ['in', project_names],
                'check_in_time': ['between', [start_dt, end_dt]]
            }
        )
        
        # Group by user and calculate stats
        user_stats = {}
        total_pending = 0
        
        for entry in entries:
            employee = entry.employee
            if employee not in user_stats:
                user_doc = frappe.get_doc('User', employee)
                user_stats[employee] = {
                    'name': employee,
                    'full_name': user_doc.full_name,
                    'email': user_doc.email,
                    'submitted_count': 0,
                    'draft_count': 0,
                    'approved_count': 0,
                    'latest_submission_date': None,
                    'oldest_pending_date': None,
                    'priority': 'Low'
                }
            
            user_data = user_stats[employee]
            
            if entry.status == 'Submitted':
                user_data['submitted_count'] += 1
                total_pending += 1
                
                # Track submission dates for priority calculation (derive from check_in_time)
                entry_date = frappe.utils.getdate(entry.get('check_in_time'))
                if not user_data['latest_submission_date'] or entry_date > user_data['latest_submission_date']:
                    user_data['latest_submission_date'] = entry_date
                if not user_data['oldest_pending_date'] or entry_date < user_data['oldest_pending_date']:
                    user_data['oldest_pending_date'] = entry_date
                    
            elif entry.status == 'Draft':
                user_data['draft_count'] += 1
            elif entry.status == 'Approved':
                user_data['approved_count'] += 1
            elif entry.status == 'Processed':
                user_data['approved_count'] += 1  # Count processed as approved for display
        
        # Calculate priority for each user
        today = datetime.now().date()
        for user_data in user_stats.values():
            if user_data['submitted_count'] > 0:
                # High priority if submissions are more than 3 days old
                if user_data['oldest_pending_date']:
                    days_old = (today - user_data['oldest_pending_date']).days
                    if days_old > 3:
                        user_data['priority'] = 'High'
                    elif days_old > 1:
                        user_data['priority'] = 'Medium'
                    else:
                        user_data['priority'] = 'Low'
                else:
                    user_data['priority'] = 'Medium'
            elif user_data['draft_count'] > 0:
                # Medium priority for users with only drafts
                user_data['priority'] = 'Medium'
            else:
                user_data['priority'] = 'Low'
        
        # Sort users by priority and pending count
        priority_order = {'High': 3, 'Medium': 2, 'Low': 1}
        sorted_users = sorted(
            user_stats.values(),
            key=lambda x: (priority_order[x['priority']], x['submitted_count']),
            reverse=True
        )
        
        return {
            'users': sorted_users,
            'total_pending': total_pending,
            'date_range': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            }
        }
        
    except Exception as e:
        frappe.log_error(f"Error getting approval dashboard data: {str(e)}")
        return {
            'users': [],
            'total_pending': 0
        }

# Planner API functions

@frappe.whitelist()
def get_user_todos(user=None):
    """Get todos for a specific user or all todos for administrators"""
    
    current_user = frappe.session.user
    
    # If no user specified, use current user
    if not user:
        user = current_user
    
    # Build the query conditions
    conditions = ["status = 'Open'"]
    
    # Administrators can see all todos, others only see their own
    if current_user == "Administrator":
        # Administrator sees all todos
        if user and user != "Administrator":
            # If a specific user is requested, filter by that user
            conditions.append(f"allocated_to = '{user}'")
        # If no specific user or Administrator is requested, show all todos
    else:
        # Non-administrators only see their own todos
        conditions.append(f"allocated_to = '{current_user}'")
    
    where_clause = " AND ".join(conditions)
    
    todos = frappe.db.sql(f"""
        SELECT 
            name,
            description as subject,
            reference_name as project,
            allocated_to,
            priority,
            status,
            creation,
            modified
        FROM `tabToDo`
        WHERE {where_clause}
        ORDER BY priority DESC, creation DESC
    """, as_dict=True)
    
    return todos

@frappe.whitelist()
def get_planner_entries(start_date, end_date, user=None):
    """Get planner entries for a date range and user"""
    
    current_user = frappe.session.user
    
    # If no user specified, use current user
    if not user:
        user = current_user
    
    # Build conditions
    conditions = [
        f"plan_start >= '{start_date} 00:00:00'",
        f"plan_start <= '{end_date} 23:59:59'"
    ]
    
    # Administrators can see all entries, others only see their own
    if current_user == "Administrator":
        if user and user != "Administrator":
            conditions.append(f"user = '{user}'")
    else:
        conditions.append(f"user = '{current_user}'")
    
    where_clause = " AND ".join(conditions)
    
    entries = frappe.db.sql(f"""
        SELECT 
            name,
            user,
            todo,
            project,
            title,
            plan_start,
            plan_end,
            status,
            notes,
            creation,
            modified
        FROM `tabPlanner Entry`
        WHERE {where_clause}
        ORDER BY plan_start ASC
    """, as_dict=True)
    
    return entries

@frappe.whitelist()
def create_planner_entry(user, todo=None, project=None, title="", plan_start="", plan_end="", status="Planned", notes=""):
    """Create a new planner entry"""
    
    try:
        # Truncate title to fit field length limit (140 characters)
        truncated_title = title[:140] if title else ""
        
        doc = frappe.get_doc({
            "doctype": "Planner Entry",
            "user": user,
            "todo": todo,
            "project": project,
            "title": truncated_title,
            "plan_start": plan_start,
            "plan_end": plan_end,
            "status": status,
            "notes": notes
        })
        doc.insert()
        frappe.db.commit()
        
        return {
            "success": True,
            "name": doc.name
        }
    except Exception as e:
        # Use a shorter error message to avoid log truncation issues
        
        frappe.log_error(f"Planner entry creation failed",f"{e}")
        return {
            "success": False,
            "error": e
        }

@frappe.whitelist()
def update_planner_entry(name, **kwargs):
    """Update a planner entry"""
    
    try:
        doc = frappe.get_doc("Planner Entry", name)
        
        # Update fields
        for field, value in kwargs.items():
            if hasattr(doc, field):
                setattr(doc, field, value)
        
        doc.save()
        frappe.db.commit()
        
        return {"success": True}
    except Exception as e:
        frappe.log_error(f"Failed to update planner entry",f"{str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@frappe.whitelist()
def delete_planner_entry(name):
    """Delete a planner entry"""
    
    try:
        frappe.delete_doc("Planner Entry", name)
        frappe.db.commit()
        
        return {"success": True}
    except Exception as e:
        frappe.log_error(f"Failed to delete planner entry",f"{str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@frappe.whitelist()
def complete_planner_entry(name):
    """Mark a planner entry as completed"""
    
    try:
        doc = frappe.get_doc("Planner Entry", name)
        doc.status = "Completed"
        doc.save()
        frappe.db.commit()
        
        return {"success": True}
    except Exception as e:
        frappe.log_error(f"Failed to complete planner entry",f"{str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@frappe.whitelist()
def cancel_planner_entry(name):
    """Mark a planner entry as cancelled"""
    
    try:
        doc = frappe.get_doc("Planner Entry", name)
        doc.status = "Cancelled"
        doc.save()
        frappe.db.commit()
        
        return {"success": True}
    except Exception as e:
        frappe.log_error(f"Failed to cancel planner entry",f"{str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
