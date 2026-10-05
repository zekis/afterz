# Workz CSRF and Auth Implementation Guide (Based on Afterz Patterns)

Purpose
This guide reviews how the existing “afterz” app authenticates frontend GET/POST/PUT requests in a Frappe environment and documents a step-by-step, production-grade approach to implement the same (or improved) behavior for the new “workz/works” app with a React frontend. The focus is on CSRF tokens, session cookies, and token-based alternatives using frappe-react-sdk.

Scope
- Frappe CSRF behavior and expectations
- Server (Frappe) configuration and hooks relevant to CSRF/auth
- Frontend setup (document bootstrap, CSRF token extraction, and automatic header injection)
- Using frappe-react-sdk (recommended) vs custom fetch/axios
- Handling GET/POST/PUT requests and cross-origin constraints (CORS)
- Auth flows: cookie session and token-based
- Troubleshooting checklist

1) How Frappe CSRF Works (Baseline)
- Frappe uses cookie-based sessions (sid) for authentication and requires CSRF protection for state-changing requests (POST/PUT/DELETE). GET requests typically do not require CSRF unless the method is whitelisted but marked as “allow_guest=False” (still, CSRF applies only for state-changing requests).
- CSRF token is sent to the client via:
  - A cookie named frappe-csrf-token, or
  - A rendered page context (on server-side rendered routes), or
  - Included in the “/api/method/frappe.auth.get_logged_user” response (less reliable to use for CSRF).
- Frappe expects a header X-Frappe-CSRF-Token for POST/PUT/DELETE from same-origin or allowed cross-origin requests when session cookie is present.
- If your React app is served through a www route (same origin), session cookie and CSRF cookie/header can be used without CORS complications.
- If your React app runs on a different origin, you must:
  - Enable CORS in Frappe, including credentials (cookies).
  - Use fetch with credentials: "include".
  - Ensure the CSRF token header is set from the cookie value.

2) Review of Afterz Patterns (What to mirror)
Note: You should inspect these files in the afterz app to validate specifics. Typical patterns used are:
- A public www route (afterz/www/...) to serve an HTML entry or static bundle that runs on the same origin. This ensures cookies (sid, frappe-csrf-token) are first-class citizens.
- Hooks configuration that does NOT disable CSRF middleware. Instead, it aligns the frontend to supply the token.
- JavaScript injection (or bootstrap script) that:
  - Reads the CSRF token from document.cookie ("frappe-csrf-token=...").
  - Intercepts fetch/axios to add X-Frappe-CSRF-Token to non-GET requests.
  - Adds Content-Type: application/json and credentials: "include".
- When using the Frappe desk context (same host), the cookies are sent automatically and only the CSRF header is needed for POST/PUT/DELETE.

You can confirm in:
- afterz/hooks.py (ensures standard middleware is used; does not disable CSRF)
- afterz/www/* (entry points serving React)
- frontend service layer (if exists) that sets fetch defaults with credentials and CSRF header)

3) Workz/Works Server Setup

3.1 App and www Route
- Create a dedicated app (works for ToDo; workz may exist for other modules—do not mix namespaces).
- Use www/works.py to serve the SPA entry (HTML) or a minimal JSON boot payload.
- Ensure that when user hits /works (or /workz if that is the chosen name), the response sets/maintains the frappe-csrf-token cookie (Frappe typically sets/refreshes it on render or login). Using Frappe’s templating or desk context ensures CSRF cookie is available.

3.2 Hooks and Middleware
- Do not disable CSRF. In works/hooks.py:
  - Avoid custom overrides that remove CSRF or change auth middleware.
  - If adding endpoints via whitelisted methods, mark allow_guest appropriately:
    - State-changing endpoints should enforce logged-in users (allow_guest=False) and will require CSRF header, plus session cookie.
- If serving the React bundle via Frappe (recommended), place built assets in works/public or use the www route to load them.

3.3 CORS for Cross-Origin
If React runs on a separate origin (not recommended for initial rollout):
- In site_config.json (or common_site_config):
  - "allow_cors": "*example.com*" or an array of allowed origins
- In hooks or nginx/custom-config:
  - Ensure Access-Control-Allow-Origin matches your app URL (not “*” when using credentials).
  - Add Access-Control-Allow-Credentials: true
  - Access-Control-Allow-Headers includes X-Frappe-CSRF-Token, Content-Type, Authorization
- Then ensure fetch includes credentials: "include"

4) Frontend Setup for CSRF (Two Approaches)

Approach A: Using frappe-react-sdk (Recommended)
- Initialize in App.tsx:
  import { FrappeProvider } from "frappe-react-sdk";
  function App() {
    return (
      <FrappeProvider url="https://your-frappe-site.example.com">
        {/* App routes */}
      </FrappeProvider>
    )
  }

