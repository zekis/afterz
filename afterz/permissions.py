"""Who may run the bulk timesheet actions.

The rule is the owner's, quoted from zekis/afterz#3:

    "As an admin or timesheet user, i want to be able to approve all and submit
    all. Admin and users can submit all, Only admins can approve all. Admins
    are either the site administrator or users assigned to as timesheet
    approver"

It lives in one module because three callers need the same answer and must not
drift apart:

  * ``afterz_api.submit_week_entries``  -- own week, or anyone's if admin
  * ``afterz_api.approve_all_entries``  -- admins only
  * ``shared_api.get_user_project_permissions`` -- decides whether the UI
    offers the buttons at all

Before this module the three disagreed: the approve endpoint applied the
timesheet_approver half of the rule and omitted the administrator half, the
submit endpoint applied no rule, and the UI helper applied none while
reporting that it had.
"""

import frappe

#: The frappe site administrator account. The owner names it as an admin for
#: this rule, so it is an admin here even when it approves no project.
SITE_ADMINISTRATOR = "Administrator"

#: A project in one of these states has no live timesheets left to approve.
CLOSED_PROJECT_STATUSES = ["Closed", "Cancelled"]


def _resolved(user):
    """The user to judge: the one named, else whoever is logged in."""
    return user or frappe.session.user


def is_site_administrator(user=None):
    """True for the frappe site administrator account."""
    return _resolved(user) == SITE_ADMINISTRATOR


def approver_projects(user=None):
    """Names of the open projects naming ``user`` as timesheet_approver.

    This is a *scope*, not an answer about admin-ness. It is empty for the site
    administrator unless they happen to be named on a project, so a caller must
    ask :func:`is_site_administrator` rather than read an empty list as "this
    person approves nothing".
    """
    user = _resolved(user)
    rows = frappe.get_all(
        "Project",
        fields=["name"],
        filters={
            "timesheet_approver": user,
            "status": ["not in", CLOSED_PROJECT_STATUSES],
        },
    )
    return [row["name"] for row in rows]


def is_timesheet_admin(user=None):
    """True if ``user`` may approve timesheets, per the rule above.

    Either half is enough: the site administrator, or a named timesheet
    approver on at least one open project.
    """
    user = _resolved(user)
    if is_site_administrator(user):
        return True
    return bool(approver_projects(user))
