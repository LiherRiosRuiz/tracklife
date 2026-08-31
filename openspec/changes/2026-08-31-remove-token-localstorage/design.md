# Design: Remove auth token from localStorage (web3-next)

> Size note: this design intentionally exceeds the usual 800-word budget. The orchestrator
> requested exact, implementation-ready contents for 7 areas (test setup, proxy route, two
> library diffs, 401 handling, test plan, config). The prose is minimal; the code blocks
> *are* the deliverable.

## Technical Approach

Move the credential out of JavaScript reach entirely. The browser keeps only the httpOnly
`tracklife_session` cookie; every client API call goes same-origin to a new Next Route Handler
(`/api/proxy/[...path]`) which reads that cookie server-side and attaches `Bearer` on the
server-to-server hop to `API_INTERNAL_URL`. `lib/api.ts::request()` is the single choke point,
so all 45 `api.*` methods and 43 `useAuth()` call sites stay untouched (D3 sentinel).

Prerequisite (D4): install Vitest + Testing Library so the rest of this change is real TDD.

Verified against the code, not assumed:
- `request()` uses only **GET, POST, PUT, DELETE** — no PATCH (`rg 'method:' lib/api.ts`).
- `removeFavorite` sends a **JSON body on DELETE** — the proxy must forward non-GET bodies.
- Five methods call `request()` **without a token** (`userProfile`, `productByBarcode`,
  `challenges`, `clubs`, `feed`) — the proxy must forward *without* `Authorization` when no
  cookie exists, not 401.
- `api.login` / `api.register` are **dead code** (zero call sites); `auth.tsx` uses the
  `/api/auth/*` handlers directly. `api.me` has exactly one call site (`auth.tsx:40`).
- No page builds an `Authorization` header itself (`rg 'Bearer'` → only `lib/api.ts`,
  `lib/server-api.ts`, `app/api/auth/logout/route.ts`).
- Next 16: `context.params` is a **Promise** (`node_modules/next/dist/docs/.../route.md:82`).

---

## 1. Test infrastructure (D4 prerequisite)

Source: `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md` (the version actually
installed, not remembered).

**`package.json`** — devDependencies to add, scripts to add:

```jsonc
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
},
"devDependencies": {
  "@testing-library/dom": "^10",
  "@testing-library/react": "^16",   // v16 is the React 19 line
  "@vitejs/plugin-react": "^5",
  "jsdom": "^26",
  "vite-tsconfig-paths": "^5",       // resolves the "@/*" alias from tsconfig.json
  "vitest": "^3"
}
```

> **Apply-phase gate**: I could not reach the npm registry from this phase, so these are
> compatibility *ranges*, not resolved versions. Apply MUST run
> `npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths`,
> record the resolved versions, and treat a peer-dependency error (esp.
> `@vitejs/plugin-react` ↔ the Vite version Vitest 3 pulls in) as a blocker to report, not to
> paper over with `--legacy-peer-deps`.

**`vitest.config.mts`** (new, project root — `.mts` per the Next guide, so it is ESM
regardless of `package.json` type):

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",          // per-file override via `// @vitest-environment node`
    setupFiles: ["./vitest.setup.ts"],
    include: ["__tests__/**/*.test.{ts,tsx}"],
  },
});
```

**`vitest.setup.ts`** (new):

```ts
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// RTL only auto-registers cleanup when `afterEach` is a global. We keep
// `globals: false` (explicit imports, no tsconfig "types" edit), so register it here.
afterEach(cleanup);
```

Next-specific setup, decided rather than assumed:
- **`next/headers`** throws outside a request scope → every proxy-route test does
  `vi.mock("next/headers", () => ({ cookies: vi.fn() }))`.
- **`next/server`** needs no mock: `NextResponse` is a `Response` subclass and works in the
  `node` environment.
- **`next/navigation`** is only needed when a test renders `AuthGuard`/pages;
  `lib/auth.tsx` does not import it. Mock on demand, not globally.
- **Async Server Components are unsupported by Vitest** (stated in the installed guide). Nothing
  here tests one: route handlers are plain async functions and `AuthProvider` is a Client
  Component. `app/app/page.tsx` (Server Component) stays E2E/manual — no test is planned for it.
- No `@testing-library/jest-dom`: not required by the planned assertions, and skipping it keeps
  the prerequisite surface minimal. Optional follow-up.

---

## 2. `app/api/proxy/[...path]/route.ts` (new)

```ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-constants";

