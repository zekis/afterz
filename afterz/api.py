import frappe
import json
from datetime import datetime, timedelta

@frappe.whitelist()
def get_timesheet_entries(start_date, end_date, employee=None):
    """Get timesheet entries for a date range"""
    filters = {
        'date': ['between', [start_date, end_date]]
    }
    
    if employee:
        filters['employee'] = employee
    
    fields = [
        'name', 'employee', 'date', 'status', 'is_active',
        'project', 'activity', 'location', 'check_in_time',
        'check_out_time', 'duration_hours', 'description', 'notes'
    ]
    
    entries = frappe.get_all(
        'Timesheet Entry',
        fields=fields,
        filters=filters,
        order_by='date desc, check_in_time desc'
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
                        frappe.log_error(f"Setting {key} to {value} for doc {doc.name}")
                        
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
