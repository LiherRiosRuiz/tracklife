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

## PR6 (favoritos/page.tsx) — Phase 6 only

**Scope**: PR 6 of the stacked-to-main chain, `favoritos/page.tsx` `toggle()` failure feedback
(T4, manual-verification tier per proposal Q4 — no automated test written, deliberately).
Branch `feat/silent-error-handling-06-favoritos`, isolated worktree, in parallel with the
planes-list/planes-nuevo/planes-detail/gym-activo batches. `lib/api-error.ts` (PR 1) was
already merged into `master`/this branch's base and available for import — verified present
and matching design §1 exactly before use.

### Pre-implementation verification

Read the real `projects/web/web3-next/app/app/nutricion/favoritos/page.tsx` before editing.
Confirmed:
- The `toggle()` function and its `.catch` clause (then at source lines 143-176) matched
  design §2.5's diff reference exactly — same variable names (`key`, `wasFav`, `ref`), same
  existing `console.error` line, same `useCallback` deps `[favorites, token]`.
- The migration `useEffect` block starts at `// Migracion unica...` (source line 87 comment /
  89 `useEffect(`) and ends at `}, [token]);` (source line 134), with the three catch-related
  lines at 111-124 as described in tasks.md/spec — confirmed before editing so the edit could
  be scoped to stay entirely outside that range.

### Implementation (task 6.1)

Per design §2.5, applied exactly three edits to
`projects/web/web3-next/app/app/nutricion/favoritos/page.tsx`:
1. Added `import { toErrorMessage } from "@/lib/api-error";` next to the existing `@/lib/api`
   import.
2. Added `const [toggleError, setToggleError] = useState("");` alongside the other page-level
   state.
3. In `toggle()`: added `setToggleError("");` at the start (clears any stale error on a new
   toggle attempt — satisfies the spec's "Error State Clears on Subsequent Success"
   requirement), and in the existing `.catch`, added
   `const msg = toErrorMessage(err, "Error al actualizar el favorito"); if (msg) setToggleError(msg);`
   immediately after the pre-existing `console.error` line (kept unchanged, per design's
   explicit note that it stays for debugging parity with the migration block).
4. Added `{toggleError && <p className="mb-3 text-sm text-danger">{toggleError}</p>}` in the
   render, directly below the existing `{error && <ErrorState .../>}` line — visible
   regardless of the `loading`/`error` gate below it, so it doesn't get hidden behind the
   `!loading && !error` block that wraps the favorites list.

`useCallback` deps for `toggle` stay `[favorites, token]` — `setToggleError` is a stable
setter, no new dependency needed, matching design's note.

### Migration block untouched — verification (task 6.2)

Diffed the migration block by content markers (`// Migracion unica` through `}, [token]);`)
rather than raw line numbers, since the two new lines added earlier in the file (import +
state declaration) shift the migration block's absolute line numbers from 89-134 to 91-136
without changing a single byte inside it:

```
$ diff <(git show HEAD:.../favoritos/page.tsx | awk '/\/\/ Migracion unica/,/}, \[token\]\);/') \
       <(awk '/\/\/ Migracion unica/,/}, \[token\]\);/' .../favoritos/page.tsx)
MIGRATION BLOCK BYTE-IDENTICAL
```

48 lines before, 48 lines after, zero diff output. The three catch sites (4xx-permanent-discard
at ~117, best-effort-retry at ~120-123, plus the outer JSON-parse catch at ~97-99) are
untouched, confirming the spec's "Migration code is unchanged" scenario.

Full `git diff` of the page file (7 lines added, 0 removed, all inside `toggle()`/its state/its
render line — nothing touches lines outside that scope):

```diff
+import { toErrorMessage } from "@/lib/api-error";
...
+  const [toggleError, setToggleError] = useState("");
...
+    setToggleError("");
...
+      const msg = toErrorMessage(err, "Error al actualizar el favorito");
+      if (msg) setToggleError(msg);
...
+      {toggleError && <p className="mb-3 text-sm text-danger">{toggleError}</p>}
```

### Task 6.3 — no automated test (by design, T4 tier)

Per proposal Q4 and design's own tiering rationale (this file has 3 `useApiData` calls, a
migration effect, and a modal — meaningfully hard to mock without brittle "coverage
theatre"), no automated test was written for this site. This matches the same manual-only
tier already used for `planes/nuevo/page.tsx` save error (PR 3).

### Manual smoke test — blocked by worktree isolation (risk, not silently skipped)

Attempted the live manual smoke test (task 7.2, "force a `toggle()` failure, confirm the
message renders alongside the icon revert") as instructed. Found:
- `docker ps` shows the `tracklife` (web3-next dev) container running, but
  `docker inspect tracklife --format '{{json .Mounts}}'` shows its bind mount source is
  `/home/chami/tracklife/projects/web/web3-next` — the **shared checkout**, not this agent's
  isolated worktree (`/home/chami/tracklife/.claude/worktrees/agent-af9893c179aa43825/...`).
  This agent is sandboxed from writing to or otherwise driving the shared checkout, so the
  running dev server cannot currently see this branch's edit.
- The worktree itself has no `node_modules` installed, so a local `npm run dev`/`build`/`lint`
  from within the worktree isn't available either without a fresh `npm install` (out of scope
  to run unprompted for a 7-line change).
- Verification therefore relied on: (a) the exact-match diff against design §2.5's specified
  hunks (transcribed above), (b) confirming the existing `.catch` structure, state pattern,
  and render placement conventions already used elsewhere on this same page (`error`/
  `ErrorState`, `addState`/inline `<p className="text-sm text-danger">`), and (c) confirming
  `toErrorMessage`'s behavior against its own already-green unit/contract test suite from
  PR 1 (17/17 passing, includes the exact 4xx/5xx/network/401 branches this call site
  exercises).
- **This is a real gap, flagged as a risk below** — the orchestrator (or whoever merges this
  branch into a checkout the dev container actually mounts) should perform the actual manual
  smoke test from tasks.md 7.2 before/at final integration, since it could not be executed
  from this isolated worktree.

### Files Changed

| File | Action | What Was Done |
|------|--------|----------------|
| `projects/web/web3-next/app/app/nutricion/favoritos/page.tsx` | Modified | Added `toggleError` state + `toErrorMessage` import; set/clear it around `toggle()`'s existing `.catch`; render inline error near the favorites list. Migration block (lines 89-134/91-136, catches 111-124/113-126) confirmed byte-identical. |
| `openspec/changes/2026-09-04-silent-error-handling/tasks.md` | Modified | Phase 6 tasks 6.1-6.3 marked `[x]` |

### Deviations from Design

None — the diff matches design §2.5 verbatim, including keeping the existing `console.error`
line and the `[favorites, token]` `useCallback` deps unchanged.

### Issues Found / Risks

- Manual smoke test (tasks.md 7.2) could not be run from this isolated worktree — the running
  dev container binds the shared checkout path, not this worktree, and no local `node_modules`
  is present here. Needs to be performed post-merge/integration by whoever has write access to
  the checkout the container mounts. Not a code defect — purely an execution-environment
  constraint of the parallel-worktree setup.
- No other issues. Migration block confirmed untouched (see verification above).

### Status

Phase 6 (3/3 tasks: 6.1, 6.2, 6.3) complete. Phase 7 manual/full-suite tasks (7.1-7.4) remain
out of this batch's scope and are cross-cutting across all six PRs — left unchecked for the
orchestrator/final-integration pass, with 7.2's blocker noted above.
