import frappe
import json

def get_context(context):
    """Get context for the Whatz todo management app"""
    # Ensure user is logged in
    if frappe.session.user == 'Guest':
        frappe.throw('Please login to access the todo management application', frappe.PermissionError)
    
    # Get minimal boot data for the frontend
    boot_data = {
        'sitename': frappe.local.site,
        'csrf_token': frappe.sessions.get_csrf_token(),
        'user': {
            'name': frappe.session.user,
            'full_name': frappe.get_value('User', frappe.session.user, 'full_name') or frappe.session.user,
            'email': frappe.get_value('User', frappe.session.user, 'email') or frappe.session.user,
            'user_image': frappe.get_value('User', frappe.session.user, 'user_image')
        }
    }
    
    context.boot = boot_data
    
    # Page metadata
    context.title = "Whatz - What Needs to be Done"
    context.description = "Manage what needs to be done"
    
    # Page layout flags
    context.no_cache = 1
    context.no_breadcrumbs = 1
    context.full_width = True
    context.hide_login = 1
    
    return context
