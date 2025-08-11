import frappe
import json
from datetime import datetime

# NOTE:
# Assumes a Doctype named "Planner Entry" with fields:
# user (Link User), todo (Link ToDo), project (Link Project),
# plan_start (Datetime), plan_end (Datetime), status (Select),
# title (Data), notes (Text)
#
# We treat plan_start/plan_end as the source of truth (no separate date field).
# All range queries use plan_start between [start_date 00:00:00, end_date 23:59:59].

def _parse_local_dt(value: str) -> datetime:
    """Parse an incoming datetime string as local naive datetime (no timezone conversion)."""
    try:
        s = value.strip()
        if s.endswith('Z'):
            s = s[:-1]
        elif '+' in s:
            s = s.split('+')[0]
        # Normalize "YYYY-MM-DD HH:mm:ss" to "YYYY-MM-DDTHH:mm:ss" if needed
        if len(s) >= 19 and s[10] == ' ':
            s = s[:10] + 'T' + s[11:]
        return datetime.fromisoformat(s).replace(tzinfo=None)
    except Exception:
        return frappe.utils.now_datetime().replace(tzinfo=None)

@frappe.whitelist()
def get_planner_entries(start_date, end_date, user=None):
    """Return planner entries whose plan_start falls within [start 00:00:00, end 23:59:59]."""
    try:
        start_dt = f"{start_date} 00:00:00"
        end_dt = f"{end_date} 23:59:59"
        filters = {
            "plan_start": ["between", [start_dt, end_dt]],
        }
        if user:
            filters["user"] = user

        fields = [
            "name", "user", "todo", "project", "title", "notes",
            "status", "plan_start", "plan_end"
        ]

        entries = frappe.get_all(
            "Planner Entry",
            fields=fields,
            filters=filters,
            order_by="plan_start asc"
        )
        return entries
    except Exception as e:
        frappe.log_error("beforez.get_planner_entries", str(e))
        return []

@frappe.whitelist()
def create_planner_entry(**kwargs):
    """Create a new Planner Entry."""
    try:
        # Default user to current user
        if not kwargs.get("user"):
            kwargs["user"] = frappe.session.user

        # Parse datetime fields if provided as strings
        for key in ("plan_start", "plan_end"):
            val = kwargs.get(key)
            if isinstance(val, str):
                kwargs[key] = _parse_local_dt(val)

        doc = frappe.get_doc({
            "doctype": "Planner Entry",
            **kwargs
        })
        doc.insert()
        return {"success": True, "name": doc.name}
    except Exception as e:
        frappe.log_error("beforez.create_planner_entry", str(e))
        return {"success": False, "error": str(e)}

@frappe.whitelist()
def update_planner_entry(name, **kwargs):
    """Update an existing Planner Entry."""
    try:
        doc = frappe.get_doc("Planner Entry", name)

        # Permission: owner or users with write perm on Planner Entry
        if doc.user != frappe.session.user and not frappe.has_permission("Planner Entry", "write"):
            frappe.throw("You do not have permission to update this planner entry")

        # Parse datetime fields
        for key in ("plan_start", "plan_end"):
            val = kwargs.get(key)
            if isinstance(val, str):
                kwargs[key] = _parse_local_dt(val)

        for key, value in kwargs.items():
            if key == "name":
                continue
            if hasattr(doc, key):
                setattr(doc, key, value)

        doc.save()
        return {"success": True}
    except Exception as e:
        frappe.log_error("beforez.update_planner_entry", str(e))
        return {"success": False, "error": str(e)}

@frappe.whitelist()
def delete_planner_entry(name):
    """Delete a Planner Entry."""
    try:
        doc = frappe.get_doc("Planner Entry", name)

        if doc.user != frappe.session.user and not frappe.has_permission("Planner Entry", "delete"):
            frappe.throw("You do not have permission to delete this planner entry")

        doc.delete()
        return {"success": True}
    except Exception as e:
        frappe.log_error("beforez.delete_planner_entry", str(e))
        return {"success": False, "error": str(e)}

@frappe.whitelist()
def complete_planner_entry(name):
    """Mark a Planner Entry as Completed."""
    try:
        doc = frappe.get_doc("Planner Entry", name)
        if doc.user != frappe.session.user and not frappe.has_permission("Planner Entry", "write"):
            frappe.throw("You do not have permission to update this planner entry")
        doc.status = "Completed"
        doc.save()
        return {"success": True}
    except Exception as e:
        frappe.log_error("beforez.complete_planner_entry", str(e))
        return {"success": False, "error": str(e)}

@frappe.whitelist()
def cancel_planner_entry(name):
    """Mark a Planner Entry as Cancelled."""
    try:
        doc = frappe.get_doc("Planner Entry", name)
        if doc.user != frappe.session.user and not frappe.has_permission("Planner Entry", "write"):
            frappe.throw("You do not have permission to update this planner entry")
        doc.status = "Cancelled"
        doc.save()
        return {"success": True}
    except Exception as e:
        frappe.log_error("beforez.cancel_planner_entry", str(e))
        return {"success": False, "error": str(e)}

@frappe.whitelist()
def get_user_todos(user=None):
    """
    Return open ToDos for the user with optional project derivation if ToDo references an Activity.
    We keep fields minimal for the palette.
    """
    try:
        if not user:
            user = frappe.session.user

        todos = frappe.get_all(
            "ToDo",
            fields=["name", "description", "reference_type", "reference_name"],
            filters={
                "allocated_to": user,
                "status": ["not in", ["Closed", "Cancelled"]],
            },
            order_by="modified desc"
        )

        # Try to derive project when ToDo references an Activity
        result = []
        for t in todos:
            project = None
            if t.get("reference_type") == "Activity" and t.get("reference_name"):
                try:
                    activity = frappe.get_all(
                        "Activity",
                        fields=["project", "subject"],
                        filters={"name": t["reference_name"]},
                        limit_page_length=1
                    )
                    if activity:
                        project = activity[0].get("project")
                except Exception:
                    pass

            result.append({
                "name": t["name"],
                "subject": (t.get("description") or "").strip()[:140],
                "project": project,
                "reference_type": t.get("reference_type"),
                "reference_name": t.get("reference_name"),
            })

        return result
    except Exception as e:
        frappe.log_error("beforez.get_user_todos", str(e))
        return []
