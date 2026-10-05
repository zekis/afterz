"""A stand-in for `frappe`, so this app's logic can be tested without a bench.

Read this before trusting a test that uses it.

A stand-in that ignores an argument has deleted the claim your test appears to
make. The bug this suite was written for is exactly that shape in real code:
`get_user_project_permissions` took a `user`, resolved it, and never read it
again, so it answered the same for everybody. A stub that accepted `filters`
and ignored them would hide that bug perfectly.

So `get_all` here really does filter. It honours the doctype, plain equality,
and the `in`, `not in`, `between` and `!=` operator forms, and it raises
NotImplementedError on an operator it does not know rather than silently
matching everything. If a test needs a form that is not here, add it -- do not
widen the match.

What it is NOT: a model of frappe's permission system, link validation, Select
validation, hooks, or the database. It is a table and a filter. Anything a test
asserts about permissions must come from the app's own code.

TRANSACTIONS. `db` below models one thing only, because one thing is what the
atomicity tests turn on: when frappe keeps a whitelisted method's writes and
when it throws them away. Taken from frappe/app.py's `application()`:

  * the method RETURNS  -> the `else:` branch runs `sync_database`, which calls
    `db.commit()` for an unsafe HTTP method (these endpoints are POSTed);
  * the method RAISES   -> `rollback` stays True and the `finally:` block calls
    `db.rollback()`, undoing the whole transaction.

`as_request()` is that rule and nothing else. Call an endpoint through it when
the test is about what survives; call the endpoint directly when it is about
what it returns. What `as_request()` does NOT model: HTTP status codes,
`handle_exception`, deferred inserts actually being flushed, after-commit hooks,
or any read-only/GET path.

One asymmetry to know before asserting on it: `saved` is a log of save() CALLS
and rollback does not unwind it, because a rolled-back attempt still happened.
Assert on `rows()` when you mean "what is in the table".
"""

import datetime
import sys
import types


class ValidationError(Exception):
    pass


class PermissionError(ValidationError):  # noqa: A001 - frappe shadows the builtin too
    pass


class DoesNotExistError(ValidationError):
    pass


class _Dict(dict):
    """frappe's `_dict`: a dict that also answers to attribute access."""

    def __getattr__(self, key):
        try:
            return self[key]
        except KeyError:
            raise AttributeError(key)

    def __setattr__(self, key, value):
        self[key] = value


class _Database:
    """The transaction, as an undo log. See the module docstring.

    Every write records how to undo itself. A savepoint is a mark in that log;
    rolling back to it applies the undos above the mark, newest first, and
    leaves the mark in place -- MariaDB keeps a savepoint after ROLLBACK TO
    SAVEPOINT, and frappe's own helper relies on that.
    """

    def __init__(self):
        self._undo = []
        self._savepoints = {}
        self.committed = 0
        self.rollbacks = []       # save_point of each rollback, None for a full one

    def record(self, undo):
        self._undo.append(undo)

    def savepoint(self, save_point):
        self._savepoints[save_point] = len(self._undo)

    def release_savepoint(self, save_point):
        self._savepoints.pop(save_point, None)

    def rollback(self, *, save_point=None):
        self.rollbacks.append(save_point)
        if save_point is None:
            mark = 0
            self._savepoints.clear()
        else:
            if save_point not in self._savepoints:
                # What MariaDB does: ER_SP_DOES_NOT_EXIST. A stub that quietly
                # treated this as a full rollback would hide a real mistake.
                raise ValidationError(
                    "SAVEPOINT %s does not exist" % (save_point,)
                )
            mark = self._savepoints[save_point]
        while len(self._undo) > mark:
            self._undo.pop()()

    def commit(self):
        self.committed += 1
        self._undo.clear()
        self._savepoints.clear()


class _Doc(_Dict):
    """A document whose `save()` writes back into the table it came from."""

    def __init__(self, stub, backing=None, doctype=None):
        super().__init__(backing if backing is not None else {})
        object.__setattr__(self, "_stub", stub)
        object.__setattr__(self, "_backing", backing)
        object.__setattr__(self, "_doctype", doctype or (backing or {}).get("doctype"))

    def save(self, *args, **kwargs):
        if self._backing is None:
            return self.insert(*args, **kwargs)
        stub = self._stub
        if stub.before_write:
            stub.before_write(self)
        before = dict(self._backing)
        backing = self._backing
        stub.db.record(lambda: (backing.clear(), backing.update(before)))
        backing.update(self)
        stub.saved.append(self.get("name"))
        return self

    def insert(self, *args, **kwargs):
        stub = self._stub
        if stub.before_write:
            stub.before_write(self)
        doctype = self._doctype or self.get("doctype")
        if not doctype:
            raise ValidationError("insert() with no doctype")
        if not self.get("name"):
            stub._autoname += 1
            self["name"] = "%s-%05d" % (doctype.lower().replace(" ", "-"), stub._autoname)
        row = dict(self)
        table = stub.tables.setdefault(doctype, [])
        table.append(row)
        stub.db.record(lambda: table.remove(row))
        object.__setattr__(self, "_backing", row)
        stub.saved.append(self["name"])
        return self

    def _with(self, fields):
        self.update(fields)
        return self

    def delete(self, *args, **kwargs):
        stub = self._stub
        backing = self._backing
        was = backing.get("__deleted__")
        stub.db.record(lambda: backing.__setitem__("__deleted__", was))
        backing["__deleted__"] = True


