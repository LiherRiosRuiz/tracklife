# Apply Progress: Surface silent API failures to the user (web3-next)

## Batch 1 — Phase 1 only (`lib/api-error.ts` + T1)

**Scope**: PR 1 of the stacked-to-main chain (per tasks.md workload forecast). Pure module,
no page files touched. Module is unused by the app until PR 2-6 import it — expected.

### Pre-implementation verification (mandatory re-check of design §0)

Read the real `projects/web/web3-next/lib/api.ts` before writing any code. Confirmed all
three claims in design §0 against current source, byte for byte:

| Claim | Design says | Real code (line) | Match? |
|---|---|---|---|
| Timeout error has no `.status` | `undefined`, plain `Error`, `.name === "Error"` | `new Error("La petición tardó demasiado (timeout 10s)")` at api.ts:108, no `.status` assigned anywhere on this branch | ✅ exact match |
| Timeout is NOT an `AbortError` at the throw site | api.ts catches the real `AbortError` and rethrows a new plain `Error` | api.ts:107-109 — `if (e instanceof Error && e.name === "AbortError") throw new Error(...)` | ✅ exact match |
| HTTP error path uses `??` not `||` | `err.message ?? "Error de API"` | api.ts:118 — `new Error(err.message ?? "Error de API")` | ✅ exact match, `??` confirmed |
| `res.statusText` can be empty, used as fallback body message | `res.json().catch(() => ({ message: res.statusText }))` | api.ts:117 — identical | ✅ exact match |
| 401 triggers `handleUnauthorized()` before throw | line 116, before the `throw` | api.ts:116 — `if (res.status === 401 && !skipAuthRedirect) handleUnauthorized();` precedes the error construction | ✅ exact match |
| `SESSION_SENTINEL` export exists for C1/C2 | used as token arg in contract tests | api.ts:7 — `export const SESSION_SENTINEL = "cookie";` | ✅ exact match |

