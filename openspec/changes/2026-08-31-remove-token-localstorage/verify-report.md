```yaml
schema: gentle-ai.verify-result/v1
verdict: pass
blockers: 0
critical_findings: 0
requirements: 1/1
scenarios: N/A (tooling batch, no spec scenarios apply to Phase 1)
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:npm-test-no-test-files-exit-0-2026-08-31
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:npm-build-47-routes-success-2026-08-31
```

## Verification Report

**Change**: 2026-08-31-remove-token-localstorage
**Scope**: PR1 only — Phase 1 of tasks.md (Vitest/Testing Library install in
web3-next, tooling only, zero behavior change to any application code).
**Version**: N/A (no versioned spec scenarios apply to a tooling-only batch)
**Mode**: Standard (declared by apply-progress.md; see TDD Compliance note below)

### Completeness (Phase 1 only)
| Metric | Value |
|--------|-------|
| Phase 1 tasks total | 5 |
| Phase 1 tasks complete | 5 |
| Phase 1 tasks incomplete | 0 |
| Full change tasks complete | 5/25 (Phases 2-6 out of scope for this verify) |

Task checkboxes in `tasks.md` (1.1-1.5, all `[x]`) match apply-progress.md's
"5/5 tasks complete in Phase 1" claim. Verified independently, not just trusted.

### Build & Tests Execution
**Build**: PASSED
```text
$ npm run build
▲ Next.js 16.2.7 (Turbopack)
✓ Compiled successfully in 6.0s
✓ Finished TypeScript in 4.2s
✓ Generating static pages using 3 workers (47/47) in 396ms
exit 0
```

**Tests**: PASSED — 0 tests found, clean exit (not an error)
```text
$ npm test
> vitest run
RUN  v4.1.11 /home/chami/tracklife/projects/web/web3-next
No test files found, exiting with code 0
include: __tests__/**/*.test.{ts,tsx}
exit 0
```
Confirms `passWithNoTests: true` in `vitest.config.mts` works as claimed — without
it this would be Vitest's default exit 1 ("No test files found, exiting with code 1").

**Lint**: PASSED — 0 errors, 5 pre-existing `no-img-element` warnings (unchanged
from before this batch, confirming zero regression to existing app code).

**Coverage**: Not available — zero test files exist yet by design (Phase 1 is the
tooling prerequisite; RED tests land starting Phase 2).

### Independent Verification Checklist (5 requested checks)
| # | Check | Result |
|---|-------|--------|
| 1 | No application code touched (`lib/api.ts`, `lib/auth.tsx`, any `route.ts`) | ✅ Confirmed via `git show 69c068b --name-only` — only `package.json`, `package-lock.json`, `vitest.config.mts`, `vitest.setup.ts` + 2 SDD docs changed |
| 2 | `npm test` exits 0 with "no tests found" (not an error) | ✅ Confirmed — exact output above, `passWithNoTests: true` verified functional |
| 3 | Resolved dependency versions match apply-progress.md claims | ✅ Confirmed via `npm ls --depth=0`: vitest@4.1.11, @vitejs/plugin-react@6.1.1, jsdom@30.0.1, @testing-library/react@16.3.3, @testing-library/dom@10.4.1, vite-tsconfig-paths@6.1.1 — exact match |
| 4 | `npm run lint` and `npm run build` still pass | ✅ Both exit 0. Lint: same 5 pre-existing warnings, 0 errors. Build: 47/47 routes generated successfully |
| 5 | `vitest.config.mts` / `vitest.setup.ts` match design snippets | ✅ `vitest.setup.ts` verbatim match. `vitest.config.mts` matches with the one documented deviation (`passWithNoTests: true`, absent from the design snippet but required — confirmed by reproducing the failure mode it fixes) |

### Correctness (Static + Runtime Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| Install vitest + @testing-library/react in web3-next (D4 prerequisite) | ✅ Implemented | 6 devDeps added, `package.json` diff verified line-by-line |
| `test`/`test:watch` scripts added | ✅ Implemented | `"test": "vitest run"`, `"test:watch": "vitest"` present |
| `vitest.config.mts` created per design §1 | ✅ Implemented | jsdom env, tsconfig-paths + react plugins, setup file, correct include glob |
| `vitest.setup.ts` created per design §1 | ✅ Implemented | RTL `cleanup` on `afterEach`, verbatim |
| `npm test` runs clean with zero test files (task 1.5) | ✅ Implemented | Verified live, exit 0 |
| Zero behavior change to application code | ✅ Confirmed | No `lib/*`, `app/api/*`, or page files in the commit diff |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| Design §1 devDependency list (6 packages) | ✅ Yes | All 6 present; versions are one major ahead of design's `^N` ranges — disclosed, not a peer-dep blocker (design's own stated gate condition) |
| Design §1 `vitest.config.mts` snippet | ⚠️ Deviation (disclosed) | `passWithNoTests: true` added, not in the design snippet. Justified: design's snippet + zero test files = Vitest default exit 1, which fails the apply-phase gate ("clean 'no tests found' report") stated in the design itself. Verified as a real fix, not a workaround for a different problem |
| Design §1 `vitest.setup.ts` snippet | ✅ Yes | Verbatim |
| Apply-phase gate: report resolved versions, treat peer-dep conflicts as blocker | ✅ Yes | Versions recorded, zero peer-dep errors confirmed independently via `npm ls` |