export const dynamic = "force-dynamic";

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? "http://api-laravel:8000";
const UPSTREAM_PREFIX = "/api";                 // D1: fixed, never caller-supplied
const SEGMENT_RE = /^[A-Za-z0-9._~-]+$/;        // allow-list, not a deny-list
const MAX_SEGMENTS = 8;
const UPSTREAM_TIMEOUT_MS = 10_000;

/** D1: returns the upstream path, or null if any segment is not provably safe. */
function safeUpstreamPath(segments: string[] | undefined): string | null {
  if (!segments || segments.length === 0 || segments.length > MAX_SEGMENTS) return null;
  for (const seg of segments) {
    // Next decodes percent-escapes before we see them, so "%2F" arrives as "/"
    // and "%2e%2e" as ".." — both fail the allow-list / the explicit check below.
    if (!SEGMENT_RE.test(seg)) return null;     // rejects "", "/", "\", ":", "@", "?", "#",
                                                // whitespace, control chars, non-ASCII
    if (seg === "." || seg === "..") return null;
  }
  return `${UPSTREAM_PREFIX}/${segments.join("/")}`;
}

async function proxy(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const upstreamPath = safeUpstreamPath(path);
  // Never echo the rejected path back — no reflection, no log injection.
  if (!upstreamPath) return NextResponse.json({ message: "Ruta de API inválida" }, { status: 400 });

  const token = (await cookies()).get(SESSION_COOKIE)?.value;

  // Outbound headers are BUILT, never copied from the inbound request. Any browser-supplied
  // Authorization / Cookie / X-Forwarded-* is therefore dropped by construction (D1).
  const headers: Record<string, string> = { Accept: "application/json" };
  // No cookie → forward unauthenticated. Public endpoints (feed, clubs, challenges,
  // products/barcode, users/:id/profile) must keep working; Laravel decides, not us.
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const raw = await request.text();           // DELETE with a JSON body is real here
    if (raw.length > 0) {
      body = raw;
      headers["Content-Type"] = "application/json";
    }
  }

  const { search } = new URL(request.url);      // plain URL, not nextUrl → testable with Request

  let res: Response;
  try {
    res = await fetch(`${API_INTERNAL_URL}${upstreamPath}${search}`, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",                       // never chase a redirect off the fixed host
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return NextResponse.json({ message: "Error de API" }, { status: 504 });
  }

  // Status + body verbatim. Response headers are ALLOW-LISTED: Laravel's Set-Cookie,
  // Location or auth headers must never be relayed to the browser.
  const payload = await res.text();
  const nullBody = res.status === 204 || res.status === 304;
  return new NextResponse(nullBody ? null : payload, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
// PATCH / HEAD / OPTIONS are deliberately NOT exported — request() never uses them and
// Next answers 405 automatically. Narrower method surface by default.
```

**Contract (Next ⇄ Laravel).** `GET|POST|PUT|DELETE /api/proxy/<seg>/…?<query>` →
`<API_INTERNAL_URL>/api/<seg>/…?<query>` on `backend_net`, with `Accept: application/json`,
`Authorization: Bearer <cookie>` when the cookie exists, and the verbatim JSON request body for
non-GET. Laravel's status code and body are returned unchanged; only `Content-Type` survives
from its response headers.

---

## 3. `lib/api.ts` diff

```ts
- const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://api.tracklife.test";
+ // Client traffic is same-origin to the Next proxy, which attaches the Bearer server-side
+ // from the httpOnly cookie. NEXT_PUBLIC_API_URL stays in the env (docker-compose, README)
+ // so a revert is a pure code operation — see the proposal's rollback plan.
+ const PROXY_BASE = "/api/proxy";
+
+ /** D3: non-secret marker exposed as AuthContext.token. Never a credential, never sent. */
+ export const SESSION_SENTINEL = "cookie";
+
+ type RequestOptions = RequestInit & { skipAuthRedirect?: boolean };
+
+ /** api.* paths all start with "/api/"; the proxy re-adds that fixed prefix upstream. */
+ function toProxyUrl(path: string): string {
+   return `${PROXY_BASE}${path.startsWith("/api/") ? path.slice(4) : path}`;
+ }

  async function request<T>(
    path: string,
-   options: RequestInit = {},
-   token?: string | null,
+   options: RequestOptions = {},
+   // D3: kept so all 45 api.* wrappers and 43 call sites stay untouched. It is a sentinel,
+   // never a credential, and is deliberately never placed on the wire.
+   token?: string | null,
  ): Promise<T> {
+   const { skipAuthRedirect = false, ...init } = options;
+
+   // Guardrail for the "sentinel misread as a real credential later" risk: if a real token
+   // ever reaches this function again, it is still not sent — and dev gets told.
+   if (process.env.NODE_ENV !== "production" && token && token !== SESSION_SENTINEL) {
+     console.warn("[api] Se pasó una credencial real a request(); se ignora y nunca se envía.");
+   }
+
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
-     ...(options.headers as Record<string, string>),
+     ...(init.headers as Record<string, string>),
    };
-
-   if (token) {
-     headers.Authorization = `Bearer ${token}`;
-   }
    …
-     res = await fetch(`${API_URL}${path}`, { ...options, headers, signal: controller.signal });
+     res = await fetch(toProxyUrl(path), {
+       ...init,
+       headers,
+       credentials: "same-origin",
+       signal: controller.signal,
+     });
    …
    if (!res.ok) {
+     if (res.status === 401 && !skipAuthRedirect) handleUnauthorized();
      …
    }

- me: (token: string) => request<{ user: User }>("/api/auth/me", {}, token),
+ // Bootstrap probe: a 401 here means "not logged in", not "session expired mid-use".
+ me: (token: string) => request<{ user: User }>("/api/auth/me", { skipAuthRedirect: true }, token),
```

Everything else in `api.ts` is unchanged — all 45 wrappers keep their signatures.

**Decision — keep the `token` parameter (not remove it).** Removing it from `request()` forces
either 45 wrapper-signature edits or 45 unused parameters (`@typescript-eslint/no-unused-vars`
is `warn` in `eslint-config-next/typescript`, with `args: "after-used"` and no
`argsIgnorePattern`). Keeping it confines the awkwardness to one place, and the dev-mode
guardrail above *consumes* the parameter — so there is no unused-parameter warning, no
`eslint.config.mjs` change, and the "sentinel is not a credential" invariant becomes
executable and testable instead of merely commented. Renaming `token` → `isAuthenticated`
across 43 call sites stays deferred per D3.

---

## 4. `lib/auth.tsx` diff

Three `localStorage` sites removed: the mount read (`:37`), `persist`'s write (`:60`), and
logout's `removeItem(TOKEN_KEY)` (`:95`). `const TOKEN_KEY` is deleted.

```tsx
- const TOKEN_KEY = "tracklife_token";
+ import { api, SESSION_SENTINEL, type User } from "./api";

  useEffect(() => {
-   async function load() {
-     const saved = localStorage.getItem(TOKEN_KEY);
-     if (saved) { … api.me(saved) … localStorage.removeItem(TOKEN_KEY) … }
-     setLoading(false);
-   }
-   load();
+   let cancelled = false;
+   // No stored token to gate on any more: ask the server. The cookie rides along
+   // automatically (same-origin), so this is the only way to know if we have a session.
+   (async () => {
+     try {
+       const { user } = await api.me(SESSION_SENTINEL);
+       if (!cancelled) { setUser(user); setToken(SESSION_SENTINEL); }
+     } catch {
+       // 401 = simply not logged in (the normal path for a visitor).
+       // 5xx / timeout / network = also "no session for this render"; the httpOnly cookie
+       // is untouched, so a reload recovers. api.me() opts out of the global 401 redirect,
+       // so this can never bounce a logged-out visitor off a public page, and AuthGuard —
+       // not this effect — owns the redirect for guarded pages. No loop, no flash.
+       if (!cancelled) { setUser(null); setToken(null); }
+     } finally {
+       if (!cancelled) setLoading(false);
+     }
+   })();
+   return () => { cancelled = true; };
  }, []);

- const persist = (newToken: string, newUser: User) => {
-   localStorage.setItem(TOKEN_KEY, newToken);
-   setToken(newToken);
-   setUser(newUser);
- };
+ const persist = (newUser: User) => {
+   setToken(SESSION_SENTINEL);   // D3: marker only; the real token never enters JS
+   setUser(newUser);
+ };

- persist(data.token, data.user);   // ×2 (login, register)
+ persist(data.user);

  const logout = () => {
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
-   localStorage.removeItem(TOKEN_KEY);
    for (const key of LOCAL_STORAGE_USER_KEYS) localStorage.removeItem(key);
    …
  };
```

`loading` stays `true` until the probe settles, so `AuthGuard` shows "Cargando TRACKLIFE…"
and never renders logged-out content first. **No behaviour regression on transient errors**:
the old code also left `user` null on a non-401 failure, so `AuthGuard` already bounced to
`/login` — it merely kept a localStorage entry that nothing then used.

**`lib/auth-constants.ts`**: comment only — drop the "distinta de la clave localStorage
`tracklife_token` (dual-write durante la transición)" line; the cookie is now the sole credential.

**Scope delta the proposal implies but does not list.** Success criterion #2 ("DevTools shows
no bearer token") is *not* met by the four listed files: `app/api/auth/login/route.ts:34` and
`register/route.ts:34` still return Laravel's `{ user, token }` verbatim, so the token is
visible in the Network tab and readable by `res.json()`. Fix, 1 line each:

```ts
- return NextResponse.json(data, { status: 200 });
+ // El token va solo a la cookie httpOnly; nunca al body, o seguiría siendo legible por JS.
+ const { token: _token, ...safe } = data;
+ return NextResponse.json(safe, { status: 200 });
```

`auth.tsx` already stops reading `data.token`, so this is safe. Flagged as a scope delta for
the tasks phase, not silently absorbed.

---

## 5. Global 401 handling (D2)

**Choice: a module-level `handleUnauthorized()` inside `lib/api.ts`, using
`window.location.assign("/login")`.**

```ts
let redirecting = false;

function handleUnauthorized() {
  if (typeof window === "undefined" || redirecting) return;
  const { pathname } = window.location;
  if (pathname === "/login" || pathname === "/registro") return;  // no loop
  redirecting = true;                                             // concurrent 401s → one nav
  window.location.assign("/login");
}
```

| Option | Trade-off | Verdict |
|---|---|---|
| `window.location.assign` in `request()` | Full reload; but no hook, no context, no router → cannot fight React's render cycle. Wipes stale client state, which is exactly right after session loss. | **Chosen** |
| Module-level callback registered by a component holding `useRouter()` | Soft navigation, but `request()` is called from promise callbacks: `router.replace` can fire during another component's render/commit and needs a registration component + lifecycle ordering. | Rejected |
| `middleware.ts` | Middleware runs *before* the upstream call; it cannot see Laravel's 401, and redirecting a `fetch()` response does not navigate the browser anyway. | Rejected — does not work |

Placement is deliberate: 401 detection lives at the `!res.ok` branch that already exists, so
`hooks/use-api-data.ts` needs **zero changes** — it keeps setting its error string, and the
navigation happens underneath it. Bootstrap is excluded via `skipAuthRedirect` on `api.me`,
which is a per-call flag rather than a mutable module suppression flag, so concurrent
in-flight requests cannot race it.

---

## 6. Test plan — RED first (TDD is live for web3-next after §1)

**`__tests__/app/api/proxy-route.test.ts`** — `// @vitest-environment node`,
`vi.mock("next/headers")`, `vi.stubGlobal("fetch", vi.fn())`. D1 rejection cases first:

| # | Input segments | Expected |
|---|---|---|
| R1 | `[]` | 400, `fetch` never called |
| R2 | `["..", "etc"]` / `["."]` | 400, `fetch` never called |
| R3 | `["a/b"]` (from `%2F`) | 400 |
| R4 | `["a\\b"]` (from `%5C`) | 400 |
| R5 | `["http:", "", "evil.com"]` / `["evil.com:8000"]` | 400 (`:` fails the allow-list) |
| R6 | `["http://evil.com"]` | 400 |
| R7 | `[""]` (double slash) | 400 |
| R8 | 9 segments | 400 |

Then the forwarding contract: **G1** GET `meals?date=2026-01-01` + cookie → upstream URL is
exactly `http://api-laravel:8000/api/meals?date=2026-01-01` with `Authorization: Bearer …`;
**G2** no cookie → forwarded with **no** `Authorization` (public endpoints keep working);
**G3** inbound `Authorization: Bearer attacker-token` → **absent** from the upstream call;
**G4** DELETE `/api/proxy/favorites` with a JSON body → body + `Content-Type` forwarded;
**G5** upstream 422 + JSON → same status, byte-identical body; **G6** upstream `Set-Cookie` →
**not** on the proxy response; **G7** upstream rejects/times out → 504; **G8** the module
exports no `PATCH`.

**`__tests__/lib/api.test.ts`** — **A1** every call hits `/api/proxy/...` and never
`api.tracklife.test`; **A2** no `Authorization` header is ever produced, even when a token
argument is passed; **A3** a 401 on a normal call calls `location.assign("/login")`; **A4** a
401 from `api.me` does **not** navigate; **A5** a 401 while already on `/login` does not
navigate; **A6** two concurrent 401s navigate once.

**`__tests__/lib/auth.test.tsx`** — jsdom + RTL, `api` mocked: **B1** valid session on mount →
`user` set, `token === "cookie"`, `loading` false; **B2** 401 on mount → `user`/`token` null,
`loading` false, no throw, no navigation; **B3** network error on mount → identical to B2 and
`loading` still resolves (no infinite spinner); **B4** `login()` → POSTs `/api/auth/login`,
context populated, and `localStorage.getItem("tracklife_token") === null`; **B5** `logout()` →
POSTs `/api/auth/logout`, clears context, still clears `tracklife_favorites` /
`tracklife_active_workout` / `tracklife_workout_start`; **B6** invariant — spy on
`Storage.prototype.setItem` across the whole login→reload→logout flow and assert it is never
called with `tracklife_token`.

**`__tests__/app/api/auth-routes.test.ts`** (scope delta §4) — **C1** login returns 200 with a
body that has **no** `token` key while still setting the httpOnly cookie; **C2** same for
register (201).

Non-automated (Vitest cannot test async Server Components): the `app/app/page.tsx` dashboard
path and the real browser end-to-end login → reload → logout, covered by the proposal's
manual success criteria.

---

## File Changes

| File | Action | Description |
|---|---|---|
| `package.json` | Modify | Vitest/RTL devDeps + `test` / `test:watch` scripts |
| `vitest.config.mts` | Create | jsdom default, tsconfig path alias, setup file |
| `vitest.setup.ts` | Create | RTL `cleanup` on `afterEach` |
| `app/api/proxy/[...path]/route.ts` | Create | Same-origin authenticated proxy (D1) |
| `lib/api.ts` | Modify | Retarget to `/api/proxy`, drop `Authorization`, add 401 redirect + sentinel |
| `lib/auth.tsx` | Modify | Remove 3 localStorage sites, rewrite mount bootstrap |
| `lib/auth-constants.ts` | Modify | Comment only |
| `app/api/auth/login/route.ts` | Modify | Strip `token` from the response body (scope delta) |
| `app/api/auth/register/route.ts` | Modify | Strip `token` from the response body (scope delta) |
| `openspec/config.yaml` | Modify | `testing.web3-next.ready: true` (§7) |
| `__tests__/**` | Create | 4 test files per §6 |

---

## 7. `openspec/config.yaml` update

```yaml
testing:
  web3-next:
    ready: true
    runner: "Vitest 3 + @testing-library/react (jsdom) via `npm test`"
    existing_tests: "__tests__/app/api/proxy-route.test.ts, __tests__/app/api/auth-routes.test.ts, __tests__/lib/api.test.ts, __tests__/lib/auth.test.tsx"
    lint: "npm run lint (eslint 9)"
    build: "npm run build"
    notes: "Vitest cannot test async Server Components — app/app/page.tsx stays E2E/manual."
```

Three companion edits in the same file, or they contradict the block above:
- `context:` — replace "web3-next currently has no test runner installed" with
  "web3-next runs Vitest + Testing Library (installed 2026-08-31)".
- `rules.apply.guidelines` — replace "For web3-next, flag that vitest is not installed before
  enabling strict TDD there" with "For web3-next, write Vitest tests first (TDD ready)".
- `rules.apply.test_command` and `rules.verify.test_command` — replace
  `web3-next: npm run lint (no test runner yet)` with `web3-next: npm test`.

---

## Threat Matrix

Routing *is* changed (a new dynamic Route Handler), so the matrix applies — but every canonical
row targets shell/VCS/PR automation, none of which exists here.

| Boundary | Applicability | Design response |
|---|---|---|
| Documentation-like paths | **N/A** — no file classification or execution; the proxy only forwards HTTP | — |
| Git repository selection | **N/A** — no VCS invocation | — |
| Commit state | **N/A** — no VCS invocation | — |
| Push state | **N/A** — no VCS invocation | — |
| PR commands | **N/A** — no PR automation | — |

Routing-specific adversarial matrix (**Applicable**, carried unchanged into `tasks.md`):

| Adversarial case | Safe behavior | RED test |
|---|---|---|
| Traversal (`..`, `.`, `%2e%2e`) | 400, no upstream call | R2 |
| Encoded separators (`%2F`, `%5C`) | 400 | R3, R4 |
| Scheme / authority injection (`http:`, `host:port`, `http://evil.com`) | 400 | R5, R6 |
| Empty segment / double slash | 400 | R1, R7 |
| Segment-count flood | 400 | R8 |
| Browser-supplied `Authorization` | Dropped (headers built, never copied) | G3 |
| Upstream `Set-Cookie` relay | Dropped (response headers allow-listed) | G6 |
| Upstream redirect off-host | `redirect: "manual"`, `Location` not relayed | covered by G6's allow-list |
| Upstream hang | 504 after 10 s | G7 |
| Unexpected method (PATCH/OPTIONS) | 405 (handler not exported) | G8 |

## Migration / Rollout

No data migration. Stale `tracklife_token` entries in existing dev browsers are simply orphaned
and never read again; the httpOnly cookie already exists in parallel, so sessions survive.
`NEXT_PUBLIC_API_URL` stays defined in `docker-compose.yml` and `README.md` so a `git revert`
needs no env coordination. `API_INTERNAL_URL` is already set (used by `app/api/auth/*`).

## Open Questions — resolved by orchestrator (2026-08-31)

- [x] **Scope delta confirmed.** Stripping `token` from the login/register response bodies is
      included — it's required by the proposal's own success criterion #2 ("DevTools shows no
      bearer token"); shipping without it would leave the exact vulnerability half-fixed (token
      out of localStorage, still readable via `res.json()` on every login). 1 line each, `auth.tsx`
      already stops reading `data.token` so nothing downstream breaks.
- [x] **Dependency versions**: accept as ranges; apply must run the real `npm install`, record
      resolved versions in apply-progress.md, and treat peer-dependency conflicts as a blocker to
      report, never silently bypass with `--legacy-peer-deps`.
- [x] **CORS narrowing**: stays deferred, out of scope, per the proposal.
