"""Who may submit-all and approve-all (zekis/afterz#3).

The rule, in the owner's words:

    "Admin and users can submit all, Only admins can approve all. Admins are
    either the site administrator or users assigned to as timesheet approver"

Run it from the repository root, with no bench and no frappe installed:

    python3 -m unittest discover -s tests -t . -v

Every test below fails against the code as it stood before the fix, except
where it is marked as pinning behaviour that was already right. The four that
matter most, because each was a way to act on data you are not entitled to:

  * an ordinary user was told `can_approve: True`
  * ...so the UI offered them "Approve All" and the whole-team user picker
  * `submit_week_entries` submitted anybody's drafts, for anybody
  * the site administrator -- an admin by the owner's rule -- could not approve
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.frappe_stub import PermissionError as StubPermissionError  # noqa: E402
from tests.frappe_stub import install  # noqa: E402

ADMIN = "Administrator"
APPROVER = "approver@tierneymorris.com.au"
OTHER_APPROVER = "other.approver@tierneymorris.com.au"
CLOSED_ONLY = "closed.project.approver@tierneymorris.com.au"
ORDINARY = "ordinary.user@tierneymorris.com.au"
WORKER = "worker@tierneymorris.com.au"

WEEK_START = "2026-10-05"
WEEK_END = "2026-10-11"

PROJECT_FIELDS = {
    "project_name": "n/a",
    "customer": "SGC Australia",
    "project_lead": None,
    "division": None,
    "project_type": None,
}


def projects():
    return [
        dict(name="P-OPEN-A", status="Open", timesheet_approver=APPROVER, **PROJECT_FIELDS),
        dict(name="P-OPEN-B", status="Open", timesheet_approver=OTHER_APPROVER, **PROJECT_FIELDS),
        # An approver on nothing but a closed project is not an admin.
        dict(name="P-CLOSED", status="Closed", timesheet_approver=CLOSED_ONLY, **PROJECT_FIELDS),
    ]


def entries():
    """One worker's entries. Only TE-SUB-A, TE-SUB-B and TE-SUB-NOPROJ are
    submitted inside the week; the rest are there to be left alone."""
    return [
        dict(name="TE-SUB-A", employee=WORKER, project="P-OPEN-A",
             status="Submitted", check_in_time="2026-10-06 09:00:00"),
        dict(name="TE-SUB-B", employee=WORKER, project="P-OPEN-B",
             status="Submitted", check_in_time="2026-10-06 10:00:00"),
        # No project at all: nobody is its timesheet_approver.
        dict(name="TE-SUB-NOPROJ", employee=WORKER, project=None,
             status="Submitted", check_in_time="2026-10-08 09:00:00"),
        dict(name="TE-DRAFT-IN", employee=WORKER, project="P-OPEN-A",
             status="Draft", check_in_time="2026-10-07 09:00:00"),
        dict(name="TE-DRAFT-OUT", employee=WORKER, project="P-OPEN-A",
             status="Draft", check_in_time="2026-09-01 09:00:00"),
        dict(name="TE-SUB-OUT", employee=WORKER, project="P-OPEN-A",
             status="Submitted", check_in_time="2026-09-01 10:00:00"),
        # Somebody else's week, same project and week. Must never be touched.
        dict(name="TE-OTHER-EMP", employee=ORDINARY, project="P-OPEN-A",
             status="Submitted", check_in_time="2026-10-06 09:00:00"),
    ]


class Base(unittest.TestCase):
    def setUp(self):
        self.frappe = install()
        self.frappe.tables["Project"] = projects()
        self.frappe.tables["Timesheet Entry"] = entries()

        import afterz.afterz_api as afterz_api
        import afterz.permissions as permissions
        import afterz.shared_api as shared_api

        self.permissions = permissions
        self.shared_api = shared_api
        self.afterz_api = afterz_api

    def as_user(self, user):
        self.frappe.session.user = user

    def status_of(self, name):
        return self.frappe.get_value("Timesheet Entry", name, "status")

    def statuses(self):
        return {row["name"]: row["status"] for row in self.frappe.tables["Timesheet Entry"]}


class TestWhoIsAnAdmin(Base):
    def test_the_site_administrator_is_an_admin_with_no_projects_at_all(self):
        """The half of the rule the approve endpoint left out. The administrator
        is named as an admin by the owner, so an empty Project table is enough."""
        self.frappe.tables["Project"] = []
        self.assertTrue(self.permissions.is_timesheet_admin(ADMIN))

    def test_a_named_timesheet_approver_is_an_admin(self):
        self.assertTrue(self.permissions.is_timesheet_admin(APPROVER))

    def test_an_ordinary_user_is_not_an_admin(self):
        self.assertFalse(self.permissions.is_timesheet_admin(ORDINARY))

    def test_an_approver_on_only_a_closed_project_is_not_an_admin(self):
        """A closed project has no live timesheets, so approving it confers
        nothing. Pins the `status not in` half of the filter."""
        self.assertFalse(self.permissions.is_timesheet_admin(CLOSED_ONLY))

    def test_admin_ness_falls_back_to_the_session_user(self):
        self.as_user(APPROVER)
        self.assertTrue(self.permissions.is_timesheet_admin())
        self.as_user(ORDINARY)
        self.assertFalse(self.permissions.is_timesheet_admin())

    def test_approver_projects_is_a_scope_and_is_empty_for_the_administrator(self):
        """Why is_site_administrator is asked separately: an empty scope does
        not mean "approves nothing" for the administrator."""
        self.assertEqual(self.permissions.approver_projects(APPROVER), ["P-OPEN-A"])
        self.assertEqual(self.permissions.approver_projects(ADMIN), [])
        self.assertTrue(self.permissions.is_timesheet_admin(ADMIN))


class TestCanApproveReportedToTheUI(Base):
    """get_user_project_permissions gates two things in the frontend:
    BulkActions shows "Approve All" on it, and TreeUserSelector shows the
    whole-team user picker on it."""

    def test_an_ordinary_user_cannot_approve(self):
        """THE BUG. can_approve was `len(projects) > 0` over every open project,
        so it was True for everyone as soon as the site had one open project."""
        self.as_user(ORDINARY)
        self.assertEqual(self.shared_api.get_user_project_permissions()["can_approve"], False)

    def test_an_ordinary_user_is_offered_no_approval_scope(self):
        self.as_user(ORDINARY)
        self.assertEqual(self.shared_api.get_user_project_permissions()["projects"], [])

    def test_an_approver_can_approve_and_is_scoped_to_their_own_projects(self):
        self.as_user(APPROVER)
        result = self.shared_api.get_user_project_permissions()
        self.assertTrue(result["can_approve"])
        self.assertEqual([p["name"] for p in result["projects"]], ["P-OPEN-A"])

    def test_the_administrator_can_approve_across_every_open_project(self):
        self.as_user(ADMIN)
        result = self.shared_api.get_user_project_permissions()
        self.assertTrue(result["can_approve"])
        self.assertEqual(
            sorted(p["name"] for p in result["projects"]), ["P-OPEN-A", "P-OPEN-B"]
        )

    def test_it_reads_the_user_it_was_given_rather_than_the_session(self):
        """It took a `user`, resolved it, and never looked at it again. The
        argument was decoration: every caller got the session user's answer,
        and the session user's answer was "yes" regardless."""
        self.as_user(ORDINARY)
        self.assertTrue(self.shared_api.get_user_project_permissions(user=APPROVER)["can_approve"])
        self.as_user(APPROVER)
        self.assertFalse(self.shared_api.get_user_project_permissions(user=ORDINARY)["can_approve"])

    def test_an_approver_on_only_a_closed_project_cannot_approve(self):
        self.as_user(CLOSED_ONLY)
        self.assertFalse(self.shared_api.get_user_project_permissions()["can_approve"])


