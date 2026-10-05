"""What survives when a bulk action fails part-way through (zekis/afterz).

Follow-up to #3 / PR #5, which fixed WHO may run the two bulk timesheet
endpoints. This is about what they leave behind when they fail half way.

Found by sweeping the app for a whitelisted function that writes inside a loop.
There are four, not two, and they split into two groups that need opposite
fixes -- which is the whole point of this file:

  * afterz_api.submit_week_entries, afterz_api.approve_all_entries
        No caller reads their returned flag (BulkActions, PendingApprovals and
        ApprovalDashboardModal all `await` the call and only act on a thrown
        error), so swallowing the exception made a failure both SILENT and
        PARTIAL. They re-raise now, and frappe's own end-of-request rollback
        makes them all-or-nothing. No savepoint needed.

  * shared_api.assign_activity_to_users, shared_api.remove_activity_assignment
        Their callers DO read the flag -- ActivityAssignmentModal,
        ManageAssignmentsModal and pages/ManageAssignments each branch on
        `result.success` and display `result.error`. Raising would break three
        call sites to fix something a rollback fixes, so these keep the contract
        and undo their own work with a savepoint.

The defect in all four was the same: `except Exception: return {'success':
False}`. A whitelisted method that RETURNS gets its writes committed
(frappe/app.py: sync_database -> db.commit() for a POST); only an exception that
ESCAPES causes the rollback in that function's `finally:` block. So catching the
failure converted a transaction frappe would have thrown away into a committed
half-done one, and then said it had failed.

Run from the repository root, no bench and no frappe installed:

    python3 -m unittest discover -s tests -t . -v

The last class is self-tests for the stub's transaction model, because every
assertion above rests on it.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.frappe_stub import PermissionError as StubPermissionError  # noqa: E402
from tests.frappe_stub import ValidationError as StubValidationError  # noqa: E402
from tests.frappe_stub import install  # noqa: E402

ADMIN = "Administrator"
APPROVER = "approver@tierneymorris.com.au"
WORKER = "worker@tierneymorris.com.au"
LEAD = "lead@tierneymorris.com.au"
USER_A = "a@tierneymorris.com.au"
USER_B = "b@tierneymorris.com.au"
USER_C = "c@tierneymorris.com.au"

WEEK_START = "2026-10-05"
WEEK_END = "2026-10-11"

PROJECT_FIELDS = {
    "project_name": "n/a",
    "customer": "Tierney Morris",
    "division": None,
    "project_type": None,
}


class Boom(Exception):
    """Something a doc save can plausibly raise: a validation error, a link
    that does not resolve, a deadlock. Which one does not matter here."""


def fail_on_write_number(n, exc=None):
    """Make the nth save()/insert() of a request raise. Returns the hook."""
    state = {"n": 0}

    def hook(doc):
        state["n"] += 1
        if state["n"] == n:
            raise (exc or Boom)("write %d failed" % n)

    return hook


class Base(unittest.TestCase):
    def setUp(self):
        self.frappe = install()
        self.frappe.tables["Project"] = [
            dict(name="P-OPEN-A", status="Open", timesheet_approver=APPROVER,
                 project_lead=LEAD, **PROJECT_FIELDS),
        ]
        self.frappe.tables["Timesheet Entry"] = [
            dict(name="TE-1", employee=WORKER, project="P-OPEN-A",
                 status="Draft", check_in_time="2026-10-06 09:00:00"),
            dict(name="TE-2", employee=WORKER, project="P-OPEN-A",
                 status="Draft", check_in_time="2026-10-07 09:00:00"),
            dict(name="TE-3", employee=WORKER, project="P-OPEN-A",
                 status="Draft", check_in_time="2026-10-08 09:00:00"),
        ]
        self.frappe.tables["Activity"] = [
            dict(name="ACT-1", activity_name="Install the rack",
                 project="P-OPEN-A", status="Open"),
        ]
        self.frappe.tables["ToDo"] = []

        import afterz.afterz_api as afterz_api
        import afterz.shared_api as shared_api

        self.afterz_api = afterz_api
        self.shared_api = shared_api

    def as_user(self, user):
        self.frappe.session.user = user

    def statuses(self):
        return {r["name"]: r["status"] for r in self.frappe.rows("Timesheet Entry")}

    def submitted(self):
        for row in self.frappe.rows("Timesheet Entry"):
            row["status"] = "Submitted"

    def todo_users(self):
        return sorted(r["allocated_to"] for r in self.frappe.rows("ToDo")
                      if r.get("status") != "Closed")


# --------------------------------------------------------------------------
# The two timesheet endpoints: all-or-nothing by letting the exception out.
# --------------------------------------------------------------------------

class TestSubmitWeekIsAllOrNothing(Base):
    def setUp(self):
        super().setUp()
        self.as_user(WORKER)
        self.frappe.before_write = fail_on_write_number(2)

    def test_a_failure_part_way_through_leaves_every_entry_a_draft(self):
        """THE BUG. The first entry was saved as Submitted and committed, the
        rest stayed Draft, and the caller was told the action failed."""
        with self.assertRaises(Boom):
            self.frappe.as_request(
                self.afterz_api.submit_week_entries, WORKER, WEEK_START, WEEK_END)

        self.assertEqual(self.statuses(),
                         {"TE-1": "Draft", "TE-2": "Draft", "TE-3": "Draft"})

    def test_nothing_is_half_submitted_however_it_reports(self):
        """Atomicity on its own, kept apart from how the failure is reported,
        so a regression says which of the two properties broke. Against the old
        code this is the one whose message shows the damage: TE-1 Submitted and
        committed, TE-2 and TE-3 left Draft."""
        try:
            self.frappe.as_request(
                self.afterz_api.submit_week_entries, WORKER, WEEK_START, WEEK_END)
        except Exception:
            pass
        self.assertEqual(set(self.statuses().values()), {"Draft"})

    def test_the_failure_reaches_the_caller_as_an_exception(self):
        """Not {'success': False}: no caller of this endpoint reads that flag,
        so a returned failure was a no-op with no message at all."""
        with self.assertRaises(Boom):
            self.afterz_api.submit_week_entries(WORKER, WEEK_START, WEEK_END)

    def test_nothing_is_committed(self):
        try:
            self.frappe.as_request(
                self.afterz_api.submit_week_entries, WORKER, WEEK_START, WEEK_END)
        except Boom:
            pass
        self.assertEqual(self.frappe.db.committed, 0)
        self.assertEqual(self.frappe.db.rollbacks, [None], "a full rollback")

    def test_the_error_log_is_deferred_so_the_rollback_cannot_discard_it(self):
        """log_error normally inserts the Error Log row into the transaction
        frappe is about to roll back. Deferring is the only reason the
        diagnostic outlives the failure it describes."""
        with self.assertRaises(Boom):
            self.frappe.as_request(
                self.afterz_api.submit_week_entries, WORKER, WEEK_START, WEEK_END)

        self.assertEqual(len(self.frappe.error_logs), 1)
        self.assertTrue(self.frappe.error_logs[-1].defer_insert)


class TestApproveAllIsAllOrNothing(Base):
    def setUp(self):
        super().setUp()
        self.submitted()
        self.as_user(ADMIN)
        self.frappe.before_write = fail_on_write_number(2)

    def test_a_failure_part_way_through_leaves_every_entry_submitted(self):
        """The one with the highest stakes: a half-applied approve-all committed
        some entries as Approved and reported that it had failed."""
        with self.assertRaises(Boom):
            self.frappe.as_request(
                self.afterz_api.approve_all_entries, WORKER, WEEK_START, WEEK_END)

        self.assertEqual(set(self.statuses().values()), {"Submitted"})

    def test_no_approval_metadata_survives_either(self):
        """approved_by and approval_date are written in the same loop."""
        with self.assertRaises(Boom):
            self.frappe.as_request(
                self.afterz_api.approve_all_entries, WORKER, WEEK_START, WEEK_END)

        for row in self.frappe.rows("Timesheet Entry"):
            self.assertIsNone(row.get("approved_by"), row["name"])
            self.assertIsNone(row.get("approval_date"), row["name"])

    def test_nothing_is_half_approved_however_it_reports(self):
        """Atomicity on its own; see the submit case for why it is separate."""
        try:
            self.frappe.as_request(
                self.afterz_api.approve_all_entries, WORKER, WEEK_START, WEEK_END)
        except Exception:
            pass
        self.assertEqual(set(self.statuses().values()), {"Submitted"})

    def test_the_failure_reaches_the_caller_as_an_exception(self):
        with self.assertRaises(Boom):
            self.afterz_api.approve_all_entries(WORKER, WEEK_START, WEEK_END)

    def test_the_error_log_is_deferred(self):
        with self.assertRaises(Boom):
            self.frappe.as_request(
                self.afterz_api.approve_all_entries, WORKER, WEEK_START, WEEK_END)
        self.assertTrue(self.frappe.error_logs[-1].defer_insert)


class TestTheTimesheetPairWhenNothingGoesWrong(Base):
    """Controls. If any of these go red the fix has overreached."""

    def test_a_successful_submit_still_returns_its_shape_and_commits(self):
        self.as_user(WORKER)
        result = self.frappe.as_request(
            self.afterz_api.submit_week_entries, WORKER, WEEK_START, WEEK_END)
        self.assertTrue(result["success"])
        self.assertEqual(result["count"], 3)
        self.assertEqual(set(self.statuses().values()), {"Submitted"})
        self.assertEqual(self.frappe.db.committed, 1)
        self.assertEqual(self.frappe.db.rollbacks, [])

    def test_a_successful_approve_still_returns_its_shape_and_commits(self):
        self.submitted()
        self.as_user(ADMIN)
        result = self.frappe.as_request(
            self.afterz_api.approve_all_entries, WORKER, WEEK_START, WEEK_END)
        self.assertTrue(result["success"])
        self.assertEqual(result["count"], 3)
        self.assertEqual(set(self.statuses().values()), {"Approved"})
        self.assertEqual(self.frappe.db.committed, 1)

    def test_nothing_to_do_is_still_a_success_and_logs_no_error(self):
        self.frappe.tables["Timesheet Entry"] = []
        self.as_user(WORKER)
        result = self.frappe.as_request(
            self.afterz_api.submit_week_entries, WORKER, WEEK_START, WEEK_END)
        self.assertTrue(result["success"])
        self.assertEqual(self.frappe.error_logs, [])

    def test_a_refusal_is_still_a_permission_error_and_writes_nothing(self):
        """Pins PR #5. A refusal must not become an ordinary logged failure."""
        self.as_user(USER_A)
        with self.assertRaises(StubPermissionError):
            self.frappe.as_request(
                self.afterz_api.submit_week_entries, WORKER, WEEK_START, WEEK_END)
        self.assertEqual(set(self.statuses().values()), {"Draft"})
        self.assertEqual(self.frappe.error_logs, [], "a refusal is not an error log")


