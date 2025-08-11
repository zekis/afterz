import frappe
from datetime import datetime, timedelta

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
def get_approval_dashboard_data():
    """Get pending approval counts for the current user"""
    try:
        current_user = frappe.session.user
        
        # Get projects where current user is timesheet approver
        projects = frappe.get_all(
            'Project',
            fields=['name'],
            filters={'timesheet_approver': current_user,
                     'status': ['not in', ['Closed', 'Cancelled']]
                     }
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
            filters={'timesheet_approver': current_user, 'status': ['not in', ['Closed', 'Cancelled']]}
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
            filters={'timesheet_approver': current_user, 'status': ['not in', ['Closed', 'Cancelled']]}
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
        
        # Get projects where current user is timesheet approver
        projects = frappe.get_all(
            'Project',
            fields=['name', 'project_name', 'timesheet_approver'],
            filters={'timesheet_approver': current_user, 'status': ['not in', ['Closed', 'Cancelled']]}
        )
        
        if not projects:
            # Also check if user is Administrator - they should see all projects
            if current_user == 'Administrator':
                all_projects = frappe.get_all(
                    'Project',
                    fields=['name', 'project_name', 'timesheet_approver'],
                    filters={'status': ['not in', ['Closed', 'Cancelled']]}
                )
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

@frappe.whitelist()
def get_user_pending_approvals(employee):
    """Get pending approval entries for a specific user"""
    try:
        current_user = frappe.session.user
        
        # Get projects where current user is timesheet approver
        projects = frappe.get_all(
            'Project',
            fields=['name'],
            filters={'timesheet_approver': current_user, 'status': ['not in', ['Closed', 'Cancelled']]}
        )
        
        # Also check if user is Administrator - they should see all projects
        if not projects and current_user == 'Administrator':
            projects = frappe.get_all(
                'Project',
                fields=['name'],
                filters={'status': ['not in', ['Closed', 'Cancelled']]}
            )
        
        if not projects:
            return []
        
        project_names = [p.name for p in projects]
        
        # Get submitted entries for this employee in managed projects
        entries = frappe.get_all(
            'Timesheet Entry',
            fields=[
                'name', 'employee', 'project', 'activity', 
                'check_in_time', 'check_out_time', 'duration_hours', 
                'status', 'description'
            ],
            filters={
                'employee': employee,
                'status': 'Submitted',
                'project': ['in', project_names]
            },
            order_by='check_in_time desc'
        )
        
        # Add week information for grouping
        for entry in entries:
            check_in_date = frappe.utils.getdate(entry.check_in_time)
            # Calculate week start (Monday) and end (Sunday)
            week_start = check_in_date - timedelta(days=check_in_date.weekday())
            week_end = week_start + timedelta(days=6)
            
            entry['week_start'] = week_start.isoformat()
            entry['week_end'] = week_end.isoformat()
            
            # Get employee name
            employee_doc = frappe.get_doc('User', employee)
            entry['employee_name'] = employee_doc.full_name
        
        return entries
        
    except Exception as e:
        frappe.log_error(f"Error getting user pending approvals: {str(e)}")
        return []