### TDD Compliance (Strict TDD Mode is globally enabled)
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | N/A | apply-progress.md declares this batch "Mode: Standard" — no "TDD Cycle Evidence" table present |
| All tasks have tests | N/A | Phase 1 has zero production code under test; the test runner itself is what's being installed |
| RED confirmed | N/A | Not applicable — no behavior to write a failing test for |
| GREEN confirmed | N/A | Not applicable |
| Triangulation | N/A | Not applicable |
| Safety Net | N/A | Not applicable — no existing files modified for behavior |

**Assessment**: The strict-tdd-verify module's hard rule ("no TDD Cycle Evidence
table → CRITICAL") is evaluated against its own preconditions and does not fire
here. Phase 1 cannot follow RED→GREEN→REFACTOR because there is no test runner
until this batch installs one, and no application behavior changes in this batch
to write a test against. `tasks.md` itself scopes Phase 1 outside the RED-first
phases (2-6) explicitly. This is a structural exception, not a protocol skip —
flagged as WARNING for the record, not CRITICAL, and does not block this batch.
Strict TDD applies starting Phase 2, where a runner now exists.

**Assertion Quality Audit**: N/A — zero test files exist in this batch to audit.

### Issues Found
**CRITICAL**: None

**WARNING**:
1. No "TDD Cycle Evidence" table in apply-progress.md for this batch. Rationale
   above is sound (tooling-only prerequisite, no runner existed until this
   commit), but flagging per strict-tdd-verify.md's mandatory check so the
   orchestrator/user can explicitly confirm the exception rather than have it
   pass silently.
2. `npm audit` reported 5 high-severity advisories on install (disclosed in
   apply-progress.md as pre-existing transitive dev-tooling risk, not
   independently re-verified in this pass — recommend the maintainer triage
   before Phase 2 or note it as an accepted risk).

**SUGGESTION**:
1. `vite-tsconfig-paths` prints an informational (non-fatal) notice that Vite
   now supports native tsconfig-paths resolution (`resolve.tsconfigPaths`).
   Cosmetic only; apply-progress.md already recorded the decision to keep the
   plugin per the design. No action needed for this batch.

### Verdict
**PASS WITH WARNINGS**
Phase 1 (tooling install) is complete, correct, and verified independently
against 5 concrete checks — all passed. Zero application code was touched, the
build/lint/test suite is green, and the one documented design deviation
(`passWithNoTests: true`) is a justified, verified fix rather than an
unexplained departure. Two WARNINGs are recorded for visibility (TDD-evidence
structural exception, pre-existing npm audit advisories) but neither blocks
this batch or its intended follow-on (Phase 2).

---

## PR2 Verification (Phase 2 — Proxy Route)

```yaml
schema: gentle-ai.verify-result/v1
verdict: pass
blockers: 0
critical_findings: 0
requirements: 3/7 (scope: PR2 only — proxy route in isolation; Req1/5/6/7 land in later PRs)
scenarios: 5/12 (scope: PR2 only — Req2 x1, Req3 x3, Req4 x1)
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:13edf694f5d9fcfb96d367618b9893c2be6113123c82d64ee5c78a2ddca882c3
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:2c58229ea10b8c9d271d5dc830eb4b03ef12b74d37aa3848bb32c45a19755922
```

**Change**: 2026-08-31-remove-token-localstorage
**Scope**: PR2 only — Phase 2 of tasks.md (`app/api/proxy/[...path]/route.ts` and its
16-case test suite). Route is created but genuinely unused elsewhere yet — `lib/api.ts`
retarget is Phase 3/PR3. Phase 1 (Vitest install) already verified/merged; not re-verified.
**Version**: `specs/client-session-auth/spec.md` (requirements 1-4 read; only 2-4 testable
at this scope)
**Mode**: Strict TDD (declared by apply-progress.md Batch 2, cross-checked below)

### Completeness (Phase 2 only)
| Metric | Value |
|--------|-------|
| Phase 2 tasks total | 4 |
| Phase 2 tasks complete | 4 |
| Phase 2 tasks incomplete | 0 |
| Full change tasks complete | 9/25 (Phases 3-6 out of scope for this verify) |

`tasks.md` 2.1-2.4 all `[x]`, matching apply-progress.md's "4/4 tasks complete in
Phase 2" claim — checked directly in the file, not merely trusted.

### Build & Tests Execution
**Build**: PASSED
```text
$ npm run build
▲ Next.js 16.2.7 (Turbopack)
✓ Compiled successfully in 5.3s
✓ Finished TypeScript in 4.3s
✓ Generating static pages using 3 workers (47/47) in 382ms
Route (app) ... ƒ /api/proxy/[...path]  (new, dynamic)
exit 0
```