class TestSubmitAll(Base):
    def test_a_user_may_submit_their_own_week(self):
        self.as_user(WORKER)
        result = self.afterz_api.submit_week_entries(WORKER, WEEK_START, WEEK_END)
        self.assertTrue(result["success"])
        self.assertEqual(result["count"], 1)
        self.assertEqual(self.status_of("TE-DRAFT-IN"), "Submitted")

    def test_submitting_your_own_week_leaves_drafts_outside_it_alone(self):
        self.as_user(WORKER)
        self.afterz_api.submit_week_entries(WORKER, WEEK_START, WEEK_END)
        self.assertEqual(self.status_of("TE-DRAFT-OUT"), "Draft")

    def test_an_ordinary_user_may_not_submit_somebody_elses_week(self):
        """THE BUG. This endpoint made no permission check of any kind, while
        update_timesheet_entry and delete_timesheet_entry next to it have
        always guarded the single-entry case."""
        self.as_user(ORDINARY)
        with self.assertRaises(StubPermissionError):
            self.afterz_api.submit_week_entries(WORKER, WEEK_START, WEEK_END)

    def test_a_refused_submit_writes_nothing(self):
        """The point of checking before the loop rather than inside it."""
        self.as_user(ORDINARY)
        before = self.statuses()
        with self.assertRaises(StubPermissionError):
            self.afterz_api.submit_week_entries(WORKER, WEEK_START, WEEK_END)
        self.assertEqual(self.statuses(), before)
        self.assertEqual(self.frappe.saved, [])

    def test_a_refusal_is_not_logged_as_an_application_error(self):
        """Checked before the try block, so it is not swallowed by the except
        and filed in the Error Log as if the app had broken."""
        self.as_user(ORDINARY)
        with self.assertRaises(StubPermissionError):
            self.afterz_api.submit_week_entries(WORKER, WEEK_START, WEEK_END)
        self.assertEqual(self.frappe.errors, [])

    def test_an_approver_may_submit_somebody_elses_week(self):
        self.as_user(APPROVER)
        result = self.afterz_api.submit_week_entries(WORKER, WEEK_START, WEEK_END)
        self.assertTrue(result["success"])
        self.assertEqual(self.status_of("TE-DRAFT-IN"), "Submitted")

    def test_the_administrator_may_submit_somebody_elses_week(self):
        self.as_user(ADMIN)
        result = self.afterz_api.submit_week_entries(WORKER, WEEK_START, WEEK_END)
        self.assertTrue(result["success"])
        self.assertEqual(self.status_of("TE-DRAFT-IN"), "Submitted")

    def test_an_empty_week_is_reported_rather_than_refused(self):
        """Already-correct behaviour, pinned: nothing to do is a success."""
        self.as_user(WORKER)
        self.frappe.tables["Timesheet Entry"] = []
        result = self.afterz_api.submit_week_entries(WORKER, WEEK_START, WEEK_END)
        self.assertTrue(result["success"])
        self.assertEqual(result["count"], 0)


