# Apply Progress: Remove auth token from localStorage (web3-next)

## Batch 1 (this batch)

**Scope**: Phase 1 only — Vitest + Testing Library install and config in web3-next.
Tooling only, zero behavior change to existing application code.
**Chain**: PR 1 of 5 (feature-branch-chain per tasks.md forecast — PR1 targets the
feature/tracker branch `feat/remove-token-localstorage`).
**Mode**: Standard (no production code/behavior under test in this batch — Phase 1 is
pure tooling install/config, which is why tasks.md scopes it outside the RED-first
phases 2-5; strict TDD Cycle Evidence begins in Phase 2).

## Phase 1: Test Infrastructure (D4 prerequisite)

- [x] 1.1 `npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths`
- [x] 1.2 Added `test` / `test:watch` scripts to `package.json`
- [x] 1.3 Created `vitest.config.mts`
- [x] 1.4 Created `vitest.setup.ts`
- [x] 1.5 Verified `npm test` runs clean with zero test files

### Resolved dependency versions (actual, not design ranges)

The design flagged these as unverified compatibility *ranges*. Real `npm install` output:

| Package | Design range | **Resolved (actual)** |
|---|---|---|
| vitest | `^3` | **`4.1.11`** |
| @vitejs/plugin-react | `^5` | **`6.1.1`** |
| jsdom | `^26` | **`30.0.1`** |
| @testing-library/react | `^16` | **`16.3.3`** |
| @testing-library/dom | `^10` | **`10.4.1`** |
| vite-tsconfig-paths | `^5` | **`6.1.1`** |

`npm install` (unpinned, no version constraints given) resolved to the current latest
majors on the public registry as of 2026-08-31 — one major ahead of every range the
design assumed (vitest 3→4, @vitejs/plugin-react 5→6, jsdom 26→30, vite-tsconfig-paths
5→6). `@testing-library/react`/`dom` landed inside the design's stated range.

**Peer-dependency check**: `npm install` completed with **zero peer-dependency errors**
and **no** `--legacy-peer-deps`/`--force` was used. `npm ls <pkg> --depth=0` for all six
new packages resolves cleanly with no `UNMET PEER DEPENDENCY` warnings. This is
**not** a blocker per the design's gate condition (peer-dep conflict), but the major
version drift is recorded below as a deviation because it changed real runtime
behavior of the config (see below).

Production dependency `sharp` (`^0.35.2` in `dependencies`) remained at
`0.35.2` post-install — confirmed via `npm ls sharp --depth=0` — so the "changed 2
packages" in the npm summary was internal dedup/peer resolution only, not an
unintended production dependency bump.

## Deviations from Design (with rationale)

1. **`passWithNoTests: true` added to `vitest.config.mts` `test` block** — not present
   in the design's snippet. Without it, `vitest run` with the design's
   `include: ["__tests__/**/*.test.{ts,tsx}"]` and zero existing test files exits with
   code 1 and the message "No test files found, exiting with code 1" — a hard failure,
   not the "clean 'no tests found' report" the apply-phase gate explicitly requires.
   This is Vitest's default behavior (empty match set = exit 1) regardless of the
   3→4 version jump; the design's config snippet did not account for the "zero tests
   yet" state Phase 1 is deliberately left in. Added the one-line option with an
   inline comment explaining it's temporary until Phase 2 lands real tests. No other
   change to the design's config shape.
2. **Major version drift (vitest 3→4, @vitejs/plugin-react 5→6, jsdom 26→30,
   vite-tsconfig-paths 5→6)** — accepted, not worked around. The install command run
   was the exact one specified in tasks.md 1.1 (no version pins), which is expected
   to pull current majors from the registry per the design's own acknowledged
   uncertainty ("I could not reach the npm registry from this phase"). Verified the
   `test.environment` config key (used by `vitest.config.mts`) still exists and
   resolves in vitest 4.1.11's shipped `config.d.ts`/`config.cjs` before relying on
   it. `npm test` was run end-to-end against the actual installed versions (not
   assumed) and produced the clean, gated result below.
3. No other deviations. `vitest.setup.ts` matches the design's snippet verbatim.
   `package.json` scripts match verbatim.

## Work Unit Evidence (Unit 1 — Vitest+RTL install, config, zero-test green run)

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npm test` → `vitest run` → `No test files found, exiting with code 0` (after `passWithNoTests: true` fix). Exit code confirmed `0` via `echo $?`. Before the fix: exit code `1` with the same message minus "code 0" — captured as the reason for the deviation above. |
| Runtime harness command/scenario and exact result | N/A — tooling only, no behavior change, per tasks.md's own Unit 1 row ("N/A — tooling only, no behavior change"). Sanity-checked anyway: `npm run lint` still reports the same pre-existing 5 `no-img-element` warnings, 0 errors (unchanged from before this batch) — confirms zero regression to existing app code. |
| Rollback boundary | Delete `vitest.config.mts` and `vitest.setup.ts`; revert `package.json` (scripts block) and `package-lock.json`. No application code touched — `git status --short` for this batch shows only `package.json` (M), `package-lock.json` (M), `vitest.config.mts` (??), `vitest.setup.ts` (??). |

## Files Changed

| File | Action | What Was Done |
|---|---|---|
| `projects/web/web3-next/package.json` | Modified | Added `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `vite-tsconfig-paths` to `devDependencies`; added `test` (`vitest run`) and `test:watch` (`vitest`) scripts |
| `projects/web/web3-next/package-lock.json` | Modified | Lockfile update from `npm install` (1848 insertions) |
| `projects/web/web3-next/vitest.config.mts` | Created | jsdom environment, `tsconfigPaths()` + `react()` plugins, setup file, `__tests__/**/*.test.{ts,tsx}` include, `passWithNoTests: true` (deviation, see above) |
| `projects/web/web3-next/vitest.setup.ts` | Created | RTL `cleanup` registered on `afterEach` (verbatim per design §1) |

## Issues Found

None blocking. Recorded for awareness of the next batch (Phase 2):

- `npm test` prints an informational (non-fatal) notice: `The plugin
  "vite-tsconfig-paths" is detected. Vite now supports tsconfig paths resolution
  natively via the resolve.tsconfigPaths option...` — cosmetic only, does not affect
  test results or exit code. Kept `vite-tsconfig-paths` as the design specified rather
  than switching to the native Vite option, since the design explicitly chose the
  plugin and this batch is tooling-only (no design changes without a design update).
- 5 high-severity `npm audit` advisories reported by the install (pre-existing
  transitive dev-tooling risk surface, not introduced by version selection specific
  to this batch — not investigated further as out of Phase 1 scope; flagged for the
  user/maintainer to triage separately if desired).

## Batch 2

