import frappe
import json

from afterz.permissions import CLOSED_PROJECT_STATUSES, is_site_administrator

# Savepoint names for the two endpoints below that write in a loop AND keep a
# {'success': False} return contract. They need a savepoint precisely because
# they return normally on failure, and a normal return is what makes frappe
# commit (frappe/app.py: sync_database -> db.commit() on the success path). The
# timesheet bulk pair in afterz_api.py does not need one -- it re-raises, so
# frappe's end-of-request rollback undoes everything by itself.
#
# One savepoint is taken per request, so neither is released explicitly: the
# transaction's commit or rollback drops it. (frappe's own savepoint() helper
# releases because it is meant to be taken inside a loop.)
ASSIGN_SAVEPOINT = 'afterz_assign_activity'
REMOVE_ASSIGNMENT_SAVEPOINT = 'afterz_remove_assignment'

@frappe.whitelist()
def get_projects():
    """Get active projects"""
    try:
        projects = frappe.get_all(
            'Project',
            fields=['name', 'project_name', 'customer', 'status', 'project_lead', 'division', 'project_type'],
            filters={'status': ['not in', ['Closed', 'Cancelled']]},
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
        filters = {'status': ['not in', ['Closed', 'Cancelled']]}
        if project:
            filters['project'] = project
        
        activities = frappe.get_all(
            'Activity',
            fields=[
                'name', 'activity_name', 'project', 'status',
                'description', 'estimated_hours'
            ],
            filters=filters,
            order_by='activity_name asc'
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
def get_user_project_permissions(user=None):
    """Whether `user` may approve timesheets, and the projects that lets them.

    This answers the rule in afterz.permissions (afterz#3). It used to resolve
    `user` and then never read it again: `can_approve` was `len(projects) > 0`
    over *every* open project, so it was True for every logged-in user as soon
    as the site had one open project. The UI believed it -- BulkActions shows
    "Approve All" on it and TreeUserSelector shows the whole-team user picker
    on it -- while approve_all_entries refused anyone who was not an approver.

    `projects` is now the user's approval scope, not the project list. Nothing
    in the frontend reads it today (checked), and get_projects() is the
    endpoint for "all open projects".
    """
    try:
        if not user:
            user = frappe.session.user

        if is_site_administrator(user):
            # Administrators approve across every project, so their scope is
            # the open projects rather than the ones naming them.
            projects = frappe.get_all(
                'Project',
                fields=['name', 'project_name', 'customer', 'status', 'project_lead', 'division', 'project_type'],
                filters={'status': ['not in', CLOSED_PROJECT_STATUSES]}
            )
            return {
                'can_approve': True,
                'projects': projects
            }

        projects = frappe.get_all(
            'Project',
            fields=['name', 'project_name', 'customer', 'status', 'project_lead', 'division', 'project_type'],
            filters={
                'timesheet_approver': user,
                'status': ['not in', CLOSED_PROJECT_STATUSES]
            }
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
                'name', 'activity_name', 'project', 'status',
                'description', 'estimated_hours'
            ],
            filters={
                'name': ['in', activity_names],
                'status': ['not in', ['Closed', 'Cancelled']]
            },
            order_by='activity_name asc'
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
def get_assignable_activities(project_lead=None):
    """Get activities that can be assigned by project lead"""
    try:
        if not project_lead:
            project_lead = frappe.session.user
        
        # Get projects managed by this user
        projects = frappe.get_all(
            'Project',
            fields=['name'],
            filters={'project_lead': project_lead, 'status': ['not in', ['Closed', 'Cancelled']]}
        )

        # get projects where user is timesheet approver
        project_timesheet_approver = frappe.get_all(
            'Project',
            fields=['name'],
            filters={'timesheet_approver': project_lead, 'status': ['not in', ['Closed', 'Cancelled']]}
        )

        projects.extend(project_timesheet_approver)
        
        # If no projects found, return empty list
        if not projects:
            return []
        
        project_names = [p.name for p in projects]
        
        # Get activities from these projects
        activities = frappe.get_all(
            'Activity',
            fields=[
                'name', 'activity_name', 'project', 'status',
                'description', 'estimated_hours'
            ],
            filters={
                'project': ['in', project_names],
                'status': ['not in', ['Closed', 'Cancelled']]
            },
            order_by='project asc, activity_name asc'
        )
        
        return activities
        
    except Exception as e:
        frappe.log_error(f"Error getting assignable activities: {str(e)}")
        return []

@frappe.whitelist()
def assign_activity_to_users(activity_name, user_list, priority="Medium", due_date=None, notes=""):
    """Assign activity to multiple users via ToDo records.

    The loop below inserts one ToDo per user. It is wrapped in a savepoint so
    that a failure part-way through leaves none of them behind: this endpoint
    reports failure by RETURNING {'success': False}, and a normal return is
    exactly what makes frappe commit the rows the loop already managed to
    insert. Without the savepoint the flag was false while the work was half
    done -- and the caller, which does read the flag, then showed an error and
    did not refresh, so the user saw no assignments where some existed.
    """
    savepoint_set = False
    try:
        frappe.db.savepoint(ASSIGN_SAVEPOINT)
        savepoint_set = True
        current_user = frappe.session.user
        
        # Get activity to check project permissions
        activity = frappe.get_doc('Activity', activity_name)
        project = frappe.get_doc('Project', activity.project)
        
        # Check if current user can assign activities in this project
        if project.project_lead != current_user and not frappe.has_permission('Activity', 'write'):
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
                'description': notes or f"Work on: {activity.activity_name}",
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
        # Undo the ToDos this loop already inserted, so the flag below is true.
        #
        # Unlike the timesheet bulk pair, this endpoint keeps its return
        # contract rather than raising: its callers really do read the flag --
        # ActivityAssignmentModal, ManageAssignmentsModal and
        # pages/ManageAssignments all branch on `result.success` and show
        # `result.error`. Raising here would break three call sites to fix a
        # problem a rollback fixes.
        #
        # ORDER MATTERS: log_error ends in error_log.insert()
        # (frappe/utils/error.py), i.e. the Error Log row is written into the
        # current transaction. Logging first and rolling back afterwards would
        # discard the diagnostic along with the assignments. Roll back, then log.
        if savepoint_set:
            frappe.db.rollback(save_point=ASSIGN_SAVEPOINT)
        frappe.log_error(
            title='afterz.assign_activity_to_users failed',
            message=frappe.get_traceback(),
        )
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
    """Remove ToDo assignment for activity/user.

    Usually one ToDo, but the query is not limited to one and the app does not
    stop a user being assigned twice, so this closes however many it finds --
    in a loop, under a savepoint, for the same reason as
    assign_activity_to_users above.
    """
    savepoint_set = False
    try:
        frappe.db.savepoint(REMOVE_ASSIGNMENT_SAVEPOINT)
        savepoint_set = True
        current_user = frappe.session.user
        
        # Get activity to check project permissions
        activity = frappe.get_doc('Activity', activity_name)
        project = frappe.get_doc('Project', activity.project)
        
        # Check permissions
        if project.project_lead != current_user and not frappe.has_permission('Activity', 'write'):
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
        # Roll back before logging; see assign_activity_to_users above for why
        # this endpoint rolls back instead of raising, and why the order of
        # these two calls is not arbitrary.
        if savepoint_set:
            frappe.db.rollback(save_point=REMOVE_ASSIGNMENT_SAVEPOINT)
        frappe.log_error(
            title='afterz.remove_activity_assignment failed',
            message=frappe.get_traceback(),
        )
        return {
            'success': False,
            'error': str(e)
        }
