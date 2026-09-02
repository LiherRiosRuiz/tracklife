# Proposal: Remove auth token from localStorage (web3-next)

**Target subproject: `web3-next` only.** No changes to `api-laravel`, `web1-astro`, or `web2-nuxt`.

## Intent

web3-next dual-writes the Sanctum bearer token to `localStorage` (`tracklife_token`) alongside the
httpOnly session cookie. Any XSS reads the token directly, nullifying the httpOnly protection —
the highest-priority pre-launch security gap (audit 2026-08-30). Exploration proved this is fixable
at one choke point (`lib/api.ts::request()`), not via the roadmap's 35-page Server Component rewrite.

## Scope

### In Scope
- **Prerequisite (Decision D4, user-confirmed 2026-08-31)**: install `vitest` +
  `@testing-library/react` in `web3-next`. This app has had no test runner for 3 changes running
  (`openspec/config.yaml` → `testing.web3-next.ready: false`) while Strict TDD Mode is globally
  enabled — a standing conflict. Given this change rewrites security-critical auth logic, the user
  chose to close the gap now rather than defer again. Once installed, `openspec/config.yaml` is
  updated to `ready: true` and the rest of this change follows real RED→GREEN→REFACTOR TDD instead
  of lint+build-only verification.
- **New** `app/api/proxy/[...path]/route.ts` — same-origin Route Handler; reads `SESSION_COOKIE` via
  `next/headers`, forwards method/JSON body/query to `API_INTERNAL_URL`, attaches `Bearer` server-side,
  returns Laravel status + body verbatim. Hardened against open-relay use (see Approach).
- **Modify** `lib/api.ts` — `request()` targets `/api/proxy/...` instead of `NEXT_PUBLIC_API_URL`;
  drop manual `Authorization` header. All 45 `api.*` methods and 38 call sites unchanged.
- **Modify** `lib/auth.tsx` — remove all three `localStorage` sites; mount bootstrap calls `api.me()`
  unconditionally instead of gating on a stored token.
- **Modify** `lib/auth-constants.ts` — update the now-stale dual-write comment.
- **Add** minimal global 401 → `/login` redirect at the client fetch layer (Decision D2).

### Out of Scope
- **CORS tightening in `api-laravel/config/cors.php`** — deferred follow-up; `CORS_ALLOWED_ORIGINS`
  may serve an out-of-repo origin. Requires deployment-owner confirmation before narrowing.
- Page/component edits (exploration confirmed zero needed).
- Upload/multipart/streaming/SSE proxying (none exists in `app/`).
- `lib/server-api.ts` and the dashboard Server Component (already correct; coexists untouched).

## Capabilities

### New Capabilities
- `client-session-auth`: how web3-next's browser layer authenticates — cookie-only, no JS-readable
  token, all client API traffic same-origin through the server proxy, plus 401 handling.

### Modified Capabilities
- None. (`edge-security` is unaffected: its CORS requirement governs Traefik middleware chaining,
  not `config/cors.php`, and CORS is out of scope here.)

## Approach

Exploration Approach 1. Mirrors the proven `app/api/auth/*/route.ts` pattern.

**Decisions (explicit, not assumed):**

- **D1 — Proxy closed by construction.** Upstream URL MUST be built as fixed `API_INTERNAL_URL` +
  fixed API base prefix + `[...path]` segments, so it can only reach api-laravel. Segments MUST be
  rejected if empty, `.`, `..`, or containing a scheme, `//`, or backslash. No caller-supplied host
  is ever accepted. Inbound browser `Authorization` MUST be dropped, never relayed.
- **D2 — Include the global 401 redirect.** *Adopted.* The proxy becomes the single point every
  client 401 flows through, so it costs a few lines here versus none today; currently
  `hooks/use-api-data.ts` shows a generic error string, making post-expiry UX a dead-end. *Reject if*
  the team wants a strictly security-only PR — then it becomes a follow-up.
- **D3 — `token` in AuthContext becomes a non-secret sentinel.** The real token is no longer
  client-reachable. A truthy sentinel (e.g. `"cookie"`) keeps every `!!token` / `enabled: !!token`
  call site working unmodified, holding the diff to 4 files. It MUST NOT be transmitted anywhere.
  Renaming to `isAuthenticated` is cleaner but a broad rename — deferred.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `projects/web/web3-next/app/api/proxy/[...path]/route.ts` | New | Same-origin authenticated proxy |
| `projects/web/web3-next/lib/api.ts` | Modified | `request()` retarget; drop auth header |
| `projects/web/web3-next/lib/auth.tsx` | Modified | Drop localStorage; rewrite mount bootstrap |
| `projects/web/web3-next/lib/auth-constants.ts` | Modified | Comment only |
| `api-laravel/config/cors.php` | Unchanged | Deferred follow-up |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Proxy becomes an open relay / SSRF | Low | D1: fixed base + segment validation; no host input |
| Mount bootstrap regression (flicker, redirect loop, logged-out flash) | Med | Explicit loading state; 401 during bootstrap = unauthenticated, not a redirect loop |
| Existing sessions break (stale localStorage token ignored) | High (dev only) | Cookie already exists in parallel; users keep session. Worst case: re-login |
| Added hop adds latency per client call | Med | Server-to-server on the Docker network; accepted tradeoff |
| `!!token` sentinel misread as a real credential later | Med | D3 documented in code comment + spec |

## Rollback Plan

Go-live risk today is **zero** — web3-next runs in dev only, nothing is deployed. Still:

1. **Revert** — one `git revert` of the change commit fully restores the previous auth path. One new
   file + three edits; no migration, no persisted state, no schema change, nothing server-side to undo.
2. **No data loss** — removing `localStorage` destroys no server-side state; the httpOnly cookie is
   the real credential and is untouched by a revert.
3. **Session impact on revert** — reverted code re-reads `localStorage`, finds nothing, and prompts
   login. Users re-authenticate once; no corruption.
4. **Env safety** — `NEXT_PUBLIC_API_URL` MUST NOT be deleted here, keeping revert a pure code
   operation with no env coordination.
5. **Partial failure** — if the proxy misbehaves, reverting `lib/api.ts` alone restores direct
   browser→Laravel calls while keeping the cookie path intact.

## Dependencies

- `API_INTERNAL_URL` must be set for web3-next (already used by `app/api/auth/*` routes).
- CORS follow-up needs the deployment owner to confirm whether an out-of-repo origin uses
  `CORS_ALLOWED_ORIGINS`.

## Open Questions — resolved by user (2026-08-31)

- D2 (global 401 redirect): **adopted**, confirmed by proceeding.
- D3 sentinel vs. `isAuthenticated` rename: **sentinel adopted**, confirmed by proceeding.
- D4 (install vitest now): **yes**, explicit user decision — see Scope.
- Non-repo consumer calling api-laravel directly: still unknown — CORS stays deferred/out of
  scope per the proposal's own boundary, not blocking this change.

## Success Criteria

- [ ] `rg "localStorage" projects/web/web3-next` returns zero auth-token hits
- [ ] No `Authorization` header is constructible from client-side JS; DevTools shows no bearer token
- [ ] All client API traffic is same-origin to `/api/proxy/...`; no browser→`api.test` request remains
- [ ] Login, reload (session persists via cookie), and logout work end to end
- [ ] Proxy rejects traversal/absolute-URL path segments and cannot reach any host but api-laravel
- [ ] An expired/invalid session on a client page lands the user at `/login` (D2)
- [ ] `npm run lint` and `npm run build` pass in web3-next
