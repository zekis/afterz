import frappe

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
