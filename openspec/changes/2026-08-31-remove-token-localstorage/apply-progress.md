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

## Status

5/5 tasks complete in Phase 1 (Phase 1 fully complete).
4/4 tasks complete in Phase 2 (Phase 2 fully complete).
9/25 total tasks complete across the full change (Phases 3-6 remaining, 16 tasks).
Ready for next batch (Phase 3 — `lib/api.ts` retarget, which will start actually using this proxy route).