**Tests**: PASSED — 16/16, independently re-run (not trusted from apply-progress.md)
```text
$ npm test
RUN  v4.1.11
Test Files  1 passed (1)
     Tests  16 passed (16)
exit 0
```

**Lint**: PASSED — 0 errors, 5 pre-existing `no-img-element` warnings (identical set
to PR1's baseline — zero regression from the new route file).

**Coverage**: Not available — no coverage tool configured in this project (informational
only per strict-tdd-verify.md; not a blocker).

### Independent Verification Checklist (5 requested checks)
| # | Check | Result |
|---|-------|--------|
| 1 | `route.ts` matches design.md §2 code exactly | ✅ Confirmed byte-for-byte: `SEGMENT_RE`, `MAX_SEGMENTS = 8`, `UPSTREAM_TIMEOUT_MS = 10_000`, header-building (not copying), `redirect: "manual"`, response header allow-list (`Content-Type`, `Cache-Control` only), `GET`/`POST`/`PUT`/`DELETE` exported and `PATCH` omitted — no deviation found |
| 2 | `npm test` re-run independently → 16/16 | ✅ Confirmed twice (`sha256:13edf69...` for the captured run); apply-progress's reported count matches actual execution, not just narrative |
| 3 | D1 rejection tests (R1-R8) genuinely exercise `safeUpstreamPath()`, not tautological | ✅ Confirmed by reading assertions against the actual regex/logic (see "D1 Rejection Spot-Check" below) — every R-case fails for the specific reason it claims to test, and every R-case additionally asserts `fetchMock` was never called, so a broken implementation that still 400'd for the wrong reason would still be caught if fetch were wrongly invoked |
| 4 | Route genuinely unused elsewhere (`rg "api/proxy"` outside route/test) | ✅ Confirmed — only hits are inside `app/api/proxy/[...path]/route.ts` itself and `__tests__/app/api/proxy-route.test.ts`. `lib/api.ts` still targets `NEXT_PUBLIC_API_URL` directly (verified by the Phase 3 task list, not yet touched) |
| 5 | `npm run lint` / `npm run build` — no regression | ✅ Both exit 0; lint warnings identical to PR1's baseline (5, all pre-existing `no-img-element`); build adds exactly one new route `ƒ /api/proxy/[...path]` to the manifest, 47 total routes unchanged elsewhere |

### D1 Rejection Spot-Check (against actual `safeUpstreamPath()` logic)

`SEGMENT_RE = /^[A-Za-z0-9._~-]+$/` (allow-list) is checked first, then an explicit
`seg === "." || seg === ".."` check runs *after* the regex. This ordering matters:

| Case | Why it's rejected (traced against the real code) | Tautological? |
|---|---|---|
| R1 `[]` | `segments.length === 0` → the first guard clause, before any per-segment check | No — different code path than R2-R8 |
| R2 `[".."]`/`["."]` | **Passes** `SEGMENT_RE` (`.` and `-`/`~` chars are in the allow-list, so `".."` matches the regex!) — rejection comes from the *second*, explicit `seg === ".."` check, not the regex. Confirms the test genuinely exercises the second guard, not a regex fluke | No |
| R3 `["a/b"]` | `/` is outside `[A-Za-z0-9._~-]` → regex fails | No |
| R4 `["a\\b"]` | `\` is outside the charset → regex fails | No |
| R5 `["http:", ...]` / `["evil.com:8000"]` | `:` is outside the charset → regex fails | No |
| R6 `["http://evil.com"]` | `:` and `/` both outside charset → regex fails | No |
| R7 `[""]` | Empty string fails `+` (one-or-more) in the regex | No |
| R8 (9 segments) | `segments.length > MAX_SEGMENTS (8)` → first guard clause | No |

Each rejection reason is distinct and traceable to a specific line in `safeUpstreamPath`.
R2 in particular is worth flagging positively: a naive reviewer might assume the allow-list
regex alone blocks `".."`, but it doesn't (all its characters are allowed) — the test's
passing status genuinely depends on the second explicit check existing, which is exactly
the kind of case a tautological/incomplete test would miss.

### Correctness (Static + Runtime Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| Req: Proxy Forwards Authenticated Requests Server-Side | ✅ Implemented | G1 (Bearer attached from cookie), G5 (status/body verbatim) |
| Req: Proxy Closed by Construction | ✅ Implemented | R1-R8 (rejection), G1 (URL targets only `API_INTERNAL_URL`) |
| Req: Inbound Authorization Header Is Dropped | ✅ Implemented | G3 — inbound `Authorization: Bearer attacker-token` proven absent, replaced by server-attached value |
| Req: 401 Redirect / Sentinel / End-to-end (Req 1, 5, 6, 7) | ➖ Out of scope | Not implemented yet by design — Phases 3-5; correctly deferred, not a gap in PR2 |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| Design §2 route.ts code block | ✅ Yes | Verbatim match, confirmed by direct read, not summary |
| Design §6 test plan (R1-R8, G1-G8) | ✅ Yes | All 16 cases present, each with a real behavioral assertion |
| D1 (closed by construction) | ✅ Yes | Headers built not copied; fixed `API_INTERNAL_URL` + `UPSTREAM_PREFIX`; no caller-supplied host path exists |
| Threat matrix → RED test mapping (design §6/§Threat Matrix) | ✅ Yes | Every threat-matrix row has a corresponding R-case |

### TDD Compliance (Strict TDD Mode active — strict-tdd-verify.md applied)
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | "TDD Cycle Evidence" table present in apply-progress.md Batch 2 |
| All tasks have tests | ✅ | 2.1-2.4 all map to `__tests__/app/api/proxy-route.test.ts` |
| RED confirmed (tests exist) | ✅ | Test file exists, read directly, contains all 16 named cases |
| GREEN confirmed (tests pass now) | ✅ | Re-run independently: 16/16 pass |
| Triangulation adequate | ✅ | 16 distinct cases for 3 spec requirements + threat matrix; no shared fake-it path |
| Safety Net for modified files | ➖ N/A | New file, nothing pre-existing to protect (correctly reported as N/A, not skipped) |

**Note on RED evidence**: `route.ts` and its test file landed in the same commit
(`137972f`), so the "test failed before the route existed" claim cannot be re-derived
from git history alone — this is a structural limitation of squashed-commit review, not
a red flag. The claim is internally consistent (a route file that doesn't exist yet
cannot import successfully) and GREEN is independently confirmed by actual re-execution,
which is the stronger of the two guarantees.

**TDD Compliance**: 5/5 applicable checks passed (1 correctly N/A)

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 16 | 1 | Vitest 4.1.11, node environment, mocked `next/headers` + global `fetch` |
| Integration | 0 | 0 | — |
| E2E | 0 | 0 | Manual `curl` against a live dev stack, documented in apply-progress.md as supplementary evidence, not a substitute |
| **Total** | **16** | **1** | |

### Assertion Quality
No banned patterns found. Every R-case asserts both `res.status` **and**
`fetchMock` non-invocation (not a single tautological status check). Every G-case
asserts a specific value read from real `fetchMock.mock.calls[0]` arguments or the
real returned `NextResponse` — no `toBeDefined()`-only assertions, no ghost loops, no
CSS/implementation-detail coupling. Mock/assertion ratio: 2 mocked dependencies
(`cookies`, `fetch`) against ~30 `expect()` calls across 16 tests — not mock-heavy.

**Assertion quality**: ✅ All assertions verify real behavior

### Quality Metrics
**Linter**: ✅ No errors (5 pre-existing unrelated warnings)
**Type Checker**: ✅ No errors (`npm run build`'s TypeScript pass, 4.3s, clean)

### Issues Found
**CRITICAL**: None

**WARNING**: None

**SUGGESTION**:
1. RED evidence (test failing before `route.ts` existed) cannot be independently
   re-derived from git history since both files landed in a single commit. Not
   blocking — GREEN is the stronger, independently-reproduced guarantee, and the
   claim is internally consistent. For future batches, consider an intermediate
   commit or PR description snippet capturing the RED failure output verbatim, so
   verify does not have to rely on narrative for that half of the cycle.

### Verdict
**PASS**
Phase 2 (proxy route) is complete, matches design.md §2 verbatim, and is verified
independently against 5 concrete checks plus a line-by-line spot-check of the D1
rejection logic — all passed, with the R2 case confirmed to genuinely depend on the
explicit `.`/`..` guard rather than the allow-list regex. 16/16 tests re-run and
confirmed green. Lint and build show zero regression. The route is confirmed unused
elsewhere in the codebase, consistent with the stated PR2 scope. Zero CRITICAL or
WARNING findings; one non-blocking SUGGESTION about RED-evidence traceability for
future batches.

---

## PR3 Verification (Phase 3 — `lib/api.ts` Retarget + Global 401 Redirect)

```yaml
schema: gentle-ai.verify-result/v1
verdict: pass
blockers: 0
critical_findings: 0
requirements: 2/7 (scope: PR3 only — Req5 401-redirect fully covered; Req6 sentinel partially covered, AuthContext wiring lands in PR4)
scenarios: 5/12 (scope: PR3 only — Req5 x1 scenario + 4 supporting unit cases A3/A4/A5/A6; Req6 x1 scenario partially — sentinel value exists, AuthContext.token truthy/falsy behavior deferred to PR4)
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:6e12b885864f40d019dbce9833ab168e03311a3a3bbbff911e46b55dcc5ad9f0
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:a12ad1fd19c740fd0881e87abcbcb9309ecfd4964c0081990d5b626b8b4984af
```

**Change**: 2026-08-31-remove-token-localstorage
**Scope**: PR3 only — Phase 3 of tasks.md (`lib/api.ts` retarget to `/api/proxy/...`, drop
client-side `Authorization` construction, module-level `handleUnauthorized()` 401 redirect).
`lib/auth.tsx`'s localStorage removal is explicitly out of scope — Phase 4/PR4. `HEAD` =
`dc30aa6`. Phases 1-2 (Vitest install, proxy route) already verified/merged in PR1/PR2; not
re-verified here.
**Version**: `specs/client-session-auth/spec.md` (requirements 5-6 read per assignment; full
spec has 7 requirements)
**Mode**: Strict TDD (declared by apply-progress.md Batch 3, cross-checked below)

### Completeness (Phase 3 only)
| Metric | Value |
|--------|-------|
| Phase 3 tasks total | 3 |
| Phase 3 tasks complete | 3 |
| Phase 3 tasks incomplete | 0 |
| Full change tasks complete | 12/25 (Phases 4-6 out of scope for this verify) |

`tasks.md` 3.1-3.3 all `[x]`, matching apply-progress.md's "3/3 tasks complete in Phase 3"
claim — checked directly in the file, not merely trusted.

### Diff vs. Design (independent re-read of `git show HEAD -- lib/api.ts`)
| Design element (design.md §3, §5) | Present in actual diff | Verdict |
|---|---|---|
| `PROXY_BASE = "/api/proxy"` | Yes | ✅ Match |
| `SESSION_SENTINEL` exported, `"cookie"` | Yes | ✅ Match |
| `toProxyUrl(path)` | Yes | ✅ Match |
| `RequestOptions` = `RequestInit & { skipAuthRedirect? }` | Yes | ✅ Match |
| `Authorization` header construction removed | Yes — `if (token) headers.Authorization=...` block deleted | ✅ Match |
| `credentials: "same-origin"` on fetch | Yes | ✅ Match |
| `handleUnauthorized()` — `redirecting` flag, `/login`/`/registro` loop guard, `window.location.assign("/login")` | Yes, byte-identical logic to design §5 | ✅ Match |
| `401 && !skipAuthRedirect` wired into existing `!res.ok` branch | Yes | ✅ Match |
| `api.me` passes `skipAuthRedirect: true` | Yes | ✅ Match |
| Dev-mode guardrail warning on real-token-passed | Yes (present in diff, not explicitly requested by the verify task list but consistent with design intent) | ✅ Match, no deviation |

No undisclosed deviation found. The one disclosed deviation (test-file-only jsdom 30
`window.location` mocking, see below) does not touch production code, confirmed by re-reading
the diff: `lib/api.ts` contains no test-mocking artifacts.

### Build & Tests Execution
**Build**: PASSED
```text
$ npm run build
▲ Next.js 16.2.7 (Turbopack)
✓ Compiled successfully
✓ Finished TypeScript
✓ Generating static pages using 3 workers (47/47)
Route (app) ... ƒ /api/proxy/[...path]  (present, unchanged from PR2)
exit 0
```

**Tests**: PASSED — 22/22, independently re-run (not trusted from apply-progress.md)
```text
$ npm test
RUN  v4.1.11
Test Files  2 passed (2)
     Tests  22 passed (22)
exit 0
```
22 = 16 pre-existing proxy-route tests (Phase 2, unchanged) + 6 new `lib/api.test.ts` cases
(A1-A6). Confirms apply-progress.md's claimed count exactly — not merely trusted, independently
counted by running the full suite myself.

**Lint**: PASSED — 0 errors, 5 pre-existing `no-img-element` warnings (identical set to
PR1/PR2's baseline — zero regression from this batch).

**Type check**: PASSED — `npx tsc --noEmit` (redirected `--tsBuildInfoFile` to scratchpad per
apply-progress.md's documented environment workaround) → 0 errors. Confirms the workaround is
sound and the underlying code is type-clean.

### jsdom 30 / vitest 4 `window.location.assign` mocking deviation — re-verified, not trusted
Read `__tests__/lib/api.test.ts` directly (not just the claim in apply-progress.md). Confirmed:
- The claim is real: jsdom 30's `Location.prototype.assign` is a non-configurable own property,
  so `vi.spyOn(window.location, "assign")` would throw `TypeError: Cannot redefine property`.
- The workaround (`setLocation()` helper, `Object.defineProperty(window, "location", { value:
  { ...originalLocation, pathname, assign: assignMock }, writable: true, configurable: true })`,
  restored in `afterEach`) is sound: it replaces the whole `location` object per test rather
  than patching one non-configurable property, and each test gets a fresh `assignMock`.
- Module-state isolation (`vi.resetModules()` + dynamic `import("@/lib/api")` per test) is
  necessary and present: `handleUnauthorized`'s module-level `redirecting` flag is not exported
  and would otherwise leak `true` across A3→A4/A5/A6, causing false negatives. Verified this
  matters by checking A3 runs first alphabetically/positionally in the file and sets
  `redirecting = true`; without `resetModules()`, A4-A6 would silently no-op regardless of
  correctness.
- This is confirmed test-file-only: `git show HEAD -- lib/api.ts` contains zero references to
  `vi.`, `mock`, or test-only constructs.

### Spec Compliance Matrix (Requirements 5-6, PR3 scope)
| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Req5: 401 From Laravel Redirects to Login | Expired session redirects to login | `__tests__/lib/api.test.ts > A3` (401 on normal call → `assign("/login")` called once) | ✅ COMPLIANT (unit-level) |
| Req5 (supporting, not separately scenario'd) | Bootstrap probe excluded | `A4` (`api.me` 401 → no navigate) | ✅ COMPLIANT |
| Req5 (supporting) | No redirect loop from `/login`/`/registro` | `A5` (401 while on `/login` → no navigate) | ✅ COMPLIANT |
| Req5 (supporting) | Concurrent 401s navigate once | `A6` (2 concurrent 401s → 1 navigate call) | ✅ COMPLIANT |
| Req6: AuthContext Token Is a Non-Secret Sentinel | Sentinel is truthy post-login / falsy post-logout | (none — `AuthContext` wiring is `lib/auth.tsx`, Phase 4/PR4, untouched by this commit) | ⚠️ PARTIAL — `SESSION_SENTINEL = "cookie"` constant created and exported by this PR (`A2` proves it is never placed on the wire), but the scenario itself (`AuthContext.token` truthy/falsy) has no implementation or test until PR4. **Not a PR3 defect** — this is the designed transitional split (design.md, apply-progress.md Batch 3 both state this explicitly), not an omission. |

**Compliance summary**: 4/4 PR3-scoped Req5 assertions compliant; Req6 correctly partial per
the transitional-PR design — full compliance expected at PR4 verification, not before.

### Correctness (Static Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| No client-constructed `Authorization` header (Req: httpOnly cookie sole credential) | ✅ Implemented | `A2` proves a real-looking token argument produces no `Authorization` header; `rg "Authorization"` on the diff shows only removal, no new construction |
| `request()` targets proxy, not direct Laravel host | ✅ Implemented | `A1` asserts exact `/api/proxy/...` URLs for 3 different wrappers incl. path-param and no-token cases |
| Global 401 → `/login` (Req5) | ✅ Implemented | `handleUnauthorized()` matches design §5 verbatim; A3/A5/A6 |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| D3 — sentinel, `token` param kept on `request()` | ✅ Yes | Kept per design's explicit rationale (avoid 45/49-signature churn); dev-mode guardrail warns and discards real tokens |
| §5 — `window.location.assign`, module-level `handleUnauthorized`, no router-based approach | ✅ Yes | Exact match, including the rejected-alternatives reasoning being honored in the actual code |
| Transitional-state scope boundary (auth.tsx untouched) | ✅ Yes | `git show --name-only HEAD` confirms only `lib/api.ts` + its test + 2 SDD tracking files changed |

### Live Smoke Test (dev stack was running — `docker ps` confirmed `tracklife` + `api-laravel` up)
Performed independently via `curl` against `http://app.tracklife.test`, not just re-reading
apply-progress.md's claim:

| Check | Result | Verified how |
|---|---|---|
| Register new user | `201 Created`, `Set-Cookie: tracklife_session=...; HttpOnly; SameSite=lax` | curl, live |
| Authenticated proxy call `GET /api/proxy/auth/me` with session cookie, no client `Authorization` sent | `200 OK`, real user JSON | curl, live |
| Unauthenticated proxy call `GET /api/proxy/auth/me`, no cookie | `401 Unauthorized`, `{"message":"Unauthenticated."}` | curl, live |
| Register response body still contains `token` key | Confirmed present (expected — stripping it is Phase 5/PR5 scope, out of this PR) | curl, live |

**What curl could NOT verify (explicitly out of live-smoke-test reach)**: the actual browser
`window.location.assign("/login")` navigation on a 401. `curl` has no JS execution context, so
the redirect behavior (Req5's core scenario) is verified here **only** via the unit tests
(A3/A5/A6, jsdom-simulated `window.location`), not via a real browser navigation. This matches
what apply-progress.md itself scoped ("no browser automation tool was available") — re-verified
as an accurate limitation, not silently trusted.

### Issues Found (PR3)
**CRITICAL**: None
**WARNING**: None
**SUGGESTION**:
- Req6 (AuthContext sentinel scenarios) remains only partially covered until PR4 lands — flag
  this as an open item for PR4's own verify pass, not a PR3 defect.
- No browser-automation live verification exists for the `window.location.assign` redirect path
  (Req5's actual navigation) anywhere in the chain so far — unit-test coverage is solid (A3/A5/A6
  triangulate the behavior well), but a real end-to-end browser check (e.g. Playwright) would be
  the only way to close this gap if it's ever considered worth the added tooling.

### Verdict
**PASS** — Phase 3 tasks complete and independently re-verified against design.md's exact code
block; 22/22 tests pass on independent re-run (16 pre-existing + 6 new); lint 0 errors; build
and `tsc --noEmit` clean; `git show --name-only HEAD` confirms `auth.tsx` untouched, matching
the transitional-state design; jsdom 30 mocking deviation is real, sound, and test-file-only;
live smoke test (register → cookie → authenticated 200 → unauthenticated 401) succeeded against
the running dev stack, with the browser-navigation limitation explicitly and correctly disclosed
rather than glossed over.

---

## PR4 Verification (Phase 4 — `lib/auth.tsx` Bootstrap Rewrite)

**Scope**: Phase 4 only — `lib/auth.tsx` (mount bootstrap, `persist()`, `login`/`register`
call sites, `logout()`) and `lib/auth-constants.ts` (comment-only). This is the core
security-fix PR: it removes the last 3 `localStorage` auth-token sites (`TOKEN_KEY` deleted
entirely). Phases 1-3 were verified in prior PR reports above; Phase 5 (login/register
response-body token strip) and Phase 6 (config + final verification) remain out of scope for
this PR and are correctly unchecked in `tasks.md`.

### Completeness (Phase 4 only)

| Task | Status | Evidence |
|---|---|---|
| 4.1 RED `__tests__/lib/auth.test.tsx` (B1-B6) | ✅ Complete | Test file exists, read in full — 6 real, behavioral test cases, no tautologies |
| 4.2 GREEN `lib/auth.tsx` rewrite | ✅ Complete | `git diff` against PR3's branch confirms diff matches design §4's code block verbatim |
| 4.3 `lib/auth-constants.ts` comment update | ✅ Complete | Stale dual-write comment removed, confirmed via diff |
| 4.4 `npm test` — B1-B6 green | ✅ Complete | Re-run independently: 28/28 pass |

### Independent Verification (7 requested checks — all performed directly, not trusted from the narrative)

1. **localStorage token sites genuinely gone**: `rg -n "tracklife_token|TOKEN_KEY" -g '!node_modules' -g '!.next' .` across the whole `web3-next` app returns exactly **one file**: `__tests__/lib/auth.test.tsx`, where the string is used only as an assertion constant to *prove* the key is never written (`AUTH_TOKEN_KEY` used in `.toBeNull()` / spy-filter assertions). **Zero occurrences in any production file.** `git diff feat/remove-token-localstorage-03-api-retarget..HEAD -- lib/auth.tsx` independently confirms the prior version *did* read/write/remove `TOKEN_KEY` via `localStorage.getItem/setItem/removeItem`, and the new version has none of the three call sites — `TOKEN_KEY` constant itself is deleted.
2. **`npm test`**: re-ran independently — `Test Files 3 passed (3)`, `Tests 28 passed (28)`.
3. **B6 regression-catch — independently reproduced, not trusted**: read the full `B6` test body (login → unmount/remount("reload") → logout, with a `Storage.prototype.setItem` spy asserting zero calls with the `tracklife_token` key). Performed the same mutation experiment myself: added `localStorage.setItem("tracklife_token", "MUTATION-TEST-PROBE")` back into `persist()`, ran `npm test -- __tests__/lib/auth.test.tsx -t B6` in isolation → **failed** with `AssertionError: expected [ [ 'tracklife_token', … ] ] to have a length of +0 but got 1`, exactly as claimed. Reverted via `git checkout -- lib/auth.tsx`, re-ran full suite → 28/28 green again, working tree clean.
4. **`NODE_OPTIONS=--no-experimental-webstorage` — independently verified necessary, not cargo-culted**: ran `npx vitest run __tests__/lib/auth.test.tsx` *without* the flag → **all 6 tests failed** with `TypeError: Cannot read properties of undefined (reading 'clear')` on `window.localStorage`, plus the exact `ExperimentalWarning: localStorage is not available because --localstorage-file was not provided` warning cited in `apply-progress.md`. Re-ran *with* `NODE_OPTIONS=--no-experimental-webstorage` explicitly set → 6/6 pass. The flag is real and required on this repo's installed Node 26.5.0 / Vitest 4.1.11 / jsdom 30 combination; `package.json`'s `test`/`test:watch` scripts do carry the prefix.
5. **Live end-to-end — independently re-run, not trusted from the apply report's transcript**: `docker ps` confirmed `tracklife` and `api-laravel` up. Ran my own `curl` sequence with a fresh cookie jar and a new throwaway user: (1) `POST /api/auth/register` → `201`, `Set-Cookie: tracklife_session=...; HttpOnly; SameSite=lax`; (2) `GET /api/proxy/auth/me` with **only** the cookie jar (no client token of any kind) → `200 OK`; (3) `POST /api/auth/logout` → `200`, cookie expired; (4) `GET /api/proxy/auth/me` with the now-invalidated cookie → `401 Unauthorized`. This is the exact sequence the new `lib/auth.tsx` mount effect performs and confirms spec requirement 7 end-to-end against the real stack, not mocks.
6. **`npm run lint` / `npm run build` / `tsc --noEmit`**: lint → 0 errors, 5 pre-existing `no-img-element` warnings (unchanged baseline, unrelated files). `npx tsc --noEmit` → 0 type errors (redirected `--tsBuildInfoFile` to scratchpad due to a pre-existing repo-root write-permission issue, same workaround noted in PR3's report — not a code defect). `npm run build` → succeeds, all 47 routes generated, `/api/proxy/[...path]` and the three `/api/auth/*` routes present as dynamic.
7. **Spec requirement 7 "no flash of logged-out content" — read `components/AuthGuard.tsx` directly, not asserted**: `AuthGuard` renders a loading placeholder ("Cargando TRACKLIFE...") while `loading` is true, returns `null` (not children, not a redirect race) once `loading` is false and `user` is absent, and only renders `children` once a `user` is actually set. The redirect to `/login` fires from a `useEffect` keyed on `[loading, user, router]`, so it never fires while `loading` is true. Combined with the new bootstrap effect keeping `loading: true` until `api.me()` settles (verified in source), there is no code path that renders guarded content, or a login-required page's real content, before the session probe resolves. Genuinely handled, not just asserted.

### Diff vs. Design (independent re-read)

`git diff feat/remove-token-localstorage-03-api-retarget..HEAD -- lib/auth.tsx lib/auth-constants.ts package.json` matches design §4's code block essentially verbatim: `TOKEN_KEY` deleted, mount effect now an unconditional `api.me(SESSION_SENTINEL)` call with a `cancelled` guard, `persist(newUser)` single-argument form using `SESSION_SENTINEL`, `logout()` no longer calls `localStorage.removeItem(TOKEN_KEY)`. The only diff beyond design's own code block is the `package.json` `NODE_OPTIONS` addition, which is a documented, independently-verified-necessary test-infrastructure deviation (see check 4), not a design deviation with production impact.

### Spec Compliance Matrix (Requirements 1, 6, 7 — PR4 scope)

| Requirement | Scenario | Status | Evidence |
|---|---|---|---|
| Req 1 — httpOnly Cookie Is the Sole Client Credential | No token in storage after login | ✅ PASS | `rg` zero-hits in production code; B4/B6 tests pass; live curl shows cookie-only auth |
| Req 1 | No client-constructible Authorization header | ✅ PASS | `lib/api.ts` has no `Authorization` header construction (confirmed PR3, unaffected by PR4); live curl step 2 sends only the cookie |
| Req 6 — 401 From Laravel Redirects to Login | Expired session redirects to `/login` | ✅ PASS (existing wiring, correctly preserved) | `AuthGuard` redirect effect unaffected by PR4; `api.me()` uses `skipAuthRedirect: true` so bootstrap 401s correctly do *not* trigger the global redirect (would cause a redirect loop on every public page) — confirmed by reading `lib/api.ts:140-141` |
| Req 7 — Login, Reload, Logout Work End-to-End | Session persists across reload without localStorage | ✅ PASS | B1/B6 unit tests + independent live curl (step 2, 200) |
| Req 7 | Logout clears the session | ✅ PASS | B5/B6 unit tests + independent live curl (step 3-4, 401 after logout) |

### Known, explicitly out-of-scope gap (not a PR4 defect)

`app/api/auth/login/route.ts` and `register/route.ts` are untouched by PR4 (confirmed by reading both files) and still return `{ user, token }` verbatim in the response body — the token is visible in DevTools Network tab, so proposal success criterion #2 is not yet fully met. This is Phase 5 scope, explicitly flagged in both `design.md` §4 and `apply-progress.md`'s Batch 4 section, and `auth.tsx` no longer reads `data.token` from either response (confirmed by reading `login`/`register` in the current `lib/auth.tsx` — both call `persist(data.user)` only). Not a regression; tracked correctly as a follow-up PR.

### Issues Found (PR4)

None CRITICAL. None WARNING blocking. 

**SUGGESTION**: the `token: string` parameter name on `api.me(token)` / `request()` (in `lib/api.ts`, PR3 scope, unaffected by this PR) is now a vestigial/misleading name post-sentinel — cosmetic only, no functional impact, not required by any spec requirement, safe to leave for a future cleanup pass.

### Verdict

**PASS.** Phase 4 tasks 4.1-4.4 all complete and match code state. All 7 independently-requested checks were performed directly (not trusted from the apply narrative) and confirmed: zero `localStorage` auth-token sites remain in production code, 28/28 tests pass, the B6 regression-catch is real (reproduced and reverted the mutation myself), the `NODE_OPTIONS` flag is real and necessary (reproduced the failure without it), the live end-to-end cookie-only auth flow works against the real dev stack, lint/build/tsc are clean, and `AuthGuard`'s loading state genuinely prevents any flash of logged-out or guarded content before the session probe resolves. This is the most security-critical PR in the chain and it holds up under adversarial re-verification.
