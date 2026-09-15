# Exploration: Remove auth token from localStorage (web3-next)

## Context

web3-next has an httpOnly session cookie for auth (set by `app/api/auth/{login,register,logout}/route.ts`,
proxying to api-laravel), but the same bearer token is also dual-written to `localStorage`
(`lib/auth.tsx`, key `tracklife_token`, a local constant — not exported from `auth-constants.ts`,
which only exports the unrelated `SESSION_COOKIE`/`SESSION_MAX_AGE`). Any XSS on web3-next can
read the token straight out of localStorage, defeating the httpOnly protection — flagged as the
single highest-priority pre-launch security gap in an earlier audit this cycle (2026-08-30).

The project's own roadmap/tech-debt notes (P3.2, dated 2026-06-25) framed the fix as "migrate the
remaining ~18 client pages to Server Components" — a large rewrite. This exploration confirms a
much smaller fix is sufficient.

## Current State (verified against live code, not the stale roadmap note)

- **`lib/api.ts`** — confirmed single choke point. One `request<T>()` function (lines 50-93) is
  the *only* place in the client bundle that attaches `Authorization: Bearer ${token}`. All 45
  exported `api.*` methods call `request()` and take `token` as an explicit parameter — none read
  storage themselves. `request()` currently fetches `${API_URL}${path}` directly against
  `NEXT_PUBLIC_API_URL` (public Laravel host), i.e. straight browser → api-laravel, cross-origin.
- **35 page files** + 3 shared components (`FeedList.tsx`, `FollowButton.tsx`,
  `ExercisePickerModal.tsx`) import `lib/api.ts` — all funnel through `request()`. Real count is
  roughly double the stale "~18 pages" figure, but irrelevant to scope since none of them
  construct the auth header/URL directly — zero page-level edits needed for this fix.
- **`lib/auth.tsx`** — dual-write is real and current. Three runtime sites:
  `localStorage.getItem` (mount effect), `localStorage.setItem` in `persist()` (called from
  `login`/`register`), `localStorage.removeItem` (in `logout()` and on a confirmed-401 during the
  mount check). The in-code comment explicitly labels this as transitional, tagged **P5.1**.
- **Route Handler pattern to mirror**: `app/api/auth/{login,register,logout}/route.ts` all read
  `API_INTERNAL_URL` (Docker-internal `http://api-laravel:8000`), call Laravel server-to-server,
  and use `cookies()` from `next/headers` to set/read/delete the httpOnly `SESSION_COOKIE`.
  `login`/`register` forward Laravel's error body/status verbatim on failure — exactly the shape a
  generic proxy needs for 401 propagation. `lib/server-api.ts` (used only by the dashboard,
  `app/app/page.tsx`) already does the read-cookie-server-side pattern for GET and throws
  `UnauthenticatedError` on missing/rejected token.
- **CORS** (`config/cors.php`): `supports_credentials: false`, allowlist of dev hosts +
  `CORS_ALLOWED_ORIGINS` env for prod. web1-astro never calls api-laravel directly — within this
  repo, web3-next's direct browser→Laravel calls are the only in-repo consumer. The
  `CORS_ALLOWED_ORIGINS` env var hints a deployed frontend origin outside this repo's visibility
  may exist — cannot be tightened/removed without confirming that with whoever owns deployment.
- **Server Components**: only the dashboard uses `lib/server-api.ts` directly — a separate,
  already-correct pattern a new proxy route doesn't touch or duplicate. Clean coexistence.
- **No file uploads, multipart, streaming, or SSE** anywhere in `app/` — every one of the 35+3
  call sites is a plain JSON request/response, trivially proxyable.
- **No global 401→login redirect exists today** for client pages — only the dashboard Server
  Component has that behavior (via `UnauthenticatedError`). `hooks/use-api-data.ts` only surfaces
  a generic error string on failure today. Pre-existing gap, not introduced by this fix.

## Approaches

1. **Single generic proxy Route Handler + redirect `lib/api.ts`** (recommended)
   - Pros: confirmed single choke point means ~0 page-level edits; mirrors an already-proven
     pattern; removes the XSS-exposed token entirely from JS-reachable storage; small, reviewable
     diff (1 new route file + edits to `api.ts`/`auth.tsx`/`auth-constants.ts`).
   - Cons: adds one network hop per client call (browser → Next server → Laravel), small
     latency/infra cost; the generic `[...path]` handler needs an explicit allowlist boundary so
     it can't become an open relay; AuthProvider's mount-time bootstrap needs a real (small)
     rewrite (it currently gates on `localStorage.getItem` before calling `api.me()`).
   - Effort: Low.

2. **Migrate all client pages to Server Components** (old roadmap framing)
   - Pros: more "Next.js-idiomatic" for data-heavy pages.
   - Cons: touches 35+ page files individually, each losing current interactive/client-state
     patterns (`useApiData`, optimistic UI, modals, forms); vastly larger diff/regression surface
     for a problem solvable at one choke point.
   - Effort: High.

**Recommendation**: Approach 1.

## Risks

- AuthProvider bootstrap rewrite is required, not optional — small but real logic change.
- Generic `[...path]` proxy must be scoped/allowlisted, not a blind forward to any URL.
- CORS tightening is deferred — not confirmed safe without out-of-repo deployment context.
- No global 401→login redirect exists today; whether to add one in this change or defer is an
  explicit scope decision for the proposal.
- No cases needing per-page special handling were found (no uploads/streaming), removing the main
  reason the "18 pages" migration plan would have needed page-by-page work.

## Ready for Proposal

Yes.