- Auth Hook:
  import { useFrappeAuth } from "frappe-react-sdk";
  const { currentUser, isLoading, error, login, logout, getUserCookie } = useFrappeAuth();

- Data Hooks:
  - useFrappeGetDocList("ToDo", opts)
  - useFrappeCreateDoc("ToDo")
  - useFrappeUpdateDoc("ToDo", name)
  - useFrappeDeleteDoc("ToDo", name)
  - useFrappePostCall for custom whitelisted methods

How CSRF is handled:
- frappe-react-sdk internally uses fetch and attaches credentials where appropriate.
- When running same-origin, session cookie is automatically sent.
- For state changes, Frappe expects X-Frappe-CSRF-Token. The SDK will pass it if present in cookies. If you encounter issues:
  - Ensure your app is served from the Frappe host (or configure CORS).
  - Ensure cookie “frappe-csrf-token” is present. If not, trigger updateCurrentUser (useFrappeAuth) to refresh or fetch a page that sets it (e.g., a minimal SSR route).
  - For token-based auth (Bearer/API key), CSRF is not required, but you must configure tokenParams at provider init and backend must accept token headers.

Approach B: Custom Fetch Wrapper (If not using SDK everywhere)
- Create a http.ts:
  export function getCSRFTokenFromCookie(): string | null {
    const m = document.cookie.match(/(?:^|;\s*)frappe-csrf-token=([^;]+)/i);
    return m ? decodeURIComponent(m[1]) : null;
  }
  export async function httpFetch(input: RequestInfo, init: RequestInit = {}) {
    const isMutating = init.method && !["GET", "HEAD", "OPTIONS"].includes(init.method.toUpperCase());
    const headers = new Headers(init.headers || {});
    headers.set("Content-Type", "application/json");
    // ensure cookies (sid) included
    const credentials = "include";
    if (isMutating) {
      const csrf = getCSRFTokenFromCookie();
      if (csrf) headers.set("X-Frappe-CSRF-Token", csrf);
    }
    return fetch(input, { ...init, headers, credentials });
  }

- Use httpFetch for all requests:
  await httpFetch("/api/method/works.api.todos.update_todo", {
    method: "POST",
    body: JSON.stringify({ name, payload }),
  });

- Important:
  - Ensure the cookie “frappe-csrf-token” exists (served via your www/works.py route or login flow).
  - Ensure “sid” cookie (session) exists for authenticated calls.

5) Ensuring Authentication for GET and PUT/POST
- GET:
  - For secure endpoints requiring login, GET requests rely on the session cookie (sid). If using frappe-react-sdk on same origin, this is automatic.
  - If CORS, ensure credentials are included and CORS configured properly.
- POST/PUT/DELETE:
  - Must include X-Frappe-CSRF-Token header with the value from the frappe-csrf-token cookie (unless using OAuth/Bearer/API key based auth).
  - Must include credentials: "include" so the session cookie is sent.
  - Response 403 indicates either no session or CSRF mismatch:
    - Verify cookies present and not blocked by browser (3rd-party cookie issues).
    - Verify CSRF header matches cookie.
    - Verify server “allow_cors” and allowed headers include X-Frappe-CSRF-Token.

6) Login Flows
- Cookie-based:
  - Use useFrappeAuth().login(username, password) to establish a session. This sets sid and CSRF cookies.
  - On success, call updateCurrentUser() if needed, then proceed with requests.
- Token-based:
  - Initialize FrappeProvider with tokenParams (useToken: true, token: getToken(), type: "Bearer" or "token").
  - Ensure backend accepts token auth for endpoints (some Frappe methods assume session—adapt whitelisted methods to accept token-based auth where appropriate).
  - CSRF generally not needed for token-based; but if both are present, server may still accept CSRF header.

7) Typical Problems and Fixes

Problem: 403 Forbidden on POST with “CSRF Token Missing or Incorrect”
- Fixes:
  - Confirm “frappe-csrf-token” cookie exists.
  - Ensure you set header X-Frappe-CSRF-Token equal to that cookie for mutating requests.
  - Check credentials: "include" on fetch.
  - If cross-origin, verify CORS settings and that Access-Control-Allow-Credentials is true, and Access-Control-Allow-Origin is your exact app origin.

Problem: GET requests 403 even though logged in
- Fixes:
  - Session cookie not included due to cross-origin without credentials.
  - Browser blocked 3rd-party cookies (Safari/Chrome ITP). Prefer same-origin deploy for the React app or use token-based authentication.
  - Check that the endpoint requires login; ensure session is established.