# --------------------------------------------------------------------------
# The two assignment endpoints: all-or-nothing by savepoint, flag kept.
# --------------------------------------------------------------------------

class TestAssignActivityIsAllOrNothing(Base):
    def setUp(self):
        super().setUp()
        self.as_user(LEAD)      # project_lead, so the permission check passes

    def test_a_failure_part_way_through_leaves_no_todos_behind(self):
        """THE BUG, milder than the timesheet one but the same shape: two ToDos
        were created and committed, and the caller was told it had failed, so it
        showed an error and did not refresh -- the user saw no assignments where
        two existed."""
        self.frappe.before_write = fail_on_write_number(3)
        result = self.frappe.as_request(
            self.shared_api.assign_activity_to_users,
            "ACT-1", [USER_A, USER_B, USER_C])

        self.assertFalse(result["success"])
        self.assertEqual(self.frappe.rows("ToDo"), [])

    def test_it_still_reports_failure_by_returning_the_flag_its_callers_read(self):
        """A control, and the reason this pair is not fixed the way the
        timesheet pair is: three call sites branch on result.success."""
        self.frappe.before_write = fail_on_write_number(1)
        result = self.frappe.as_request(
            self.shared_api.assign_activity_to_users, "ACT-1", [USER_A])
        self.assertFalse(result["success"])
        self.assertIn("error", result)

    def test_the_rollback_happens_before_the_error_is_logged(self):
        """Order, not just presence. log_error inserts its row into the current
        transaction, so logging first and rolling back afterwards would throw
        the diagnostic away with the assignments."""
        self.frappe.before_write = fail_on_write_number(3)
        self.frappe.as_request(
            self.shared_api.assign_activity_to_users,
            "ACT-1", [USER_A, USER_B, USER_C])

        self.assertEqual(len(self.frappe.error_logs), 1)
        self.assertEqual(self.frappe.error_logs[-1].undo_depth, 0,
                         "logged while writes were still pending undo")

    def test_a_successful_assignment_creates_one_todo_each_and_commits(self):
        result = self.frappe.as_request(
            self.shared_api.assign_activity_to_users,
            "ACT-1", [USER_A, USER_B, USER_C])
        self.assertTrue(result["success"])
        self.assertEqual(self.todo_users(), sorted([USER_A, USER_B, USER_C]))
        self.assertEqual(self.frappe.db.committed, 1)
        self.assertEqual(self.frappe.db.rollbacks, [])

    def test_an_already_assigned_user_is_still_skipped(self):
        """Pre-existing behaviour, pinned: the savepoint must not change it."""
        self.frappe.tables["ToDo"] = [
            dict(name="TD-OLD", reference_type="Activity", reference_name="ACT-1",
                 allocated_to=USER_A, status="Open"),
        ]
        result = self.frappe.as_request(
            self.shared_api.assign_activity_to_users, "ACT-1", [USER_A, USER_B])
        self.assertTrue(result["success"])
        self.assertEqual(result["created_todos"], [r["name"] for r in
                                                   self.frappe.rows("ToDo")
                                                   if r["allocated_to"] == USER_B])
        self.assertEqual(self.todo_users(), sorted([USER_A, USER_B]))

    def test_a_permission_refusal_writes_nothing_and_keeps_the_flag(self):
        self.as_user(USER_A)        # not the lead, no Activity write permission
        result = self.frappe.as_request(
            self.shared_api.assign_activity_to_users, "ACT-1", [USER_B])
        self.assertFalse(result["success"])
        self.assertEqual(self.frappe.rows("ToDo"), [])
        self.assertEqual(self.frappe.error_logs, [], "a refusal is not an error")


