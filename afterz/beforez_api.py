import frappe

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
        frappe.log_error(f"Planner entry creation failed", f"{e}")
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
        frappe.log_error(f"Failed to update planner entry", f"{str(e)}")
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
        frappe.log_error(f"Failed to delete planner entry", f"{str(e)}")
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
        frappe.log_error(f"Failed to complete planner entry", f"{str(e)}")
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
        frappe.log_error(f"Failed to cancel planner entry", f"{str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