Problem: frappe-react-sdk not attaching CSRF
- Fixes:
  - Ensure cookie exists. If not, render a minimal server route (www/works.py) that sets the cookie and serve the app from there.
  - For dev with Vite/CRA on different origin, add a proxy or configure CORS and use credentials.

Problem: CORS preflight failing
- Fixes:
  - Include X-Frappe-CSRF-Token, Content-Type in Access-Control-Allow-Headers.
  - Respond with 200 to OPTIONS with proper CORS headers.

8) Implementation Checklist (Works App)

Backend (works):
- [ ] Confirm works/hooks.py does not disable CSRF middleware.
- [ ] Implement whitelisted methods under works.api.todos with allow_guest properly set (False for state-changing APIs).
- [ ] Create works/www/works.py to serve SPA entry and ensure CSRF cookie is available.
- [ ] If cross-origin: add CORS headers (Access-Control-Allow-Origin exact origin, Allow-Credentials true, Allow-Headers includes X-Frappe-CSRF-Token).
- [ ] Test endpoints via curl/Postman including cookie and CSRF header.

Frontend (React + frappe-react-sdk):
- [ ] Wrap app with FrappeProvider (url if not same-origin). For dev, consider a proxy.
- [ ] Use useFrappeAuth to establish session and fetch current user.
- [ ] For data: prefer useFrappeGetDocList/useFrappeCreateDoc/useFrappeUpdateDoc/useFrappeDeleteDoc.
- [ ] For custom endpoints: useFrappePostCall or a custom fetch wrapper that injects CSRF and credentials.
- [ ] If not same-origin in dev, ensure fetch includes credentials and the Frappe server has CORS configured.
- [ ] Add a central http client that automatically reads frappe-csrf-token from cookies and sets X-Frappe-CSRF-Token on non-GET.

QA/Testing:
- [ ] Manual test login via useFrappeAuth.login and verify sid + CSRF cookies.
- [ ] GET authenticated endpoint returns data.
- [ ] POST/PUT/DELETE with X-Frappe-CSRF-Token succeed.
- [ ] Cross-origin test (if applicable): confirm CORS/credentials and cookies function across browsers (Chrome/Safari with ITP).
- [ ] Regression: verify no sensitive endpoints allow_guest=True unless required.
- [ ] Add integration tests (mocking fetch) to ensure CSRF header is attached for mutating requests.

9) Code Snippets

9.1 works/www/works.py (minimal)
import frappe

def get_context(context):
    # Context for rendering SPA entry if using Jinja template
    # Ensures CSRF token cookie is maintained by Frappe
    context.no_cache = 1
    return context

# Add corresponding works/www/works.html that loads your React bundle or meta-refresh to the app route.

9.2 Custom fetch wrapper (if needed)
export function getCSRFTokenFromCookie(): string | null {
  const m = document.cookie.match(/(?:^|;\s*)frappe-csrf-token=([^;]+)/i);
  return m ? decodeURIComponent(m[1]) : null;
}
export async function httpFetch(input: RequestInfo, init: RequestInit = {}) {
  const method = (init.method || "GET").toUpperCase();
  const isMutating = !["GET", "HEAD", "OPTIONS"].includes(method);
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");
  const credentials: RequestCredentials = "include";
  if (isMutating) {
    const csrf = getCSRFTokenFromCookie();
    if (csrf) headers.set("X-Frappe-CSRF-Token", csrf);
  }
  return fetch(input, { ...init, headers, credentials });
}

10) Recommended Deployment Model
- Prefer serving the React app via Frappe www route (same origin):
  - Simplifies cookies and CSRF handling.
  - Eliminates cross-origin and 3rd-party cookie problems.
- For local development with separate ports:
  - Use a dev proxy (Vite/CRA) to route /api/method/* and /api/resource/* to the Frappe server.
  - Or configure CORS properly and always include credentials, CSRF header for mutating requests.

11) Summary
- Ensure session cookie (sid) exists and is included with requests.
- Always set X-Frappe-CSRF-Token for POST/PUT/DELETE from the “frappe-csrf-token” cookie value.
- Prefer same-origin deployment via www/works.py to avoid cross-origin cookie pitfalls.
- Use frappe-react-sdk to simplify auth and data flows; fall back to a custom fetch wrapper if needed.
- Validate allow_guest for endpoints; enforce permission checks server-side.
- Test across browsers and with CORS if cross-origin is unavoidable.

With this pattern in place, all GET and PUT/POST requests from the Workz/Works app will be authenticated and CSRF-compliant in a Frappe environment.