class TestRemoveAssignmentIsAllOrNothing(Base):
    def setUp(self):
        super().setUp()
        self.as_user(LEAD)
        # Nothing stops a user holding two open ToDos for one activity, and the
        # query is not limited to one, so the loop can run more than once.
        self.frappe.tables["ToDo"] = [
            dict(name="TD-1", reference_type="Activity", reference_name="ACT-1",
                 allocated_to=USER_A, status="Open"),
            dict(name="TD-2", reference_type="Activity", reference_name="ACT-1",
                 allocated_to=USER_A, status="Open"),
        ]

    def test_a_failure_part_way_through_leaves_every_todo_open(self):
        self.frappe.before_write = fail_on_write_number(2)
        result = self.frappe.as_request(
            self.shared_api.remove_activity_assignment, "ACT-1", USER_A)

        self.assertFalse(result["success"])
        self.assertEqual([r["status"] for r in self.frappe.rows("ToDo")],
                         ["Open", "Open"])

    def test_a_successful_removal_closes_them_all_and_commits(self):
        result = self.frappe.as_request(
            self.shared_api.remove_activity_assignment, "ACT-1", USER_A)
        self.assertTrue(result["success"])
        self.assertEqual([r["status"] for r in self.frappe.rows("ToDo")],
                         ["Closed", "Closed"])
        self.assertEqual(self.frappe.db.committed, 1)


