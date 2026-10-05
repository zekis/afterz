# Task Plan: New Standalone Frappe ToDo Manager using MUI React (Workz)

Owner: New Agent
Status: Planned
Priority: High
App Name: workz (a new, dedicated Frappe app that will be created before implementation)

Goal
Build a brand-new, standalone ToDo Manager application (Workz) consisting of:
- A dedicated Frappe backend app named workz (separate installable app) providing a clean API surface (whitelisted endpoints/REST) for ToDo operations and history.
- A React frontend using Material UI (MUI) implementing a modern ToDo UI (list/table, grouping, context menu, drawer, bulk actions).
- Frontend to be initialized and integrated using the frappe-react-sdk for API calls and authentication.
- A well-defined services layer, hooks, and types for reuse by other apps (e.g., Planner).
- First-class mobile support with responsive layouts and touch-friendly interactions.

What makes Workz unique
- Self-service permission model designed for distributed ownership and collaboration:
  - Ownership: Every ToDo has an owner (creator). Owners retain ownership even if they assign the ToDo to others.
  - Self-creation: All authenticated users can create their own ToDos; no special role required for creation.
  - Assignment: All users can assign their own ToDos to themselves or to other users.
  - Sharing: Owners can explicitly share their ToDos with other users. Shared users can reassign those ToDos to others (delegation), update statuses, and comment.
  - Assignee rights: Users assigned ToDos can:
    - Update status (e.g., Open → In Progress → Done)
    - Add comments/notes
    - View full ToDo details
  - Owner visibility: Owners always see updates and activity on their ToDos (even when assigned elsewhere or shared widely).
  - Auditability: History of status changes, assignments, and comments is visible to owners (and to shared users where permitted).
- This model supports real-world delegation while preserving traceability and owner control.

Design system and theming
- Visual style:
  - Clean, modern, simple. Use neutral greys for most UI chrome; color is reserved for emphasis and states that need attention.
  - Grey outline style for inputs, cards, and containers (subtle borders, low elevation).
  - MDI (Material Design Icons) preferred for all icons; choose rounded/outlined variants to match the minimal aesthetic.
- Color usage:
  - Use color sparingly for signals only: errors, warnings, critical statuses, overdue badges, destructive buttons.
  - Priority/status chips: subtle tints; full-color only for urgent/blocked/overdue to draw attention.
- Light and dark mode:
  - Full support via MUI theme mode toggle; ensure adequate contrast in both.
  - Maintain identical layout and information hierarchy in both modes; only palette changes.
- Accessibility:
  - Minimum 4.5:1 contrast on text; 3:1 on large text and UI components where permissible.
  - Focus states clearly visible in both modes.
- Typography and spacing:
  - MUI defaults with slight adjustments for headings and captions where needed.
  - Consistent 8px spacing grid; avoid dense UI on mobile—prefer vertical stacking.
- Components:
  - Buttons: variant="text" or "outlined" for most actions; variant="contained" reserved for primary and destructive confirmations.
  - Chips/Badges: outlined or light variants for neutral states; filled for attention-demanding states.
  - Cards: low elevation, 1px grey outline; on hover, subtle shadow or outline emphasis.

Mobile-first requirements
- Responsive layouts:
  - On small screens, switch from table to a card/list layout with essential fields: subject, status, priority, assignee, and last updated.
  - Support collapsible/accordion rows to reveal more metadata (project, created, tags) without overwhelming the screen.
  - Use MUI breakpoints (xs/sm/md) to progressively disclose columns and actions.
- Touch-friendly interactions:
  - Larger tap targets for row actions, selection, and context menu trigger.
  - Long-press to open context menu on mobile (fallback if right-click not available). Provide a visible overflow (“…”) icon as an accessible alternative.
- Drawer and dialogs:
  - Use full-screen Drawer on mobile for detail view and editing.
  - Ensure forms are keyboard-safe (avoid viewport jumps), and actions are reachable with sticky action bars at the bottom on small screens.
- Performance:
  - List virtualization where feasible (MUI DataGrid or react-window for large lists).
  - Optimize images/avatars and avoid heavy tooltips on mobile; prefer inline chips or text.
- Accessibility:
  - Proper focus management on opening drawers/dialogs.
  - Gesture interactions (long-press) always have button equivalents.