**Scope**: Phase 2 only — the closed-by-construction proxy route (`app/api/proxy/[...path]/route.ts`)
and its RED-first test file (`__tests__/app/api/proxy-route.test.ts`). The route is created but
**unused** by the rest of the app in this batch (`lib/api.ts` still targets `NEXT_PUBLIC_API_URL`
directly) — that is expected; PR3 (Phase 3) retargets it.
**Chain**: PR 2 of 5 (feature-branch-chain, targets PR1's branch `feat/remove-token-localstorage-01-test-tooling`
per the orchestrator's branch naming for this batch: `feat/remove-token-localstorage-02-proxy-route`).
**Mode**: Strict TDD. RED written first for all 16 threat-matrix/forwarding-contract cases,
confirmed failing (module did not exist), then GREEN implementation, tests re-run to confirm pass.

### Vitest 4 API-compatibility check (per orchestrator's instruction)

`vi.mock("next/headers", () => ({ cookies: vi.fn() }))` (factory form, as already used in
design §1's Next-specific setup notes, not the bare `vi.mock("next/headers")` form quoted in
design §6's test-plan prose) works **identically** under vitest 4.1.11 to the documented vitest 3
behavior: hoisting, mock-call ordering, and `vi.mocked(cookies).mockResolvedValue(...)` all
behaved as expected on the first run — RED failed for the correct reason (missing module, not a
mocking API error), and GREEN passed 16/16 on the first execution after the route was written, so
no vitest-4-specific test syntax rewrite was needed. `vi.stubGlobal("fetch", vi.fn())` /
`vi.unstubAllGlobals()` also behaved identically to v3. **No deviation required** — the design's
mocking approach ported to vitest 4 without changes.

## Phase 2: Proxy Route — RED first

- [x] 2.1 RED `__tests__/app/api/proxy-route.test.ts`: cases R1-R8 (empty/traversal/`.`/encoded-slash/encoded-backslash/scheme-authority/double-slash/segment-flood → 400, `fetch` never called) per design §6 threat matrix. Confirm all fail (no route yet).
- [x] 2.2 RED same file: cases G1-G8 (query+cookie forwarding, no-cookie public passthrough, inbound `Authorization` dropped, DELETE-with-body forwarded, upstream status/body verbatim, `Set-Cookie` not relayed, upstream timeout→504, no `PATCH` export).
- [x] 2.3 GREEN: create `app/api/proxy/[...path]/route.ts` per design §2 (`safeUpstreamPath` allow-list, headers built not copied, 10s timeout, response headers allow-listed, `GET`/`POST`/`PUT`/`DELETE` only).
- [x] 2.4 Run `npm test` — all R1-R8, G1-G8 green.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.1-2.4 | `__tests__/app/api/proxy-route.test.ts` | Unit (node env, mocked `next/headers` + global `fetch`) | N/A (new file, new route — nothing pre-existing to protect) | ✅ Written first; ran `npx vitest run __tests__/app/api/proxy-route.test.ts` before `route.ts` existed → `Error: Cannot find package '@/app/api/proxy/[...path]/route'`, 0 tests collected — failed for the right reason (missing production module, not a typo/assertion bug) | ✅ After writing `route.ts` per design §2 verbatim: `16 passed (16)` on first execution, zero iteration needed | ✅ 16 cases total: 8 rejection cases (R1-R8, each a distinct adversarial input from the threat matrix) + 8 forwarding-contract cases (G1-G8: cookie-present/absent, inbound-Authorization-drop, DELETE-body, verbatim-passthrough, Set-Cookie-strip, timeout→504, no-PATCH) — every spec scenario in design §6 has its own test, no shared Fake-It path | ➖ None needed — production code was written once directly matching the design's verbatim reference implementation (this is one of the explicit "design gives full code block" sections); no post-GREEN structural change was made or needed |

### Test Summary

- **Total tests written**: 16 (`R1`-`R8`, `G1`-`G8`)
- **Total tests passing**: 16/16
- **Layers used**: Unit (16) — Next.js Route Handlers exercised directly as plain async functions with real `Request`/`Response` objects (no HTTP server, no supertest); `next/headers` mocked (required outside request scope), `fetch` stubbed globally
- **Approval tests** (refactoring): None — no refactoring tasks, `route.ts` is a new file
- **Pure functions created**: 1 (`safeUpstreamPath(segments)` — deterministic, no side effects, covered directly by R1-R8 via the exported route handlers)

### Assertion quality notes (self-check against strict-tdd.md banned patterns)

Every R-case asserts `res.status === 400` **and** `fetchMock` was never called — not a status-only
check, so a regression that accidentally still forwarded a rejected path would fail the test even
if it also (wrongly) returned 400 for an unrelated reason. Every G-case asserts a specific header/
body/status value read from the real `fetchMock.mock.calls[0]` arguments or the real `NextResponse`
returned by the handler — no `toBeDefined()`/tautology assertions. G6 (Set-Cookie strip) and G3
(inbound Authorization drop) are the two closest to "trivial pass by omission" risk in this suite;
both are guarded by a companion case that proves the header/cookie **was** present in the mocked
upstream response or inbound request, so the negative assertion is against a deliberately non-empty
input, not an untested default.

### Deviations from Design

None. `route.ts` matches design §2's code block verbatim (same allow-list regex, same
`MAX_SEGMENTS`, same 10s `AbortSignal.timeout`, same header allow-list on the response, same
`GET`/`POST`/`PUT`/`DELETE` export set with `PATCH` deliberately omitted). The test file is new
(design §6 only gave a table of cases, not full test code), written to satisfy every row of that
table with real assertions per strict-tdd.md's Assertion Quality Rules. `vi.mock("next/headers")`
used the factory form already shown in design §1 rather than the bare form quoted in design §6's
prose — see the "Vitest 4 API-compatibility check" note above; this is the same form the design's
own §1 setup notes specify, not a new deviation.

### Runtime harness (beyond the required focused test command)

tasks.md's Work Unit 2 row suggested "manual `curl` against `/api/proxy/users/me` on a running
stack." A live stack was found already running for this repo (`api-laravel` container up 32h,
plus a `next dev` process reachable through Traefik at `http://app.tracklife.test`, unrelated to
and not started by this batch — Turbopack picked up the new route file via its existing file
watcher). Verified against that real stack, real Laravel/MongoDB backend, zero mocks:

| Request | Result |
|---|---|
| `curl -i http://app.tracklife.test/api/proxy/challenges` (no cookie, real public Laravel endpoint) | `200 OK`, real challenge JSON from MongoDB returned verbatim through the proxy — confirms G1/G2/G5-equivalent behavior live, not just under mocks |
| `curl -i http://app.tracklife.test/api/proxy/users/me` (no cookie) | `404`, Laravel's own "route not found" JSON body forwarded verbatim (the actual route is `api/auth/me`, not `api/users/me` — confirms the proxy reaches Laravel and returns its exact response, does not swallow or alter it) |
| `curl -i "http://app.tracklife.test/api/proxy/..%2Fadmin"` | `400 {"message":"Ruta de API inválida"}` — D1 rejection confirmed live, request never reached Laravel (no Laravel stack-trace body, unlike the 404 case above) |
| `curl -i "http://app.tracklife.test/api/proxy/http://evil.test/x"` | Same `400` rejection — scheme/authority-injection confirmed live |