# --------------------------------------------------------------------------
# The stub's transaction model. Every assertion above rests on this, so it is
# tested rather than trusted.
# --------------------------------------------------------------------------

class TestTheStubsTransactionModel(unittest.TestCase):
    def setUp(self):
        self.frappe = install()
        self.frappe.tables["ToDo"] = [dict(name="TD-1", status="Open")]

    def test_a_rolled_back_insert_leaves_no_row(self):
        self.frappe.get_doc({"doctype": "ToDo", "status": "Open"}).insert()
        self.assertEqual(len(self.frappe.rows("ToDo")), 2)
        self.frappe.db.rollback()
        self.assertEqual([r["name"] for r in self.frappe.rows("ToDo")], ["TD-1"])

    def test_a_rolled_back_save_restores_the_previous_values(self):
        doc = self.frappe.get_doc("ToDo", "TD-1")
        doc.status = "Closed"
        doc.save()
        self.assertEqual(self.frappe.rows("ToDo")[0]["status"], "Closed")
        self.frappe.db.rollback()
        self.assertEqual(self.frappe.rows("ToDo")[0]["status"], "Open")

    def test_rollback_to_a_savepoint_undoes_only_what_came_after_it(self):
        first = self.frappe.get_doc({"doctype": "ToDo", "status": "A"}).insert()
        self.frappe.db.savepoint("sp")
        self.frappe.get_doc({"doctype": "ToDo", "status": "B"}).insert()
        self.frappe.db.rollback(save_point="sp")
        self.assertEqual([r["name"] for r in self.frappe.rows("ToDo")],
                         ["TD-1", first["name"]])

    def test_a_savepoint_survives_being_rolled_back_to(self):
        """MariaDB keeps it, and the app's except block would break if it did not."""
        self.frappe.db.savepoint("sp")
        self.frappe.get_doc({"doctype": "ToDo", "status": "A"}).insert()
        self.frappe.db.rollback(save_point="sp")
        self.frappe.db.rollback(save_point="sp")
        self.assertEqual(len(self.frappe.rows("ToDo")), 1)

    def test_rollback_to_an_unknown_savepoint_raises(self):
        """Why the app guards with savepoint_set. A stub that treated this as a
        full rollback would make a real mistake look like a working fix."""
        with self.assertRaises(StubValidationError):
            self.frappe.db.rollback(save_point="never-taken")

    def test_a_commit_makes_a_later_rollback_a_no_op(self):
        self.frappe.get_doc({"doctype": "ToDo", "status": "A"}).insert()
        self.frappe.db.commit()
        self.frappe.db.rollback()
        self.assertEqual(len(self.frappe.rows("ToDo")), 2)

    def test_as_request_commits_on_a_normal_return(self):
        def endpoint():
            self.frappe.get_doc({"doctype": "ToDo", "status": "A"}).insert()
            return {"success": False}      # a returned failure still commits

        self.frappe.as_request(endpoint)
        self.assertEqual(self.frappe.db.committed, 1)
        self.assertEqual(len(self.frappe.rows("ToDo")), 2)

    def test_as_request_rolls_back_on_an_exception_and_re_raises(self):
        def endpoint():
            self.frappe.get_doc({"doctype": "ToDo", "status": "A"}).insert()
            raise Boom("no")

        with self.assertRaises(Boom):
            self.frappe.as_request(endpoint)
        self.assertEqual(self.frappe.db.committed, 0)
        self.assertEqual(len(self.frappe.rows("ToDo")), 1)

    def test_saved_is_a_call_log_and_rollback_does_not_unwind_it(self):
        """Stated in the stub's docstring; asserted here so a test that reaches
        for `saved` when it means `rows` is not quietly wrong."""
        doc = self.frappe.get_doc("ToDo", "TD-1")
        doc.status = "Closed"
        doc.save()
        self.frappe.db.rollback()
        self.assertEqual(self.frappe.saved, ["TD-1"])
        self.assertEqual(self.frappe.rows("ToDo")[0]["status"], "Open")


if __name__ == "__main__":
    unittest.main()