Outcomes
- Backend (Frappe app: workz):
  - New app scaffold (Python + JS), installable to site(s).
  - New DocType(s) only if needed; for core ToDo, leverage tabToDo.
  - Whitelisted APIs (or REST) for list/create/update/delete, assign, change status, sharing, and optional activity history.
  - Permission checks and multi-tenant readiness that implement the self-service permission model described above.
  - API documentation (OpenAPI or Markdown).
  - A public route/view under workz/www/workz.py for app entry or bootstrapping.
- Frontend (React + MUI + frappe-react-sdk):
  - Standalone ToDo Manager page and components.
  - Sorting, filtering, grouping, selection, bulk actions.
  - Right-click context menu; left-click opens detail drawer with inline editing.
  - Fully responsive mobile experience with touch-friendly interactions and MDI icons.
  - Unit/component tests, accessibility checks.
- Shared:
  - Types, mappers, and a thin SDK-like service layer that uses frappe-react-sdk under the hood.

Tech Stack
- Backend: Frappe Framework (Python), whitelisted methods under the new app workz
- Frontend: React (TypeScript), Material UI v5+, frappe-react-sdk, React Testing Library + Jest/Vitest
- API Client: frappe-react-sdk (useFrappeGetDocList, useFrappeCreateDoc, useFrappeUpdateDoc, useFrappeDeleteDoc, useFrappePostCall, useFrappeAuth, etc.)
- Icons: Material Design Icons (mdi)
- Documentation: README + docs/ with API and UI docs

0. Frontend Initialization with frappe-react-sdk

0.1 Provider Setup
- Wrap the root of the React app with FrappeProvider.
- If the Frappe server is on a different origin, pass url.
- If using token-based auth, use tokenParams per library docs.

Example (App.tsx):
import { FrappeProvider } from "frappe-react-sdk";

function App() {
  return (
    <FrappeProvider
      url="https://my-frappe-server.example.com"
      // tokenParams example for token-based auth:
      // tokenParams={{
      //   useToken: true,
      //   token: getTokenFromLocalStorage(),
      //   type: "Bearer",
      // }}
    >
      {/* Your other app components */}
    </FrappeProvider>
  );
}

0.2 Authentication with useFrappeAuth
- Use useFrappeAuth to manage currentUser, login, logout, updateCurrentUser, and getUserCookie.
- Handle isLoading and error states; redirect to login if the user is not logged in (403 Forbidden).
- Prefer cookie-based auth with Frappe session if the app is co-hosted; use token-based if separate identity provider is used.

Example:
import { useFrappeAuth } from "frappe-react-sdk";

export const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, isLoading, error, getUserCookie } = useFrappeAuth();

  if (isLoading) return <div>Loading user…</div>;
  if (error) {
    // if 403, redirect to login route
    return <div>Not authenticated</div>;
  }
  if (!currentUser) {
    return <div>Please login</div>;
  }
  return <>{children}</>;
};

1. Backend Plan (Frappe App: workz)

1.0 Pre-req
- Create the dedicated Frappe app named workz before starting implementation:
  - bench new-app workz
  - bench --site your-site install-app workz

1.1 App Scaffold
- App name: workz
- Modules:
  - workz/api (whitelisted methods module)
  - workz/www (public routes incl. workz.py for SPA or boot payloads)
  - Internal service layer for validation and permissions as Python modules

1.2 API Endpoints (Whitelisted Methods)
Namespace: workz.api.todos

- list_user_todos(filters?: object) -> FrappeToDo[]
  - Inputs (optional): status, priority, allocated_to (assignee), project (reference_name), pagination params
  - Fields: name, description AS subject, reference_name AS project, reference_type, allocated_to, priority, status, creation, modified
- get_todo(name: string) -> FrappeToDo
- create_todo(payload: { subject: string; priority?: string; status?: string; allocated_to?: string; project?: string; reference_type?: string })
  - Creates a ToDo (tabToDo) with description=subject
- update_todo(name: string, payload: Partial<{ subject; priority; status; allocated_to; project; reference_type }>) -> FrappeToDo
- delete_todo(name: string) -> void
- change_status(name: string, status: string) -> FrappeToDo
- assign_todo(name: string, allocated_to: string) -> FrappeToDo
- share_todo(name: string, shared_with: string, permissions: { can_assign?: boolean; can_comment?: boolean; can_view?: boolean }) -> FrappeToDo
  - Implements the sharing aspect of the self-service permissions model (owners grant capabilities to other users)