No files were modified to run this check; it only reads responses from an already-running dev
process. This is genuine additional evidence beyond the unit-test layer, not a substitute for it.

## Files Changed (Batch 2)

| File | Action | What Was Done |
|---|---|---|
| `projects/web/web3-next/app/api/proxy/[...path]/route.ts` | Created | Closed-by-construction proxy route per design §2 — `safeUpstreamPath` allow-list validation, headers built (never copied) so inbound `Authorization`/`Cookie` are dropped by construction, 10s upstream timeout → 504, response headers allow-listed (`Content-Type`, `Cache-Control` only — `Set-Cookie` never relayed), `GET`/`POST`/`PUT`/`DELETE` exported, `PATCH` deliberately not exported. **Currently unused** by the rest of the app (`lib/api.ts` retarget is Phase 3/PR3). |
| `projects/web/web3-next/__tests__/app/api/proxy-route.test.ts` | Created | 16 tests (R1-R8 threat-matrix rejections, G1-G8 forwarding-contract cases) per design §6, `// @vitest-environment node`, `vi.mock("next/headers")` factory form, `vi.stubGlobal("fetch", ...)`. |

## Work Unit Evidence (Unit 2 — Proxy route + RED/GREEN tests, design §2/§6)

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx vitest run __tests__/app/api/proxy-route.test.ts` → `Test Files 1 passed (1)`, `Tests 16 passed (16)`. Full-suite `npx vitest run` (all test files in the project) also `1 passed (1)` / `16 passed (16)` — confirms this is still the only test file in the repo, zero regression to Phase 1's zero-test baseline. |
| Runtime harness command/scenario and exact result | See "Runtime harness" table above — real `curl` against the live dev stack through Traefik, hitting the real `api-laravel` backend for both a public 200 endpoint and two D1-rejected paths. All four cases matched expected behavior. |
| Rollback boundary | Delete `app/api/proxy/` and `__tests__/app/api/proxy-route.test.ts`. Nothing else references the new route yet (`rg -l "api/proxy"` in `projects/web/web3-next` outside these two paths returns nothing), so this batch is fully reversible with a 2-path deletion and no follow-on edits to revert. `git status --short -- projects/web/web3-next` shows only these two untracked paths for this batch. |

## Issues Found (Batch 2)

None. `npm run lint` after this batch reports the same pre-existing 5 `no-img-element` warnings,
0 errors — unchanged from Batch 1's baseline, confirming zero regression from the new route file.

## Remaining Tasks

- [ ] Phase 3: `lib/api.ts` retarget — RED first
- [ ] Phase 4: `lib/auth.tsx` bootstrap rewrite — RED first
- [ ] Phase 5: Login/register response strip — RED first
- [ ] Phase 6: Config + final verification

## Batch 3

**Scope**: Phase 3 only — `lib/api.ts` retarget to the proxy (`PROXY_BASE`, `toProxyUrl`,
`SESSION_SENTINEL` export, dropped `Authorization` construction) and the global 401 →
`/login` redirect (`handleUnauthorized`, design §5). `lib/auth.tsx`'s `localStorage` removal
is explicitly **not** touched — that is Phase 4/PR4. The `token` parameter on `request()` is
kept per Decision D3, so `auth.tsx`'s existing localStorage-based `api.me(saved)` call keeps
compiling and working unchanged during this transitional PR.
**Chain**: PR 3 of 5 (feature-branch-chain, targets PR2's branch
`feat/remove-token-localstorage-02-proxy-route` per the orchestrator's branch naming for this
batch: `feat/remove-token-localstorage-03-api-retarget`).
**Mode**: Strict TDD. RED written first for all 6 cases (A1-A6) per design §3/§5/§6, confirmed
failing for the right reason (missing proxy retarget / missing 401 redirect — not an
infrastructure error, see the vitest-4 mocking deviation below), then GREEN implementation,
full suite re-run to confirm no regression to Phase 2's 16 proxy-route tests.

### Transitional-state verification (per orchestrator's explicit instruction)

Verified against the actual code, not assumed:

- `auth.tsx`'s `login`/`register` call `fetch("/api/auth/login" | "/api/auth/register", ...)`
  directly (`lib/auth.tsx:70-89`) — these hit `app/api/auth/login/route.ts` and
  `app/api/auth/register/route.ts` directly, which call Laravel via `API_INTERNAL_URL` (not
  through `lib/api.ts::request()` at all, not through the new proxy). Confirmed by reading
  `app/api/auth/login/route.ts:10` (`fetch(`${API_INTERNAL_URL}/api/auth/login`, ...)`) — this
  code path is completely untouched by this batch and needs no reasoning about the sentinel.
- `auth.tsx`'s mount-bootstrap still calls `api.me(saved)` with a **real** localStorage token
  (`lib/auth.tsx:40`, unchanged — Phase 4 scope). Since `request()` still accepts (and now
  silently discards) a `token` argument, this compiles and runs unchanged. The real token is
  never placed on the wire any more (dev-mode `console.warn` guardrail fires instead) — verified
  live: the running dev container's logs show exactly this warning firing from a real browser
  session mid-session (`[browser] [api] Se pasó una credencial real a request(); se ignora y
  nunca se envía. (lib/api.ts:85:13)`), immediately followed by `GET /api/proxy/auth/me 200` —
  i.e. the stale localStorage token was discarded and the request still succeeded because the
  httpOnly cookie carried the session through the proxy. This is exactly the reasoning the
  orchestrator asked to be verified, confirmed live, not assumed.
- All other pages call `request()` through `api.*` wrappers, which now hit `/api/proxy/...`
  same-origin, `credentials: "same-origin"`, cookie-authenticated by the proxy server-side — so
  authenticated calls keep working through this transitional state as long as the login-set
  httpOnly cookie exists, independent of whether `token` is real, stale, or the sentinel.

### Vitest 4 / jsdom window-mocking deviation (per orchestrator's instruction to verify)

The design's test-plan prose implies a `vi.spyOn`-style approach for `window.location.assign`.
Under **vitest 4.1.11 + jsdom 30.0.1** (this repo's actually-resolved versions, one major ahead
of the design's vitest-3 assumption per Batch 1's note), `vi.spyOn(window.location, "assign")`
throws `TypeError: Cannot redefine property: assign` — jsdom 30's `Location.prototype.assign`
is a non-configurable own property on the location instance, so `spyOn` (which redefines the
property in place) cannot touch it. **Fix**: redefine `window.location` wholesale per test —
`Object.defineProperty(window, "location", { value: { ...originalLocation, pathname, assign:
assignMock }, writable: true, configurable: true })` — restoring the original `window.location`
in `afterEach`. Probed in isolation first (a throwaway test file, deleted after confirming the
pattern) before writing it into the real RED test, to avoid guessing under TDD pressure. This
is a **test-file-only** deviation — no production code shape changed because of it. Also used
`vi.resetModules()` + dynamic `await import("@/lib/api")` per test to get a fresh module
instance, since `handleUnauthorized`'s module-level `redirecting` flag (design §5) is not
exported and must not leak state across A3/A4/A5/A6.

## Phase 3: `lib/api.ts` Retarget — RED first

- [x] 3.1 RED `__tests__/lib/api.test.ts`: A1 (all calls hit `/api/proxy/...`), A2 (no `Authorization` header ever), A3 (401 → `location.assign("/login")`), A4 (`api.me` 401 does not navigate), A5 (already on `/login` does not navigate), A6 (two concurrent 401s navigate once) per design §3, §5.
- [x] 3.2 GREEN: modify `lib/api.ts` per design §3 diff — `PROXY_BASE`, exported `SESSION_SENTINEL`, `toProxyUrl`, drop `Authorization` construction, add `skipAuthRedirect` + `handleUnauthorized` (design §5), `api.me` passes `skipAuthRedirect: true`.
- [x] 3.3 Run `npm test` — A1-A6 green; confirm all 45 `api.*` signatures unchanged.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 3.1-3.3 | `__tests__/lib/api.test.ts` | Unit (jsdom env, mocked global `fetch` + `window.location`) | ✅ 16/16 (Phase 2's `proxy-route.test.ts`) run before touching `lib/api.ts` — confirmed pre-existing suite green first | ✅ Written first; ran `npx vitest run __tests__/lib/api.test.ts` before `lib/api.ts` was modified → 4/6 failed for the right reason (A1/A2: still hit `api.tracklife.test` with a real `Authorization` header; A3/A6: `assignMock` never called because no 401-redirect logic exists yet). A4/A5 passed vacuously at RED time (current code never navigates on any 401) — expected and consistent with a genuinely-not-yet-implemented feature, not a false green (both are re-verified as real behavioral passes at GREEN, see TRIANGULATE column) | ✅ After the design §3/§5 diff: `6 passed (6)` on first execution, zero iteration needed | ✅ 6 cases covering every design §6 A-scenario: A1 (3 different `api.*` wrappers, one with no token arg, each URL asserted exactly), A2 (real-looking token arg still produces no `Authorization` header + `credentials: "same-origin"` asserted), A3 (401 on a normal call → exactly 1 navigate call with the exact `"/login"` argument), A4 (`api.me`'s `skipAuthRedirect: true` proven — 401 + zero navigate calls, re-verified post-GREEN so it's not the RED-time vacuous pass), A5 (pathname `/login` guard — 401 + zero navigate calls, same re-verification), A6 (`Promise.allSettled` on two concurrent 401 calls → exactly 1 navigate call, proving the `redirecting` flag serializes concurrent 401s) | ➖ None needed — `lib/api.ts` changes matched design §3's code block directly; no post-GREEN structural change was made or needed |

### Test Summary

- **Total tests written**: 6 (`A1`-`A6`)
- **Total tests passing**: 6/6 (22/22 full suite, including Phase 2's 16 proxy-route tests — zero regression)
- **Layers used**: Unit (6) — `lib/api.ts::request()`/`api.*` exercised directly against a stubbed global `fetch` and a wholesale-redefined `window.location`, no real network, no rendered component
- **Approval tests** (refactoring): None — `request()`'s external contract (all 49 `api.*` wrapper signatures) is unchanged, so no approval-test pass was needed to protect existing behavior beyond the Phase 2 safety net already covering the proxy side
- **Pure functions created**: 1 (`toProxyUrl(path)` — deterministic string transform, covered indirectly by A1's exact-URL assertions)

### Assertion quality notes (self-check against strict-tdd.md banned patterns)

A1 asserts the **exact** proxied URL per call (`/api/proxy/dashboard`, `/api/proxy/workouts`,
`/api/proxy/users/user-123/profile`), not just a `startsWith` check alone — a regression that
proxied to the wrong upstream segment would fail this test even though it also "starts with
`/api/proxy/`". A2 asserts `headers.Authorization` is `undefined` **and** a real-looking token
string was actually passed as the argument — proving the omission is a deliberate drop, not an
accident of never having a token to begin with. A3/A6 assert both `toHaveBeenCalledTimes` and
(A3) the exact `"/login"` argument — not just "was called". A4/A5's negative assertions
(`not.toHaveBeenCalled()`) are guarded by A3's companion positive case in the same file proving
`assignMock` **does** fire under the equivalent-but-different setup (normal call, default
pathname), so the negative assertions are not testing an untested default.

### Deviations from Design

1. **Vitest 4 / jsdom 30 `window.location` mocking syntax** — see the dedicated section above.
   Test-file-only; the `handleUnauthorized`/`request()` production code matches design §3/§5
   verbatim.
2. **45 vs. actual 49 `api.*` wrapper count** — the design's own text (§3, "all 45 `api.*`
   methods") undercounts; a direct AST-adjacent count of top-level keys in the `api = {...}`
   object gives **49**. This is a pre-existing inaccuracy in the design document, not introduced
   by this batch — flagged for awareness, not corrected in the design (out of apply-phase scope
   to edit design.md). Verified via `git diff` that every one of the 49 wrapper signatures is
   byte-for-byte unchanged; only `request()`'s internals and the `me` wrapper's *call site*
   (not its own exported signature) changed.
3. No other deviations. `lib/api.ts` matches design §3's code block diff verbatim (`PROXY_BASE`,
   `SESSION_SENTINEL`, `RequestOptions`, `toProxyUrl`, the dev-mode guardrail, `credentials:
   "same-origin"`, the `401 && !skipAuthRedirect` branch, `api.me`'s `skipAuthRedirect: true`).
   `handleUnauthorized` in `lib/api.ts` matches design §5's code block verbatim (`redirecting`
   flag, `/login`/`/registro` loop guard, `window.location.assign("/login")`).

### Runtime harness (beyond the required focused test command)

tasks.md's Work Unit 3 row suggested "Browser DevTools Network tab, real login flow." No browser
automation tool was available in this environment, so the equivalent real-stack verification was
done via `curl` against the same running dev stack used in Batch 2 (`api-laravel` + `tracklife`
Next dev container, both up, Turbopack picked up the `lib/api.ts` edit via its file watcher —
confirmed by `⚠ Fast Refresh had to perform a full reload when ./lib/api.ts changed` in
`docker logs tracklife`), plus real dev-container log evidence from an already-open browser tab
(not started by this batch):

| Check | Result |
|---|---|
| `POST http://app.tracklife.test/api/auth/register` (real new user, real Laravel/MongoDB) | `201 Created`, `Set-Cookie: tracklife_session=...; HttpOnly; SameSite=lax`, body still contains `token` (unchanged — stripping the body token is Phase 5, out of this batch's scope) |
| `GET http://app.tracklife.test/api/proxy/auth/me` with the session cookie, **no** `Authorization` header sent by the client | `200 OK`, real user JSON — proves the exact URL shape `api.me()`/`request()` now produces (`toProxyUrl("/api/auth/me")` → `/api/proxy/auth/me`) works end-to-end against the live proxy + Laravel |
| `GET http://app.tracklife.test/api/proxy/dashboard` with the same cookie | `200 OK`, real dashboard JSON (macros, weekly calories, feed preview) — proves the exact URL `api.dashboard()` now produces works live, matching A1's assertion `/api/proxy/dashboard` |
| `GET http://app.tracklife.test/api/proxy/auth/me` with **no** cookie | `401 Unauthorized` — the trigger condition `handleUnauthorized()` reacts to, confirmed live from the real proxy+Laravel stack, not a mock |
| Live dev-container log evidence (pre-existing open browser session, unrelated to this batch's curl calls) | `[browser] [api] Se pasó una credencial real a request(); se ignora y nunca se envía.` immediately followed by `GET /api/proxy/auth/me 200` — real-world confirmation that `auth.tsx`'s still-unmodified stale-localStorage-token bootstrap call keeps working through the retarget, exactly per the transitional-state reasoning above |

No component/page was modified to run this check — only `lib/api.ts` per the assigned scope.
The smoke-test user (`smoketest-pr3-<timestamp>@example.com`) was left in the dev database;
no cleanup mechanism exists for ad hoc dev registrations and none was requested.

## Files Changed (Batch 3)

| File | Action | What Was Done |
|---|---|---|
| `projects/web/web3-next/lib/api.ts` | Modified | Retargeted `request()` to `/api/proxy/...` (`PROXY_BASE` + `toProxyUrl`), added `credentials: "same-origin"`, dropped `Authorization` header construction entirely, exported `SESSION_SENTINEL`, added `RequestOptions`/`skipAuthRedirect`, added module-level `handleUnauthorized()` (design §5) wired into the existing `!res.ok` branch, `api.me` now passes `skipAuthRedirect: true`. `NEXT_PUBLIC_API_URL`/`API_URL` constant removed (superseded by `PROXY_BASE`) — all 49 `api.*` wrapper signatures unchanged. |
| `projects/web/web3-next/__tests__/lib/api.test.ts` | Created | 6 tests (A1-A6) per design §3/§6/§5, jsdom environment (default), `vi.stubGlobal("fetch", ...)`, wholesale `window.location` redefinition per test (vitest-4/jsdom-30 deviation, documented above), `vi.resetModules()` + dynamic import per test for `redirecting`-flag isolation. |

## Work Unit Evidence (Unit 3 — `lib/api.ts` retarget + 401 redirect, design §3/§5)

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx vitest run __tests__/lib/api.test.ts` → `Test Files 1 passed (1)`, `Tests 6 passed (6)`. Full-suite `npx vitest run` → `Test Files 2 passed (2)`, `Tests 22 passed (22)` — confirms zero regression to Phase 2's 16 proxy-route tests. `npx tsc --noEmit` (redirected `--tsBuildInfoFile` to the scratchpad to avoid a pre-existing permission issue on the repo's `tsconfig.tsbuildinfo`) reported zero type errors. `npm run lint` reports the same pre-existing 5 `no-img-element` warnings, 0 errors — unchanged baseline. |
| Runtime harness command/scenario and exact result | See "Runtime harness" table above — real `curl` register → cookie → `/api/proxy/auth/me` (200) → `/api/proxy/dashboard` (200) → no-cookie `/api/proxy/auth/me` (401), against the live `api-laravel` + `tracklife` dev containers, plus live dev-log confirmation of the transitional stale-token-discard behavior from an independent browser session. |
| Rollback boundary | Revert `lib/api.ts` to restore direct browser→Laravel calls via `NEXT_PUBLIC_API_URL`/`API_URL` and delete `__tests__/lib/api.test.ts`. `lib/auth.tsx`, `lib/auth-constants.ts`, and the `app/api/auth/*` route handlers are untouched by this batch (`git status --short -- projects/web/web3-next` shows only `lib/api.ts` (M) and `__tests__/lib/api.test.ts` (??) for this batch), so this is a 1-file-revert + 1-file-delete rollback with no follow-on edits. |

## Issues Found (Batch 3)

None blocking. `npx tsc --noEmit` hit a pre-existing environment permission error writing
`tsconfig.tsbuildinfo` to the repo root (unrelated to this batch's code — worked around by
redirecting `--tsBuildInfoFile` to the scratchpad; flagged for the user/maintainer if `tsc`
is expected to run cleanly in CI without a workaround).

## Remaining Tasks

- [ ] Phase 4: `lib/auth.tsx` bootstrap rewrite — RED first
- [ ] Phase 5: Login/register response strip — RED first
- [ ] Phase 6: Config + final verification

## Batch 4

**Scope**: Phase 4 only — `lib/auth.tsx` bootstrap rewrite (design §4) and the
`lib/auth-constants.ts` comment-only cleanup. Removes the last 3 `localStorage` read/write/
remove sites for the auth token (`TOKEN_KEY` deleted entirely). `app/api/auth/login/route.ts`
and `app/api/auth/register/route.ts` are explicitly **not** touched — they still return
`{ user, token }` in the response body for one more PR (Phase 5/PR5 strips it). This is
harmless now: `auth.tsx` no longer reads `data.token` from either response, so the still-present
`token` field in the body is dead data as of this batch, not a functional dependency.
**Chain**: PR 4 of 5 (feature-branch-chain, targets PR3's branch
`feat/remove-token-localstorage-03-api-retarget` per the orchestrator's branch naming for this
batch: `feat/remove-token-localstorage-04-auth-bootstrap`).
**Mode**: Strict TDD. RED written first for all 6 cases (B1-B6) per design §4/§6, confirmed
failing for the right reason, then GREEN implementation, full suite re-run to confirm no
regression to Phases 2-3's 22 tests.

### Vitest 4 / jsdom 30 / Node 26 `localStorage`-shadowing deviation (real environment bug, not test-syntax)

This is a genuine three-way version interaction, not a syntax mismatch like Batch 3's
`window.location` issue — root-caused with the actual `vitest`/`jsdom` source, not guessed:

- **Symptom**: the very first RTL-rendering test file in this repo (`auth.test.tsx`) found
  `window.localStorage` / `window.sessionStorage` both `undefined` inside jsdom-environment
  tests, with Node printing `ExperimentalWarning: localStorage is not available because
  --localstorage-file was not provided` — even though jsdom 30.0.1 fully implements
  `window.localStorage` (confirmed by reading `node_modules/jsdom/lib/jsdom/browser/Window.js`
  — a working getter, gated only on non-opaque origin, and the test origin
  `http://localhost:3000` is not opaque).
- **Root cause, traced through `node_modules/vitest/dist/chunks/index.DC7d2Pf8.js`**: Vitest's
  jsdom environment copies only an explicit allow-list (`LIVING_KEYS` + `OTHER_KEYS`, ~280
  names) from the real jsdom `window` onto the Vitest global — **`"localStorage"` and
  `"sessionStorage"` are not in that list**. The copy function `getWindowKeys()` falls back to
  including *any* jsdom-only own-property name not already present on the Node global — which is
  how `localStorage` got through on older Node versions with no native `globalThis.localStorage`.
  **Node 26.5.0** (this repo's installed Node, confirmed via `node --version`) ships a *native*,
  non-functional-by-default `globalThis.localStorage` getter (Node's own experimental Web
  Storage API, `--webstorage`/`--no-experimental-webstorage` flag, enabled by default). Because
  `"localStorage" in global` is now `true` *before* jsdom's environment setup runs, Vitest's
  filter (`if (k in global) return keysArray.includes(k)`) excludes it — leaving Node's inert
  native getter in place, shadowing jsdom's real, working one. Confirmed step by step with
  throwaway probe test files (`__tests__/tmp/probe.test.ts`, deleted after each check): (1)
  `window.location.origin` is `http://localhost:3000`, not opaque; (2) `globalThis.jsdom.window
  .localStorage` (Vitest's own internal reference to the raw jsdom window, exposed as
  `dom.window.jsdom = dom`) is a real, working `object`; (3) the `localStorage` property
  descriptor on the Vitest global is `configurable: true` (Node's own, not jsdom's); (4) running
  with `NODE_OPTIONS=--no-experimental-webstorage` makes `window.localStorage` resolve correctly
  with zero other changes.
- **Fix applied**: `package.json`'s `test`/`test:watch` scripts now prefix
  `NODE_OPTIONS=--no-experimental-webstorage` (`"test": "NODE_OPTIONS=--no-experimental-webstorage
  vitest run"`, same for `test:watch`), so every contributor gets the fix automatically without
  needing a shell env var or a custom Vitest environment. This is a plain `sh -c` env-var prefix
  (already the pattern for scripts in this repo — no `cross-env` dependency exists or is needed,
  and the project's Docker dev stack is Linux-only per the repo `CLAUDE.md`). No production code
  is affected; this is test-infrastructure-only, same category as Batch 1's `passWithNoTests`
  fix. Flagged for the user/maintainer: if CI or a future contributor's shell ever bypasses `npm
  test` (e.g. calling `vitest` directly), this flag needs to be applied manually or CI's Node
  version needs to be checked against the same Node 22+ webstorage-global behavior.
- **Scope of the fix**: `package.json` only — no `vitest.config.mts` change, no `vitest.setup.ts`
  change, no test-file workaround. This keeps the design's `vitest.config.mts`/`vitest.setup.ts`
  snippets byte-for-byte as specified; the deviation is fully contained to the npm script layer.

### `toHaveTextContent` unavailable — design's own `@testing-library/jest-dom` opt-out, re-confirmed live

Design §1 explicitly decided against installing `@testing-library/jest-dom` ("not required by
the planned assertions, and skipping it keeps the prerequisite surface minimal"). The first draft
of `auth.test.tsx` used `toHaveTextContent()` (a jest-dom matcher) without noticing the
dependency — RED run surfaced `Error: Invalid Chai property: toHaveTextContent` immediately, which
is Vitest's own expect (no jest-dom matchers registered) refusing an unknown property. **Not
treated as a reason to add jest-dom** (that would silently reverse the design's own explicit
Open Question resolution outside apply-phase scope) — rewrote all text assertions to a local
`expectText(el, text)` helper (`expect(el.textContent).toBe(text)`), which is a real, specific
assertion (not `toBeDefined()`/tautology) and needs no extra dependency. This is a test-file-only
adjustment; no production code or design-approved dependency list changed.

### B6 regression-catch verification (per orchestrator's explicit instruction)

Did **not** just trust B6 passes post-GREEN — actively verified it fails when the old
dual-write anti-pattern is present. Procedure: temporarily edited `persist()` in the real
(already-GREEN) `lib/auth.tsx` to add back `localStorage.setItem("tracklife_token",
"MUTATION-TEST-PROBE")` (the exact shape of the original bug), ran `npm test -- __tests__/lib/
auth.test.tsx -t B6` in isolation, confirmed it failed with `AssertionError: expected
[ [ 'tracklife_token', … ] ] to have a length of +0 but got 1` — i.e., the invariant assertion
caught the exact regression it exists to prevent, not a vacuous pass. Immediately reverted the
mutation (removed the added `localStorage.setItem` line, restored the exact GREEN `persist()`
body), re-ran `npm test` (full suite) to confirm 28/28 green again before proceeding. No
mutation-probe code is present in the final `lib/auth.tsx`.

### Transitional-state note (design's own documented scope delta, verified not a regression)

`app/api/auth/login/route.ts:34` and `register/route.ts:34` still return `{ user, token }`
verbatim (unchanged — Phase 5 scope). Confirmed live in the register `curl` below: the response
body still contains a real `token` field. This is expected and explicitly documented in the
design (§4, "Scope delta the proposal implies but does not list") — `auth.tsx` no longer reads
`data.token` from either response (verified by reading the final `login`/`register` functions:
both now call `persist(data.user)` only, `data.token` is never referenced), so the still-present
body field is inert, not a functional risk. Success criterion #2 ("DevTools shows no bearer
token") is **not yet fully met** until Phase 5 strips the body field — flagged, not silently
absorbed, consistent with the design's own scope-delta note.

## Phase 4: `lib/auth.tsx` Bootstrap Rewrite — RED first

- [x] 4.1 RED `__tests__/lib/auth.test.tsx`: B1 (valid session on mount), B2 (401 on mount), B3 (network error on mount, no infinite spinner), B4 (`login()` clears `localStorage` token), B5 (`logout()` clears context + other keys), B6 (`Storage.prototype.setItem` spy never called with `tracklife_token`) per design §4.
- [x] 4.2 GREEN: modify `lib/auth.tsx` — delete `TOKEN_KEY`, rewrite mount effect to call `api.me(SESSION_SENTINEL)` unconditionally with a `cancelled` guard, rewrite `persist(newUser)` using `SESSION_SENTINEL`, drop `localStorage.removeItem(TOKEN_KEY)` in `logout`.
- [x] 4.3 Modify `lib/auth-constants.ts`: remove stale dual-write comment.
- [x] 4.4 Run `npm test` — B1-B6 green.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 4.1-4.4 | `__tests__/lib/auth.test.tsx` | Integration (jsdom + RTL `render`/`fireEvent`/`waitFor`, real `AuthProvider` + `useAuth()` tree, `@/lib/api` module mocked at the `api.me`/`SESSION_SENTINEL` boundary) | ✅ 22/22 (Phases 2-3's `proxy-route.test.ts` + `api.test.ts`) run before touching `lib/auth.tsx` — confirmed pre-existing suite green first | ✅ Written first; ran `npm test -- __tests__/lib/auth.test.tsx` before `lib/auth.tsx` was modified → 6/6 failed. B1/B4/B5/B6 failed for the right reason (old mount effect never calls `api.me` without a saved localStorage token, so it can't set an authenticated user from a mocked session; old `login()` still writes the real token into `token` context state instead of the sentinel). B2/B3 passed vacuously at RED time (old code's no-token mount path coincidentally also ends at `user: null, loading: false`) — expected and re-verified as real (non-vacuous) behavioral passes at GREEN, see TRIANGULATE column | ✅ After the design §4 diff: `6 passed (6)` on first execution, zero iteration needed | ✅ 6 cases covering every design §6 B-scenario: B1 (mount → `api.me("cookie")` called exactly once, user + sentinel token set), B2 (401 → null user/token, `loading` still resolves, no throw — re-verified at GREEN that this is now a *real* pass because `api.me` is actually invoked and its rejection is actually handled, not skipped), B3 (network `TypeError` on mount → identical outcome to B2, proving the `catch` is generic, not 401-specific — re-verified GREEN for the same non-vacuous reason as B2), B4 (`login()` → context populated via the sentinel, real fetch mock asserted, `localStorage.getItem("tracklife_token")` asserted `null` even though the mocked response body still contains a real-looking token — proves `auth.tsx` never reads or persists it), B5 (`logout()` → POST asserted, context cleared, `LOCAL_STORAGE_USER_KEYS`/`SESSION_STORAGE_USER_KEYS` cleared), B6 (full login→unmount/remount("reload")→logout cycle with a `Storage.prototype.setItem` spy, zero calls with the `tracklife_token` key across the whole flow — **actively mutation-tested**, see the dedicated section above: reintroducing the old dual-write makes this exact test fail with a length-1 assertion, confirmed then reverted) | ✅ None needed beyond the design's own diff — `lib/auth.tsx` matches design §4's code block verbatim (mount effect shape, `persist(newUser)` signature, `logout()` body); no post-GREEN structural change was made or needed |

### Test Summary

- **Total tests written**: 6 (`B1`-`B6`)
- **Total tests passing**: 6/6 (28/28 full suite, including Phases 2-3's 22 tests — zero regression)
- **Layers used**: Integration (6) — first RTL-rendering test file in this repo; real component tree (`AuthProvider` wrapping a `Probe` consumer of `useAuth()`), real React state/effect timing via `waitFor`, only the `@/lib/api` module boundary mocked (not `fetch` for `login`/`register`, which are asserted against a real `vi.stubGlobal("fetch", ...)` mock at the network boundary `auth.tsx` actually uses)
- **Approval tests** (refactoring): None — `AuthContextType`'s external shape (`user`, `token`, `loading`, `login`, `register`, `logout`) is unchanged, so no approval-test pass was needed; the 43 `useAuth()` call sites outside this batch's scope are protected by that unchanged interface, not by a new approval test
- **Pure functions created**: 0 — `lib/auth.tsx` is inherently effectful (React state, `fetch`, `localStorage`); per strict-tdd.md's own guidance, pure-function extraction was not forced where it doesn't fit

### Assertion quality notes (self-check against strict-tdd.md banned patterns)

Every `expectText()` call asserts a **specific** string derived from a specific mock/fixture
(`"Ada Lovelace"`, `"cookie"`, `"Grace Hopper"`, `"null"`), never a bare `toBeDefined()`/tautology
— and every one is paired with a companion case proving the *other* value is reachable (e.g. B1
proves `"cookie"`/a real name is reachable, B2/B3 prove `"null"` is reachable, so neither is an
untested default). B4's `localStorage.getItem(...)).toBeNull()` is guarded against being a trivial
"never called `setItem` at all" false negative by embedding a real-looking `token` field in the
mocked login response body first — if `auth.tsx` regressed and started writing it again, this
assertion would catch it (and did, per the mutation-test section above, via B6's broader
version of the same check). B6's `tokenWrites.toHaveLength(0)` is the one "empty collection"
assertion in this suite; per strict-tdd.md's Empty Collection Rule it is valid here because (1)
the precondition is a full login→reload→logout cycle that *does* call `Storage.prototype.setItem`
for other reasons (the two `LOCAL_STORAGE_USER_KEYS`/`SESSION_STORAGE_USER_KEYS` clears go through
`removeItem`, not `setItem`, so the spy legitimately sees zero `tracklife_token` writes from real
code paths that do run), and (2) the mutation-test section is exactly the required companion proof
that a non-empty result *is* reachable when the anti-pattern is present.

### Deviations from Design (with rationale)

1. **`NODE_OPTIONS=--no-experimental-webstorage` added to `package.json`'s `test`/`test:watch`
   scripts** — not present in the design. Root-caused as a genuine Vitest 4.1.11 / jsdom 30.0.1 /
   Node 26.5.0 three-way interaction (Node's native experimental `globalThis.localStorage`
   shadows jsdom's real, working one inside Vitest's jsdom-environment global-copy allow-list —
   full trace in the dedicated section above, verified against the actual installed package
   source, not assumed). This is exactly the kind of jsdom/RTL version-specific issue the
   orchestrator asked to be checked for; unlike Batch 3's `window.location` case (a pure
   test-syntax fix), this one requires a real runtime flag because the bug is Node-global-level,
   not test-file-level. Scope contained to `package.json`; zero production code, zero
   `vitest.config.mts`/`vitest.setup.ts` changes.
2. **No `@testing-library/jest-dom` used** — not a deviation from the design, but flagged
   because the first draft of the test file briefly used a jest-dom matcher
   (`toHaveTextContent`) before the RED run caught the missing dependency; corrected to a local
   `.textContent` helper before the RED evidence in the table above, so it never shipped in the
   committed state. Full rationale in the dedicated section above.
3. No other deviations. `lib/auth.tsx`'s mount effect, `persist()`, `login()`/`register()`
   call sites, and `logout()` match design §4's code block diff verbatim. `lib/auth-constants.ts`
   is a comment-only change per the design's own one-line instruction.

### Runtime harness (beyond the required focused test command) — spec requirement 7 (login/reload/logout end-to-end)

tasks.md's Work Unit 4 row suggested "Manual login/reload/logout in browser." No browser
automation tool was available in this environment. Per the orchestrator's explicit instruction
to verify this is *genuinely* true and not just that unit tests pass, ran a real end-to-end
sequence against the live `api-laravel` + `tracklife` dev containers (both already running,
unrelated to this batch) using `curl` with a real cookie jar, simulating exactly what the
browser's mount effect does after a reload — a same-origin `GET /api/proxy/auth/me` request
carrying **only** the httpOnly cookie, zero `Authorization` header, zero client-side token of
any kind:

| Step | Request | Result |
|---|---|---|
| 1. Register (sets the session cookie) | `POST http://app.tracklife.test/api/auth/register` (real new user, real Laravel/MongoDB) | `201 Created`, `Set-Cookie: tracklife_session=...; HttpOnly; SameSite=lax`. Body still contains a real `token` field — expected, Phase 5 scope, not read by `auth.tsx` |
| 2. "Reload" (cookie only, before logout) | `GET http://app.tracklife.test/api/proxy/auth/me` with **only** the cookie jar from step 1, no `Authorization` header | `200 OK` — this is the *exact* request `api.me(SESSION_SENTINEL)` makes from the new mount effect; proves a reload with zero localStorage/client token stays authenticated purely via the cookie |
| 3. Logout | `POST http://app.tracklife.test/api/auth/logout` with the same cookie jar | `200 OK` |
| 4. "Reload" (cookie only, after logout) | `GET http://app.tracklife.test/api/proxy/auth/me` with the (now-invalidated) cookie jar | `401 Unauthorized` — proves logout actually ends the session server-side, not just client-side context clearing |

This is the complete spec requirement 7 scenario ("Session persists across reload without
localStorage" + "Logout clears the session") verified live end-to-end, not simulated with mocks.
Separately, `docker logs tracklife` showed a real, independent browser session (already open,
unrelated to this batch's curl calls) pick up the `lib/auth.tsx` file change via Turbopack
(`⚠ Fast Refresh had to perform a full reload when ./lib/auth.tsx changed`) and immediately issue
`GET /api/proxy/auth/me 200` — real-world confirmation the new bootstrap works in an actual
browser, not just curl.

No component/page was modified to run this check — only `lib/auth.tsx` and
`lib/auth-constants.ts` per the assigned scope. The two smoke-test users
(`smoketest-pr4-<timestamp>@example.com`, `smoketest-pr4b-<timestamp>@example.com`) were left in
the dev database; no cleanup mechanism exists for ad hoc dev registrations and none was requested.

## Files Changed (Batch 4)

| File | Action | What Was Done |
|---|---|---|
| `projects/web/web3-next/lib/auth.tsx` | Modified | Deleted `TOKEN_KEY`; mount `useEffect` now unconditionally calls `api.me(SESSION_SENTINEL)` with a `cancelled`-flag async IIFE (no more localStorage-gated skip); `persist(newUser)` now takes one argument and sets `token` to `SESSION_SENTINEL`; `login`/`register` call `persist(data.user)` (no longer read `data.token`); `logout()` no longer calls `localStorage.removeItem(TOKEN_KEY)` but still clears `LOCAL_STORAGE_USER_KEYS`/`SESSION_STORAGE_USER_KEYS`. All 3 `localStorage` auth-token sites removed. |
| `projects/web/web3-next/lib/auth-constants.ts` | Modified | Comment-only: removed the stale "distinta de la clave localStorage `tracklife_token` (dual-write durante la transición)" note now that the cookie is the sole credential. |
| `projects/web/web3-next/__tests__/lib/auth.test.tsx` | Created | 6 tests (B1-B6) per design §4/§6, jsdom + RTL (`render`/`fireEvent`/`waitFor`), `@/lib/api` mocked at the `api.me`/`SESSION_SENTINEL` boundary, `Storage.prototype.setItem` spy for B6, local `.textContent` assertion helper (no jest-dom). |
| `projects/web/web3-next/package.json` | Modified | `test`/`test:watch` scripts prefixed with `NODE_OPTIONS=--no-experimental-webstorage` — Vitest-4/jsdom-30/Node-26 `localStorage`-shadowing fix, see deviation section above. |

## Work Unit Evidence (Unit 4 — `lib/auth.tsx` bootstrap rewrite, design §4)

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npm test -- __tests__/lib/auth.test.tsx` → `Test Files 1 passed (1)`, `Tests 6 passed (6)`. Full-suite `npm test` → `Test Files 3 passed (3)`, `Tests 28 passed (28)` — confirms zero regression to Phases 2-3's 22 tests. `npx tsc --noEmit` (build info redirected to the scratchpad, same pre-existing repo-root permission workaround as Batch 3) reported zero type errors. `npm run lint` reports the same pre-existing 5 `no-img-element` warnings, 0 errors — unchanged baseline. |
| Runtime harness command/scenario and exact result | See "Runtime harness" table above — real `curl`-driven register → cookie-only `/api/proxy/auth/me` (200) → logout → cookie-only `/api/proxy/auth/me` (401), against the live `api-laravel` + `tracklife` dev containers, the exact request shape the new mount effect makes, plus live dev-log confirmation from an independent already-open browser session. This directly exercises spec requirement 7 ("Login, Reload, and Logout Work End-to-End") end-to-end, not just via unit-test mocks. |
| Rollback boundary | Revert `lib/auth.tsx` and `lib/auth-constants.ts` to restore the localStorage dual-write bootstrap; delete `__tests__/lib/auth.test.tsx`; revert the two `package.json` script lines. `lib/api.ts` and the `app/api/auth/*` route handlers are untouched by this batch (`git status --short -- projects/web/web3-next` shows only `lib/auth.tsx` (M), `lib/auth-constants.ts` (M), `package.json` (M), and `__tests__/lib/auth.test.tsx` (??) for this batch), so this is a 3-file-revert + 1-file-delete rollback with no follow-on edits. |

## Issues Found (Batch 4)

None blocking beyond the documented `NODE_OPTIONS` deviation above (which is itself the fix, not
an open issue). `npm run lint` and `npx tsc --noEmit` both clean against the same pre-existing
baselines as Batch 3.

## Remaining Tasks

- [ ] Phase 5: Login/register response strip — RED first
- [ ] Phase 6: Config + final verification

## Status

5/5 tasks complete in Phase 1 (Phase 1 fully complete).
4/4 tasks complete in Phase 2 (Phase 2 fully complete).
3/3 tasks complete in Phase 3 (Phase 3 fully complete).
4/4 tasks complete in Phase 4 (Phase 4 fully complete).
16/25 total tasks complete across the full change (Phases 5-6 remaining, 9 tasks).
Ready for next batch (Phase 5 — login/register response body strip, which closes the last gap:
Laravel's `token` currently still round-trips through `app/api/auth/login/route.ts` and
`register/route.ts` response bodies even though nothing reads it anymore after this batch).