class TestApproveAll(Base):
    def test_an_ordinary_user_may_not_approve(self):
        self.as_user(ORDINARY)
        with self.assertRaises(StubPermissionError):
            self.afterz_api.approve_all_entries(WORKER, WEEK_START, WEEK_END)

    def test_a_refused_approval_writes_nothing(self):
        self.as_user(ORDINARY)
        before = self.statuses()
        with self.assertRaises(StubPermissionError):
            self.afterz_api.approve_all_entries(WORKER, WEEK_START, WEEK_END)
        self.assertEqual(self.statuses(), before)
        self.assertEqual(self.frappe.saved, [])

    def test_a_refusal_raises_rather_than_returning_success_false(self):
        """It used to return {'success': False, ...}, and no caller of THIS
        endpoint reads that flag -- BulkActions, PendingApprovals and
        ApprovalDashboardModal all await the call and only report a thrown error
        -- so a refusal was a silent no-op in the UI.

        Narrowed from "no caller reads that flag", which was too broad: the
        assignment endpoints in shared_api really are read this way, by three
        call sites that branch on result.success. The flag is a convention in
        this app, which is why its absence here was a miss and not a style. See
        test_bulk_atomicity, where that difference decides the fix."""
        self.as_user(ORDINARY)
        with self.assertRaises(StubPermissionError):
            self.afterz_api.approve_all_entries(WORKER, WEEK_START, WEEK_END)

    def test_the_administrator_may_approve(self):
        """THE BUG. The gate was Project.timesheet_approver == session user, so
        the administrator -- who is named an admin by the rule -- was refused
        with "You do not have approval permissions for any projects"."""
        self.as_user(ADMIN)
        result = self.afterz_api.approve_all_entries(WORKER, WEEK_START, WEEK_END)
        self.assertTrue(result["success"])
        self.assertEqual(result["count"], 3)

    def test_the_administrator_approves_across_projects_they_do_not_lead(self):
        self.as_user(ADMIN)
        self.afterz_api.approve_all_entries(WORKER, WEEK_START, WEEK_END)
        self.assertEqual(self.status_of("TE-SUB-A"), "Approved")
        self.assertEqual(self.status_of("TE-SUB-B"), "Approved")

    def test_only_the_administrator_can_approve_an_entry_with_no_project(self):
        """Stated rather than implied. An `in` filter over an approver's
        projects can never match a null project, so these entries are
        otherwise unapprovable; the administrator's query omits the filter."""
        self.as_user(APPROVER)
        self.afterz_api.approve_all_entries(WORKER, WEEK_START, WEEK_END)
        self.assertEqual(self.status_of("TE-SUB-NOPROJ"), "Submitted")

        self.as_user(ADMIN)
        self.afterz_api.approve_all_entries(WORKER, WEEK_START, WEEK_END)
        self.assertEqual(self.status_of("TE-SUB-NOPROJ"), "Approved")

    def test_an_approver_is_confined_to_their_own_projects(self):
        self.as_user(APPROVER)
        result = self.afterz_api.approve_all_entries(WORKER, WEEK_START, WEEK_END)
        self.assertEqual(result["count"], 1)
        self.assertEqual(self.status_of("TE-SUB-A"), "Approved")
        self.assertEqual(self.status_of("TE-SUB-B"), "Submitted")

    def test_drafts_are_not_approved(self):
        """The docstring claimed "regardless of status - draft, submitted,
        etc.". The filter has never done that, and the comment beside it said
        the opposite. Asserting which one is true."""
        self.as_user(ADMIN)
        self.afterz_api.approve_all_entries(WORKER, WEEK_START, WEEK_END)
        self.assertEqual(self.status_of("TE-DRAFT-IN"), "Draft")

    def test_entries_outside_the_week_are_not_approved(self):
        self.as_user(ADMIN)
        self.afterz_api.approve_all_entries(WORKER, WEEK_START, WEEK_END)
        self.assertEqual(self.status_of("TE-SUB-OUT"), "Submitted")

    def test_another_employees_entries_are_not_approved(self):
        self.as_user(ADMIN)
        self.afterz_api.approve_all_entries(WORKER, WEEK_START, WEEK_END)
        self.assertEqual(self.status_of("TE-OTHER-EMP"), "Submitted")

    def test_approval_records_who_approved_and_when(self):
        self.as_user(APPROVER)
        self.afterz_api.approve_all_entries(WORKER, WEEK_START, WEEK_END, "looks right")
        row = [r for r in self.frappe.tables["Timesheet Entry"] if r["name"] == "TE-SUB-A"][0]
        self.assertEqual(row["approved_by"], APPROVER)
        self.assertEqual(row["approval_notes"], "looks right")
        self.assertIsNotNone(row["approval_date"])

    def test_approval_notes_are_optional(self):
        self.as_user(APPROVER)
        self.afterz_api.approve_all_entries(WORKER, WEEK_START, WEEK_END)
        row = [r for r in self.frappe.tables["Timesheet Entry"] if r["name"] == "TE-SUB-A"][0]
        self.assertNotIn("approval_notes", row)

    def test_an_admin_with_nothing_to_approve_is_told_so(self):
        self.as_user(ADMIN)
        self.frappe.tables["Timesheet Entry"] = []
        result = self.afterz_api.approve_all_entries(WORKER, WEEK_START, WEEK_END)
        self.assertTrue(result["success"])
        self.assertEqual(result["count"], 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