def _matches(row, field, condition):
    value = row.get(field)

    if not isinstance(condition, (list, tuple)):
        return value == condition

    operator, operand = condition[0], condition[1]
    operator = str(operator).lower().strip()

    if operator == "in":
        return value in operand
    if operator == "not in":
        return value not in operand
    if operator == "between":
        low, high = operand
        if value is None:
            return False
        return str(low) <= str(value) <= str(high)
    if operator in ("=", "=="):
        return value == operand
    if operator == "!=":
        return value != operand
    raise NotImplementedError(
        "frappe_stub.get_all does not implement the operator %r. Add it rather "
        "than loosening the match." % (condition[0],)
    )


class FrappeStub(types.ModuleType):
    """Install with `install()`; one instance per test."""

    def __init__(self):
        super().__init__("frappe")
        self.tables = {}          # doctype -> list of row dicts
        self.saved = []           # names passed to doc.save(), in order
        self.errors = []          # messages passed to log_error
        self.error_logs = []      # every log_error call, with its kwargs
        self.permissions = {}     # (doctype, ptype) -> bool, for has_permission
        self.session = _Dict(user="nobody@example.com")
        self.db = _Database()
        self.before_write = None  # callable(doc) run before save()/insert()
        self._autoname = 0

        self.ValidationError = ValidationError
        self.PermissionError = PermissionError
        self.DoesNotExistError = DoesNotExistError

        self.utils = types.SimpleNamespace(
            now_datetime=lambda: datetime.datetime(2026, 10, 6, 9, 0, 0),
            nowdate=lambda: "2026-10-06",
        )

    # -- the bits the app calls -------------------------------------------

    def whitelist(self, *args, **kwargs):
        def decorator(fn):
            fn.is_whitelisted = True
            return fn

        return decorator

    def throw(self, message, exc=None):
        raise (exc or ValidationError)(message)

    def log_error(self, title=None, message=None, reference_doctype=None,
                  reference_name=None, *, defer_insert=False):
        """frappe's signature, including the keyword-only defer_insert.

        The real one inserts an Error Log row into the CURRENT transaction
        unless deferred (frappe/utils/error.py), which is why a caller that
        rolls back has to care about both the flag and the order. This records
        enough for a test to assert either.
        """
        self.errors.append(title if message is None else message)
        self.error_logs.append(_Dict(
            title=title, message=message, defer_insert=defer_insert,
            undo_depth=len(self.db._undo),
        ))

    def get_traceback(self, *args, **kwargs):
        return "Traceback (from frappe_stub)"

    def rows(self, doctype):
        """The table's live rows: what survived. Not the same as `saved`."""
        return [r for r in self.tables.get(doctype, []) if not r.get("__deleted__")]

    def as_request(self, fn, *args, **kwargs):
        """Call an endpoint the way frappe's request handler does.

        Commit on a normal return, roll the whole transaction back on an
        exception, and re-raise. See the module docstring for the lines in
        frappe/app.py this stands for.
        """
        try:
            result = fn(*args, **kwargs)
        except Exception:
            self.db.rollback()
            raise
        self.db.commit()
        return result

    def has_permission(self, doctype, ptype="read", **kwargs):
        return self.permissions.get((doctype, ptype), False)

    def get_all(self, doctype, fields=None, filters=None, order_by=None, **kwargs):
        rows = self.tables.get(doctype, [])
        filters = filters or {}
        out = []
        for row in rows:
            if row.get("__deleted__"):
                continue
            if all(_matches(row, f, c) for f, c in filters.items()):
                if fields:
                    out.append(_Dict({f: row.get(f) for f in fields}))
                else:
                    out.append(_Dict(row))
        return out

    get_list = get_all

    def get_doc(self, doctype, name=None):
        if isinstance(doctype, dict):
            # frappe.get_doc({...}): a new, unsaved document.
            fields = dict(doctype)
            return _Doc(self, backing=None, doctype=fields.pop("doctype", None)) \
                ._with(fields)
        for row in self.tables.get(doctype, []):
            if row.get("name") == name and not row.get("__deleted__"):
                return _Doc(self, backing=row)
        raise DoesNotExistError("%s %s not found" % (doctype, name))

    def get_value(self, doctype, name, fieldname):
        for row in self.tables.get(doctype, []):
            if row.get("name") == name:
                return row.get(fieldname)
        return None


def install():
    """Put a fresh stub in sys.modules as `frappe` and return it.

    Modules already imported keep a reference to whatever `frappe` was bound at
    import time, so the app modules are dropped here too and re-imported by the
    test against the stub it just installed.
    """
    stub = FrappeStub()
    sys.modules["frappe"] = stub
    for module in [m for m in sys.modules if m == "afterz" or m.startswith("afterz.")]:
        del sys.modules[module]
    return stub
