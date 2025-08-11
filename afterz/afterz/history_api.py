import frappe
from frappe import _
from frappe.utils import now, get_fullname
import json

def format_field_change(field_name, old_value, new_value):
    """Format a field change with before/after values"""
    # Handle None values
    old_display = "None" if old_value is None else str(old_value)
    new_display = "None" if new_value is None else str(new_value)
    
    # Clean up values by removing timestamps and usernames that are redundant
    old_display = clean_field_value(old_display)
    new_display = clean_field_value(new_display)
    
    # Special formatting for specific fields
    if field_name == "status":
        return f"Status: {old_display} → {new_display}"
    elif field_name in ["plan_start", "plan_end", "check_in_time", "check_out_time"]:
        # Format datetime fields - show only time if same date, otherwise show date + time
        if old_value and new_value:
            try:
                from frappe.utils import format_datetime
                old_formatted = format_datetime(old_value, "HH:mm")
                new_formatted = format_datetime(new_value, "HH:mm")
                field_display = field_name.replace("_", " ").title()
                return f"{field_display}: {old_formatted} → {new_formatted}"
            except:
                pass
        field_display = field_name.replace("_", " ").title()
        return f"{field_display}: {old_display} → {new_display}"
    elif field_name == "duration_hours":
        return f"Duration: {old_display}h → {new_display}h"
    elif field_name in ["approved_by", "approval_date", "approval_notes"]:
        # Skip these fields as they're often redundant with the action context
        return None
    else:
        # Generic field formatting
        field_display = field_name.replace("_", " ").title()
        return f"{field_display}: {old_display} → {new_display}"

def clean_field_value(value):
    """Clean field values by removing redundant information"""
    if not value or value == "None":
        return value
    
    # Remove timestamps from approval notes and similar fields
    import re
    
    # Remove patterns like "by Administrator on 2025-08-08 15:22:26.808608"
    value = re.sub(r'\s+on\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(\.\d+)?', '', value)
    
    # Remove patterns like "Administrator on 2025-08-08"
    value = re.sub(r'\s+on\s+\d{4}-\d{2}-\d{2}', '', value)
    
    # Remove standalone timestamps
    value = re.sub(r'\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(\.\d+)?', '', value)
    
    # Clean up extra whitespace
    value = ' '.join(value.split())
    
    return value

@frappe.whitelist()
def get_document_history(doctype, name):
    """Get document version history and comments"""
    try:
        # Check if user has read permission
        if not frappe.has_permission(doctype, "read", name):
            frappe.throw(_("Not permitted to read {0}").format(doctype))
        
        # Get document versions from Version doctype
        versions = frappe.get_all(
            "Version",
            filters={
                "ref_doctype": doctype,
                "docname": name
            },
            fields=["name", "owner", "creation", "data"],
            order_by="creation desc"
        )
        
        # Process version data
        history = []
        for version in versions:
            try:
                version_data = json.loads(version.data) if version.data else {}
                changed_fields = []
                change_type = "modified"
                
                if "changed" in version_data and version_data["changed"]:
                    # "changed" is a list of [field_name, old_value, new_value] arrays
                    if isinstance(version_data["changed"], list):
                        changed_fields = []
                        for change in version_data["changed"]:
                            if len(change) >= 3:
                                field_name, old_value, new_value = change[0], change[1], change[2]
                                # Format the change with before/after values
                                change_desc = format_field_change(field_name, old_value, new_value)
                                if change_desc:  # Only add non-None descriptions
                                    changed_fields.append(change_desc)
                            elif len(change) > 0:
                                changed_fields.append(change[0])
                    else:
                        changed_fields = list(version_data["changed"].keys()) if isinstance(version_data["changed"], dict) else []
                
                if "added" in version_data and version_data["added"]:
                    # Document was created
                    change_type = "created"
                    changed_fields = ["Document created"]
                elif not changed_fields:
                    # Fallback for other changes
                    if "removed" in version_data and version_data["removed"]:
                        changed_fields = ["Fields removed"]
                    else:
                        changed_fields = ["Document updated"]
                
                history.append({
                    "name": version.name,
                    "owner": version.owner,
                    "creation": version.creation,
                    "changes": changed_fields,
                    "change_type": change_type
                })
            except (json.JSONDecodeError, KeyError, TypeError) as e:
                # Log the error but continue processing other versions
                frappe.log_error(f"Error processing version {version.name}: {str(e)}")
                continue
        
        # Get comments from Comment doctype
        comments = frappe.get_all(
            "Comment",
            filters={
                "reference_doctype": doctype,
                "reference_name": name,
                "comment_type": "Comment"
            },
            fields=["name", "owner", "creation", "content", "comment_type"],
            order_by="creation desc"
        )
        
        # Add full names to comments
        for comment in comments:
            comment["full_name"] = get_fullname(comment["owner"])
        
        return {
            "history": history,
            "comments": comments
        }
        
    except Exception as e:
        frappe.log_error(f"Error getting document history: {str(e)}")
        frappe.throw(_("Failed to load document history"))

@frappe.whitelist()
def add_comment(doctype, name, content):
    """Add a comment to a document"""
    try:
        # Check if user has read permission (minimum required to comment)
        if not frappe.has_permission(doctype, "read", name):
            frappe.throw(_("Not permitted to comment on {0}").format(doctype))
        
        # Create comment
        comment = frappe.get_doc({
            "doctype": "Comment",
            "comment_type": "Comment",
            "reference_doctype": doctype,
            "reference_name": name,
            "content": content,
            "comment_email": frappe.session.user,
            "comment_by": get_fullname(frappe.session.user)
        })
        
        comment.insert(ignore_permissions=True)
        
        return {
            "success": True,
            "comment": {
                "name": comment.name,
                "owner": comment.owner,
                "creation": comment.creation,
                "content": comment.content,
                "full_name": get_fullname(comment.owner)
            }
        }
        
    except Exception as e:
        frappe.log_error(f"Error adding comment: {str(e)}")
        frappe.throw(_("Failed to add comment"))

@frappe.whitelist()
def get_document_comments(doctype, name):
    """Get only comments for a document"""
    try:
        # Check if user has read permission
        if not frappe.has_permission(doctype, "read", name):
            frappe.throw(_("Not permitted to read {0}").format(doctype))
        
        # Get comments from Comment doctype
        comments = frappe.get_all(
            "Comment",
            filters={
                "reference_doctype": doctype,
                "reference_name": name,
                "comment_type": "Comment"
            },
            fields=["name", "owner", "creation", "content", "comment_type"],
            order_by="creation desc"
        )
        
        # Add full names to comments
        for comment in comments:
            comment["full_name"] = get_fullname(comment["owner"])
        
        return comments
        
    except Exception as e:
        frappe.log_error(f"Error getting document comments: {str(e)}")
        frappe.throw(_("Failed to load document comments"))