Optional
- list_history(name: string) -> Activity[]
  - Returns change history/comments (via Communication/Version docs if applicable)

1.3 Permission Model (Self-Service)
- Owner: The user who created the ToDo (doc.owner). Owners:
  - Can always view, edit, assign, change status, delete, and share their ToDos.
  - Retain ownership regardless of assignment.
- Assignee (allocated_to):
  - Can view assigned ToDos.
  - Can update status and comment.
  - Cannot change ownership; cannot delete unless also the owner or given explicit permission.
- Shared Users:
  - Sharing grants capabilities:
    - can_view: view ToDo and activity
    - can_comment: add comments
    - can_assign: assign ToDo to another user (delegation)
  - Sharing does not transfer ownership.
- Enforcement:
  - API methods validate the caller’s permissions based on ownership, assignee, and sharing rules.
  - All updates are logged to history (Version/Communication) for auditability.
  - Owners always see updates on their ToDos.

1.4 Tests (Backend)
- Unit tests for all API functions and permission paths
- Permission tests for owner/assignee/shared/unauthorized users
- Data validation tests

1.5 API Docs
- Markdown docs in workz/docs/api.md
- Optional: OpenAPI description

1.6 Public Route: workz/www/workz.py
- Add a public-facing route file: workz/www/workz.py
- Purpose:
  - Serve an entry endpoint for the SPA or provide boot/config payloads.
  - Useful for deep-linking or a “workz” landing that bootstraps auth state and basic user context.
- Deliverables:
  - Template rendering or JSON response as needed.
  - Ensure correct Guest vs Logged-in behavior (redirect or minimal boot response).

2. Frontend Plan (React + MUI + frappe-react-sdk)

2.1 Data Types
- FrappeToDo (raw from backend):
  - name: string
  - subject: string (description AS subject)
  - project: string | null (reference_name)
  - reference_type: string | null
  - allocated_to: string | null
  - priority: "Low" | "Medium" | "High" | "Urgent" | string | null
  - status: "Open" | "In Progress" | "Blocked" | "Closed" | "Cancelled" | string | null
  - creation: string | null
  - modified: string | null
- Todo (UI type):
  - id: string (from name)
  - subject: string
  - project?: string | null
  - assignee?: { name: string; email?: string | null; avatarUrl?: string | null } | null
  - priority?: "low" | "medium" | "high" | "urgent" | string | null
  - status?: "open" | "in_progress" | "blocked" | "done" | "cancelled" | string | null
  - dueAt?: string | null (optional future)
  - createdAt?: string | null
  - updatedAt?: string | null

2.2 Mapping Utilities
- utils/mapFrappeToTodo.ts
  - mapFrappeToTodo(row: FrappeToDo): Todo
  - Normalize priority/status to lowercase canonical values
- utils/mapTodoToFrappePayload.ts
  - Converts UI Todo patch to Frappe fields (description, allocated_to, reference_name, etc.)

2.3 Frontend SDK/Services using frappe-react-sdk
- Prefer using hooks from frappe-react-sdk directly inside features/components:
  - useFrappeGetDocList("ToDo", { fields, filters, limit, orderBy })
  - useFrappeCreateDoc("ToDo")
  - useFrappeUpdateDoc("ToDo", name)
  - useFrappeDeleteDoc("ToDo", name)
  - For custom whitelisted methods (if needed): useFrappePostCall("/api/method/workz.api.todos.list_user_todos", payload)
- Optionally wrap these in a thin service adapter to isolate API details from UI.

Example patterns:
- Listing: const { data, error, isLoading, mutate } = useFrappeGetDocList<FrappeToDo>("ToDo", { fields: ["name","description","reference_name","reference_type","allocated_to","priority","status","creation","modified"] });
- Create: const { createDoc } = useFrappeCreateDoc<FrappeToDo>("ToDo");
- Update: const { updateDoc } = useFrappeUpdateDoc<FrappeToDo>("ToDo", name);
- Delete: const { deleteDoc } = useFrappeDeleteDoc("ToDo", name);

2.4 Hooks
- hooks/useTodos.ts
  - Fetches ToDos via useFrappeGetDocList ("ToDo" DocType), applies client-side search/filter/grouping
  - Exposes { todos, loading, error, refetch }