**Conclusion**: design's snapshot of `lib/api.ts` (dated 2026-09-04) is byte-accurate against
the current file. No adaptation was required — design §1's exact contents were implemented
verbatim. Zero deviation.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1-1.3 | `__tests__/lib/api-error.test.ts` | Unit + contract (real `lib/api.ts` via stubbed `fetch`) | N/A (new file, no pre-existing tests to protect) | ✅ Written — 17 tests (E1-E11, N1-N4, C1-C2) referencing non-existent `@/lib/api-error` | ✅ Passed — 17/17 after implementation | ✅ 17 cases across full branch matrix (401/4xx/5xx/timeout/network/non-Error/boundary/empty-message/collision) | ➖ None needed — module already matches design's exact reference implementation, no post-hoc cleanup required |
| 1.4 | `lib/api-error.ts` | Pure function module | N/A (new file) | (implementation task, driven by 1.1-1.3's RED) | ✅ 17/17 passing | — | ✅ Clean on first pass |
| 1.5 | — | — | — | — | ✅ `npm test -- api-error` → 17/17 green | — | — |

### RED evidence (verbatim command output)

```
$ NODE_OPTIONS=--no-experimental-webstorage npx vitest run api-error
...
 FAIL  __tests__/lib/api-error.test.ts [ __tests__/lib/api-error.test.ts ]
Error: Failed to resolve import "@/lib/api-error" from "__tests__/lib/api-error.test.ts". Does the file exist?
...
 Test Files  1 failed (1)
      Tests  no tests
```

Confirmed: test suite fails to even collect because `lib/api-error.ts` does not exist —
guaranteed RED, no false-negative risk.

### GREEN evidence (verbatim command output)

```
$ NODE_OPTIONS=--no-experimental-webstorage npx vitest run api-error
...
 Test Files  1 passed (1)
      Tests  17 passed (17)
```

All 17 assertions (E1-E11 message-derivation branch matrix, N1-N4 `isNotFound` matrix, C1
real-timeout contract test, C2 real-500-non-JSON contract test) pass against the actual
production `lib/api.ts`, not a mock of its shape — C1/C2 stub only `fetch`, then import the
real `@/lib/api` module and drive it through a genuine `AbortError` rejection and a genuine
non-JSON 500 response.

### Full suite regression check (safety net for repo-wide state)

```
$ NODE_OPTIONS=--no-experimental-webstorage npx vitest run
 Test Files  5 passed (5)
      Tests  47 passed (47)
```

5 test files (`api-error.test.ts` new + 4 pre-existing), 47 total tests, all green. No
pre-existing suite was broken by this addition.

### Additional verification

- `npx tsc --noEmit` (with a scratch `--tsBuildInfoFile` to avoid a pre-existing permission
  issue on the repo's own `tsconfig.tsbuildinfo`) — clean, zero errors.
- `npx eslint lib/api-error.ts __tests__/lib/api-error.test.ts` — clean, zero warnings/errors.
- `git status --porcelain lib/ __tests__/lib/` confirms only two new untracked files; `lib/api.ts`
  shows no diff — byte-identical, as required by design File Changes table.

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx vitest run api-error` → 1 file, 17/17 tests passed |
| Runtime harness command/scenario and exact result | N/A per tasks.md — pure module with no runtime boundary; C1/C2 already exercise the real `lib/api.ts` through stubbed `fetch` (genuine `AbortError` + genuine non-JSON 500), which is the closest available "real" runtime path for a module with no I/O of its own |
| Rollback boundary | Delete `projects/web/web3-next/lib/api-error.ts` and `projects/web/web3-next/__tests__/lib/api-error.test.ts` — inert until a page file imports it (none do yet in this batch) |

### Files Changed

| File | Action | What Was Done |
|------|--------|----------------|
| `projects/web/web3-next/lib/api-error.ts` | Created | Pure error-decision module: `API_TIMEOUT_MESSAGE`, `asApiError`, `isTimeout`, `isNotFound`, `toErrorMessage` — verbatim per design §1 |
| `projects/web/web3-next/__tests__/lib/api-error.test.ts` | Created | T1 suite: 11 `toErrorMessage` cases (E1-E11), 4 `isNotFound` cases (N1-N4), 2 contract tests against real `lib/api.ts` (C1 timeout, C2 non-JSON 500) — verbatim per design §3.1 |
| `openspec/changes/2026-09-04-silent-error-handling/tasks.md` | Modified | Phase 1 tasks 1.1-1.5 marked `[x]` |

### Deviations from Design

None — implementation matches design exactly, including the verified `lib/api.ts` shape
(design's snapshot was accurate, no drift found; see verification table above).

### Issues Found

None. One pre-existing, unrelated environment quirk noted for future batches: `npx tsc --noEmit`
fails to write its default `tsconfig.tsbuildinfo` due to a file-permission issue in this
sandbox (`EACCES`) — worked around with `--tsBuildInfoFile` pointing at scratch space. Not
caused by this change; flagging so later batches don't re-diagnose it from scratch.

### Remaining Tasks (Phases 2-7, out of this batch's scope)

- [ ] 2.1-2.4 `planes/page.tsx` load error + `deletePlan` fix (PR 2)
- [ ] 3.1-3.2 `planes/nuevo/page.tsx` save error (PR 3)
- [ ] 4.1-4.4 `planes/[id]/page.tsx` 404-gated redirect + load/start error (PR 4)
- [ ] 5.1-5.3 `gym/activo/page.tsx` D2 reassurance copy (PR 5)
- [ ] 6.1-6.3 `favoritos/page.tsx` toggle error (PR 6)
- [ ] 7.1-7.4 Manual verification + final full-suite pass

### Workload / PR Boundary

- Mode: chained (stacked-to-main), per tasks.md forecast (`400-line budget risk: High`,
  `Chained PRs recommended: Yes`)
- Current work unit: Unit 1 — `lib/api-error.ts` + T1 (~194 lines forecast)
- Boundary: this batch starts from zero (first apply batch) and ends at Phase 1 complete;
  PR 1 in the stacked chain. PRs 2-6 depend only on this landing, not on each other.
- Estimated review budget impact: ~194 lines (1 new module + 1 new test file), comfortably
  under the 400-line single-PR budget on its own.

### Status

5/25 tasks complete (Phase 1 of 7 phases). Ready for next batch (Phase 2) or for this PR's
own `sdd-verify` pass, per the stacked-PR chain strategy.

---

## PR5 (gym/activo/page.tsx) — Batch: Phase 5 only (D2 reassurance copy, T2b mandatory)

**Scope**: PR 5 of the stacked-to-main chain (per tasks.md workload forecast). Only
`app/app/entrenamiento/gym/activo/page.tsx` modified + one new test file. Branch
`feat/silent-error-handling-05-gym-activo`, based on `master`, which already has PR 1
(`lib/api-error.ts`) merged and available — confirmed via `git log --oneline -5`
(`e4fb77d Merge pull request #31 ... feat/silent-error-handling-01-api-error`).

### Pre-implementation verification (mandatory re-check of design §2.4 assumptions)

Read the real `projects/web/web3-next/app/app/entrenamiento/gym/activo/page.tsx` before
writing any code, confirming design's exact diff reference and the D2 safety claim:

| Claim | Design says | Real code (line) | Match? |
|---|---|---|---|
| Both `sessionStorage.removeItem` calls are inside `try`, after the `await` | "the two `sessionStorage.removeItem` calls stay inside `try`, after the `await`" — this is what makes the D2 reassurance sentence's promise true | Lines 145-155: `await api.createWorkout(...)` (146-151), then `sessionStorage.removeItem("tracklife_active_workout")` (153) and `sessionStorage.removeItem("tracklife_workout_start")` (154), both still inside the same `try` block, both after the `await`, before `router.push(...)` (155) | ✅ exact match — confirmed true. **This means the D2 copy's safety claim is genuinely true by construction**: if `api.createWorkout` throws, execution never reaches either `removeItem` call, so `sessionStorage` is untouched on failure. No discrepancy found — the design's foundational premise for this PR holds. |
| Catch clause currently only does `console.error(e)` | design §2.4 diff shows replacing `console.error(e)` | Line 157 (pre-change): `console.error(e);` | ✅ exact match |
| `createWorkout` is the real API method name (not `createWorkoutPlan`) | design's T2b mock: `api: { createWorkout: ... }` | `lib/api.ts:259` — `createWorkout: (token: string, data: Partial<Workout>) => ...` | ✅ exact match |

**Conclusion**: design's snapshot of `gym/activo/page.tsx` is byte-accurate. The
highest-stakes claim in this whole change — that a failed save still leaves the
workout data intact in `sessionStorage` — is verified TRUE in the actual current
source, not just assumed. No adaptation to design's diff was required; the exact
diff from design §2.4 was applied verbatim.

### Design defect found and fixed (test-mock only, NOT a production-code deviation)

The design's exact T2b test file (§3.3) uses this `next/navigation` mock:

```ts
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));
```

This **hangs indefinitely** (100%+ CPU, steadily growing memory, never completes)
when run against the real page. Root cause, confirmed by bisection (isolated
`setInterval`-only smoke test passed fine; `Card`/`Button` import passed fine;
page import alone passed fine; render with `sessionStorage` empty — the `loading`
branch — passed fine in ~900ms; render with `sessionStorage` populated — the
`loaded` branch — hung every time, independent of whether `sets` was empty or had
data, and independent of the elapsed-time `setInterval` effect, which I disabled
in a throwaway scratch copy of the page and it still hung):

- The real `useRouter()` from `next/navigation` returns a **referentially stable**
  object across renders (Next.js memoizes it internally).
- `gym/activo/page.tsx`'s "Load workout" `useEffect` (line 54, unchanged by this
  PR) depends on `[router]`.
- The design's mock factory `() => ({ push })` returns a **fresh object literal**
  on every single call to `useRouter()`, breaking that stability contract.
- Since the component calls `useRouter()` on every render, and the mock's return
  value differs by reference every time, React sees `router` as "changed" on
  every render → the "Load workout" effect re-runs every render → `load()`
  re-parses `sessionStorage` → `setSets(JSON.parse(...))` produces a **new array
  reference** every time → state changes → re-render → new `router` object →
  effect reruns again → infinite loop, matching the observed symptoms exactly
  (unbounded CPU + growing memory, confirmed via `ps` sampling during the hang).

**Fix** (test file only, zero production-code impact): hoist the returned router
object to a stable reference so `useRouter()` returns the *same* object every
call, matching the real hook's actual contract:

```ts
const routerStub = { push };
vi.mock("next/navigation", () => ({
  useRouter: () => routerStub,
}));
```

This is documented inline in the test file with a comment explaining the defect
and the empirical verification steps (bisection performed via disposable scratch
copies of the page and standalone smoke tests, all deleted after diagnosis — none
committed). **This is a deviation from design's literal test file bytes, not from
its test scenarios/assertions** — G1-G4's setup, actions, and assertions are
unchanged from design §3.3 verbatim. Flagging as a **risk for Phase 4** (`planes/[id]/page.tsx`,
a different PR/batch): design's T2a mock (§3.2) uses the identical unstable
pattern `useRouter: () => ({ push, back })`, and that page's `loadPlan` callback
also depends on `[token, id, router]` (design §2.3) — the same infinite-loop risk
likely applies there and should be checked by whichever batch implements Phase 4.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 5.1 | `__tests__/app/entrenamiento/gym-activo.test.tsx` | Component (RTL + jsdom) | ✅ 51/51 full suite green before this batch's changes (ran `npx vitest run` pre-edit on the untouched repo state, confirmed no pre-existing failures) | ✅ Written — G1-G4 per design §3.3 verbatim (mock-stability fix documented above) | ✅ 2/4 failed as expected (G1, G2 — need production code); G3/G4 passed because current behavior (silent catch, successful-save path) already happens to satisfy those two scenarios | ✅ 4 scenarios: failed-save-with-5xx-fallback (G1), failed-save-with-4xx-detail (G2), 401-silent (G3), success-path (G4) — covers every branch of `toErrorMessage`'s `null`/`""`-fallback/`4xx`-message contract as consumed by this page | N/A — see below |
| 5.2 | `app/app/entrenamiento/gym/activo/page.tsx` | Client component (Next.js "use client") | ✅ (same 51/51 baseline) | (implementation task, driven by 5.1's RED) | ✅ 4/4 passing after implementation | — | ✅ Diff matches design §2.4 verbatim; no additional cleanup needed — minimal, focused change (2 new state vars, 1 catch-block rewrite, 1 JSX block) |
| 5.3 | — | — | — | — | ✅ `npx vitest run gym-activo` → 4/4 green (984ms) | — | — |

### RED evidence (verbatim command output, post-mock-fix)

```
$ NODE_OPTIONS=--no-experimental-webstorage npx vitest run gym-activo --testTimeout=8000
...
 Test Files  1 failed (1)
      Tests  2 failed | 2 passed (4)
   Duration  3.01s
```

G1 and G2 failed with `TestingLibraryElementError: Unable to find an element with
the text: No se pudo guardar el entrenamiento...` (the fixed reassurance sentence
did not render — production code still only did `console.error(e)`). G3 and G4
passed trivially against the pre-change code (401 already rendered nothing since
nothing rendered anything; successful save already cleared `sessionStorage` and
navigated) — this is expected and correct: those two scenarios describe
*pre-existing* correct behavior that this PR must not regress, not new behavior
this PR introduces.

### GREEN evidence (verbatim command output)

```
$ NODE_OPTIONS=--no-experimental-webstorage npx vitest run gym-activo --testTimeout=8000
...
 Test Files  1 passed (1)
      Tests  4 passed (4)
   Duration  984ms
```

All 4 scenarios pass against the real production page component (not a stub of
its shape) — G1 asserts BOTH the visible reassurance text AND, separately,
`window.sessionStorage.getItem("tracklife_active_workout")` still parses to a
`sets` array of length 1 with `completed === true` and `weight === 60` after the
simulated failed save, which is the actual safety claim the copy makes, not just
"some error text appeared." G2 asserts the 4xx detail renders as a *separate*
element with `text-muted` styling, never replacing the fixed sentence (the fixed
sentence and the detail are both independently queried in the DOM). G3 asserts no
reassurance renders on 401 and `sessionStorage` remains untouched. G4 asserts a
successful save clears `sessionStorage`, navigates via `push`, and shows no
reassurance.

### Full suite regression check (safety net for repo-wide state)

```
$ NODE_OPTIONS=--no-experimental-webstorage npx vitest run
 Test Files  6 passed (6)
      Tests  51 passed (51)
   Duration  2.02s
```

6 test files (`gym-activo.test.tsx` new + 5 pre-existing, including PR1's
`api-error.test.ts`), 51 total tests, all green. No pre-existing suite was broken.

### Additional verification

- `npx eslint app/app/entrenamiento/gym/activo/page.tsx __tests__/app/entrenamiento/gym-activo.test.tsx` — clean, zero warnings/errors.
- `npx tsc --noEmit` (scratch `--tsBuildInfoFile`, same pre-existing sandbox `EACCES`
  workaround noted in PR1's apply-progress) — clean, zero errors.
- `git status --porcelain` confirms only two paths changed: the modified page file
  and the new `__tests__/app/entrenamiento/` directory (containing only
  `gym-activo.test.tsx` — all scratch/bisection test files created during
  diagnosis were deleted before this check).
- `git diff` on the page file confirms the applied diff matches design §2.4
  byte-for-byte, including the exact reassurance sentence text (verified the
  em dash `—` character and full stop punctuation match the design's literal
  string, not a paraphrase or approximation).

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx vitest run gym-activo --testTimeout=8000` → 1 file, 4/4 tests passed (984ms) |
| Runtime harness command/scenario and exact result | Manual verification deferred to tasks.md Phase 7 (cross-cutting manual pass) per the task's own scope — RTL component test (G1-G4) is the closest automated proxy and directly exercises the real `sessionStorage` Web Storage API via jsdom (not mocked), the real page component, and the real `toErrorMessage` decision function from PR1's merged `lib/api-error.ts`; only `next/navigation`, `@/lib/auth`, and `@/lib/api` are mocked, per design's stated mock boundary |
| Rollback boundary | Revert `app/app/entrenamiento/gym/activo/page.tsx` to its pre-PR5 state (`git checkout master -- projects/web/web3-next/app/app/entrenamiento/gym/activo/page.tsx`) and delete `__tests__/app/entrenamiento/gym-activo.test.tsx`; no other files touched; `lib/api-error.ts` (PR1) is untouched and unaffected |

### Files Changed

| File | Action | What Was Done |
|------|--------|----------------|
| `projects/web/web3-next/app/app/entrenamiento/gym/activo/page.tsx` | Modified | Added `saveFailed`/`saveErrorDetail` state; `finishWorkout()`'s catch now calls `toErrorMessage(e, "")` and sets that state instead of `console.error(e)`; bottom-actions JSX now renders the fixed D2 reassurance sentence (`role="alert"`) with the API detail as a secondary muted `<p>` when present, above the existing Cancelar/Finalizar buttons. Both `sessionStorage.removeItem` calls left untouched inside `try`, after `await` — verified this is what makes the copy's safety claim true. |
| `projects/web/web3-next/__tests__/app/entrenamiento/gym-activo.test.tsx` | Created | T2b suite: G1 (failed save shows reassurance + `sessionStorage` intact with correct `sets` payload), G2 (4xx detail is secondary, never replaces the fixed sentence), G3 (401 renders nothing), G4 (success clears storage + navigates). `next/navigation` mock stabilized (see "Design defect found and fixed" above) — scenarios/assertions otherwise verbatim per design §3.3. |
| `openspec/changes/2026-09-04-silent-error-handling/tasks.md` | Modified | Phase 5 tasks 5.1-5.3 marked `[x]` |

### Deviations from Design

One deviation, test-infrastructure-only: the `next/navigation` mock in the T2b
test file uses a stable `routerStub` object instead of design's literal
`() => ({ push })` factory, because the literal form causes an infinite render
loop against the real (unmodified) page component — see "Design defect found and
fixed" above for full root-cause analysis and the flagged risk for Phase 4's
T2a test, which uses the same unstable pattern. Production code (`page.tsx`)
matches design §2.4 exactly, with zero deviation.

### Issues Found

One test-infrastructure defect in design §3.3, documented and fixed above (does
not affect production code correctness). One process note: this worktree's
`node_modules` was missing on first run (`npx vitest` failed with
`ERR_MODULE_NOT_FOUND`); a plain symlink to the main checkout's `node_modules`
caused the same infinite-hang symptom independently reproducible even on an
unrelated pre-existing test (`api-error.test.ts` ran fine via symlink, but
concurrent Vite dep-cache writes under `node_modules/.vite`, shared across
parallel sibling batches, were suspected as a contributing risk) — resolved by
replacing the symlink with a hardlinked copy (`cp -al`), giving this worktree its
own independent `node_modules/.vite` cache directory with zero extra disk cost
(hardlinks share underlying file data). This is local-environment setup, not
committed to git (`node_modules` remains gitignored).

### Remaining Tasks (out of this batch's scope)

- [ ] 2.1-2.4 `planes/page.tsx` load error + `deletePlan` fix (PR 2)
- [ ] 3.1-3.2 `planes/nuevo/page.tsx` save error (PR 3)
- [ ] 4.1-4.4 `planes/[id]/page.tsx` 404-gated redirect + load/start error (PR 4) —
  **flag**: check the `next/navigation` mock stability issue noted above before
  trusting design §3.2's T2a test file verbatim
- [ ] 6.1-6.3 `favoritos/page.tsx` toggle error (PR 6)
- [ ] 7.1-7.4 Manual verification + final full-suite pass

### Workload / PR Boundary

- Mode: chained (stacked-to-main), per tasks.md forecast (`400-line budget risk: High`,
  `Chained PRs recommended: Yes`)
- Current work unit: Unit 5 — `gym/activo/page.tsx` D2 reassurance + T2b tests (~151 lines forecast)
- Boundary: this batch starts from PR 1 (`lib/api-error.ts`, already merged to
  `master`) and ends at Phase 5 complete; PR 5 in the stacked chain, independent
  of PRs 2-4 and 6 (per design's own file-independence note).
- Estimated review budget impact: ~24 lines added/changed in `page.tsx` + ~113
  lines in the new test file ≈ 137 lines, comfortably under the 400-line
  single-PR budget on its own.

### Status

Phase 5 complete: 5.1-5.3 all `[x]`. 4/4 gym-activo tests green, 51/51 full suite
green, lint clean, typecheck clean. Ready for this PR's own `sdd-verify` pass, per
the stacked-PR chain strategy. (Note: cross-batch task counter — this section
covers Phase 5 only; see Batch 1 section above for Phase 1's 5/25 status. Overall
cumulative count across all landed batches should be reconciled by the
orchestrator when merging parallel apply-progress sections.)
