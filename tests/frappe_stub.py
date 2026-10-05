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


class _Doc(_Dict):
    """A document whose `save()` writes back into the table it came from."""

    def __init__(self, backing, saved_log):
        super().__init__(backing)
        object.__setattr__(self, "_backing", backing)
        object.__setattr__(self, "_saved", saved_log)

    def save(self, *args, **kwargs):
        self._backing.update(self)
        self._saved.append(self["name"])

    def delete(self, *args, **kwargs):
        self._backing["__deleted__"] = True


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
        self.permissions = {}     # (doctype, ptype) -> bool, for has_permission
        self.session = _Dict(user="nobody@example.com")

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

    def log_error(self, message, title=None):
        self.errors.append(message)

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
        for row in self.tables.get(doctype, []):
            if row.get("name") == name and not row.get("__deleted__"):
                return _Doc(row, self.saved)
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