- hooks/useTodoMutations.ts
  - Wraps create, update, delete, assign, changeStatus using frappe-react-sdk hooks or useFrappePostCall for whitelisted method endpoints
- hooks/useTodoTableState.ts
  - Manages selection, sorting, grouping, filters, search and helpers
- hooks/useContextMenu.ts
  - Manages anchor and selected row for context menu
- hooks/useMobileView.ts (new)
  - Returns breakpoint booleans (isXs/isSm) using MUI useMediaQuery
  - Provides helpers for deciding when to switch to card layout and when to use full-screen drawer

2.5 Components (MUI)
- pages/WorkzTodoManager.tsx
  - Composes AuthGate (optional), toolbar, table/card list (responsive), drawer, context menu, dialogs
- components/workz/ToDoTable.tsx
  - MUI DataGrid or Table with:
    - Columns: selection, subject, priority, status, assignee, project, updated
    - Sortable headers
    - Grouping by: none | status | assignee | priority | project
    - Left-click opens drawer; right-click opens context menu
- components/workz/ToDoListMobile.tsx (new)
  - Card-based list for mobile with essential info and compact actions
  - Long-press opens context menu; tap opens drawer
  - Uses MDI icons; grey outline style; subtle color accents for critical states only
- components/workz/cells/*.tsx
  - SubjectCell, PriorityCell, StatusCell, AssigneeCell, ProjectCell, DateCell, SelectionCell
- components/workz/ToDoToolbar.tsx
  - Search, filter selects, group-by select, bulk actions
  - Minimal colored accents; primary actions outlined by default
- components/workz/ToDoDetailDrawer.tsx
  - Editable fields with Save/Cancel, shows created/updated, history if available
  - Full-screen on mobile; side drawer on desktop
  - Sticky bottom action bar on mobile; MDI icons for actions
- components/workz/ToDoContextMenu.tsx
  - Quick actions: Open, Edit, Assign, Change Status, Delete
- components/workz/dialogs/*.tsx
  - ConfirmDeleteDialog, AssignDialog

2.6 UX and a11y
- Keyboard navigation
- aria-sort on headers
- Labels and aria attributes for interactive elements
- Focus management on drawer/dialog open/close
- Loading, empty, and error states
- Respect SWR revalidation patterns from frappe-react-sdk for snappy UX
- Mobile considerations captured in Mobile-first requirements above

2.7 Tests (Frontend)
- Unit tests:
  - mappers
  - hooks (state transitions, data fetching, mutations) with mocked frappe-react-sdk hooks
- Component tests:
  - table renders rows, supports selection/sorting
  - mobile card list renders correctly and supports touch interactions (tap/long-press)
  - context menu interactions
  - detail drawer edit/save flow (mobile and desktop)
- Integration smoke test with mocked SDK

3. API Contracts and Routes (Backend: workz)

3.1 Suggested Route Paths (Whitelisted methods)
- GET/POST /api/method/workz.api.todos.list_user_todos
- GET /api/method/workz.api.todos.get_todo
- POST /api/method/workz.api.todos.create_todo
- POST /api/method/workz.api.todos.update_todo
- POST /api/method/workz.api.todos.delete_todo
- POST /api/method/workz.api.todos.change_status
- POST /api/method/workz.api.todos.assign_todo
- POST /api/method/workz.api.todos.share_todo

Note: You may also use /api/resource/ToDo for REST if desired. Whitelisted methods offer richer validation and batch ops.

3.2 Request/Response Examples
- list_user_todos -> { message: FrappeToDo[] }
- get_todo -> { message: FrappeToDo }
- create/update/change_status/assign/share -> { message: FrappeToDo }
- delete_todo -> { message: "ok" } or HTTP 200 with no content

4. Milestones

Milestone 0: App Creation
- Create the workz Frappe app and install on target site
- Set up repo structure and CI basics if applicable

Milestone 1: Backend App Scaffolding
- Add api.todos module with method stubs
- Implement list_user_todos and get_todo with permissions and ownership checks
- Add www/workz.py entry route (basic boot page or JSON)
- Docs: backend README and docs/api.md

Milestone 2: Complete CRUD, Assign, Change Status, Share
- Implement create_todo, update_todo, delete_todo, change_status, assign_todo, share_todo
- Enforce permission model (owner/assignee/shared)
- Add tests and permission validations
- Polish API docs

Milestone 3: Frontend Bootstrap with frappe-react-sdk
- Add FrappeProvider wrapper and AuthGate component
- Implement useTodos hook using useFrappeGetDocList ("ToDo")
- Implement mapping utils and shared types
- Write unit tests for mapping and hooks (mock SDK)

Milestone 4: Core UI (Table + Toolbar) + Mobile List
- Build ToDoTable with MUI (sorting, selection, grouping scaffolding)
- Implement ToDoToolbar (search, filters, group-by)
- Add ToDoListMobile for mobile breakpoint (xs/sm) and switch via useMobileView
- Wire state from useTodoTableState and data from useTodos

Milestone 5: Context Menu + Drawer + Mutations
- Implement context menu and detail drawer editing
- Hook up create/update/delete/assign/change status/share using frappe-react-sdk hooks or useFrappePostCall
- Add toasts/snackbars for feedback and SWR mutate on success
- Ensure drawer is full-screen on mobile and side drawer on desktop

Milestone 6: Grouping + Project Group
- Client-side grouping by status/assignee/priority/project
- Collapsible group headers (optional)
- Accessibility and UX polish (mobile and desktop)

Milestone 7: Test Suite and Documentation
- Add comprehensive component/integration tests including mobile view
- Final accessibility checks and performance passes
- Document architecture, endpoints, auth setup with frappe-react-sdk, theming (light/dark), MDI icons, and how to extend

5. Deliverables

Backend (workz)
- workz/api/todos.py (whitelisted methods including share_todo)
- workz/www/workz.py (public entry/boot route)
- workz/tests/test_todos.py
- docs/api.md
- README.md (install, setup, permissions and the self-service permission model)

Frontend
- src/App.tsx (FrappeProvider + AuthGate)
- src/pages/WorkzTodoManager.tsx
- src/components/workz/ToDoTable.tsx (+ cells/)
- src/components/workz/ToDoListMobile.tsx (mobile cards)
- src/components/workz/ToDoToolbar.tsx
- src/components/workz/ToDoContextMenu.tsx
- src/components/workz/ToDoDetailDrawer.tsx
- src/components/workz/dialogs/(ConfirmDeleteDialog.tsx, AssignDialog.tsx)
- src/hooks/(useTodos.ts, useTodoTableState.ts, useContextMenu.ts, useTodoMutations.ts, useMobileView.ts)
- src/utils/(mapFrappeToTodo.ts, mapTodoToFrappePayload.ts)
- __tests__/todo/*
- README.md or docs/WorkzTodoManager.md covering:
  - How to initialize frappe-react-sdk
  - Auth flows with useFrappeAuth
  - Environment configuration for url/tokenParams
  - API usage and extension points
  - Explanation of the Workz self-service permission model
  - Mobile UX decisions, breakpoints, and component behavior
  - Theming (light/dark), MDI icon usage, and color policy

6. Acceptance Criteria
- workz backend app installs, endpoints exposed with permission checks implementing the self-service model.
- www/workz.py route is available and serves the intended boot or entry response.
- Frontend Workz ToDo Manager loads current user’s todos using frappe-react-sdk (useFrappeGetDocList or whitelisted methods via useFrappePostCall).
- Sorting, grouping (status/assignee/priority/project), selection, and bulk actions work.
- Mobile view:
  - Responsive card list renders on xs/sm breakpoints.
  - Long-press opens context menu; tap opens detail drawer.
  - Full-screen drawer and accessible actions on mobile.
- Design:
  - Uses MDI icons and grey outline style consistently.
  - Light and dark modes supported with adequate contrast.
  - Color reserved for attention/critical states; minimal color elsewhere.
- Assignees can update status and comment; owners can always view updates; shares grant delegated capabilities.
- Editing and sharing persist to backend; UI updates with SWR revalidation.
- Tests pass; TypeScript clean; accessible markup for key interactions.
- Documentation includes mobile considerations, theming, icon strategy, end-to-end setup with frappe-react-sdk provider and auth, plus permission model details.

Notes and Assumptions
- The application name is workz and a dedicated Frappe app named workz will be created before starting development.
- Authentication will use frappe-react-sdk’s auth model:
  - Cookie-based (co-hosted) or token-based (separate origin) via tokenParams.
- If CORS needed, configure in Frappe site config.
- Due date support can be added later if backend includes a field/update to tabToDo or a related DocType.
- Planner app can reuse hooks and components from this implementation.