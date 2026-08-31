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

## Status

5/5 tasks complete in Phase 1 (Phase 1 fully complete).
4/4 tasks complete in Phase 2 (Phase 2 fully complete).
3/3 tasks complete in Phase 3 (Phase 3 fully complete).
12/25 total tasks complete across the full change (Phases 4-6 remaining, 13 tasks).
Ready for next batch (Phase 4 — `lib/auth.tsx` bootstrap rewrite, which will remove the last
3 `localStorage` sites and start actually relying on the cookie-only bootstrap this batch made
possible).
