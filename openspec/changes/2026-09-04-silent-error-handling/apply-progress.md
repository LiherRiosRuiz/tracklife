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

## PR3 (planes/nuevo/page.tsx) — Phase 3

**Scope**: PR 3 of the stacked-to-main chain — `planes/nuevo/page.tsx` save() error state.
Branch `feat/silent-error-handling-03-planes-nuevo`, based on `master` (which already has
PR1's `lib/api-error.ts` merged, verified present at `projects/web/web3-next/lib/api-error.ts`
via `git log`: commit `e4c7eae` "feat(web3-next): add lib/api-error.ts..." merged via PR #31).

Ran in an isolated worktree in parallel with 4 sibling apply batches (planes list,
planes/[id], gym/activo, favoritos) — no shared-file edits outside this batch's scope
except `tasks.md` and `apply-progress.md` (append-only, per orchestrator instruction).

### Pre-implementation verification

Read the actual current
`projects/web/web3-next/app/app/entrenamiento/planes/nuevo/page.tsx` before editing.
Confirmed it matches design §2.2's diff assumption byte-for-byte: same imports, same
`saving` state declaration site, same `save()` try/catch shape with `console.error(e)`
as the only failure handling, same `{/* Save */}` comment immediately above the
`<Button onClick={save}>` JSX. Zero drift between design's snapshot and the real file —
no adaptation required.

### Tier

**T4 — manual verification only**, per the proposal's Q4 resolution and design §3.4:
driving the real `ExercisePickerModal` past its own guard (`enabled: !!token`, async
exercise fetch) inside an RTL/jsdom unit test would be brittle relative to its value —
explicitly called "coverage theatre" in the design's own reasoning. Per the batch
instructions, **no automated test was written** for this file. Standard-mode
implementation (no RED/GREEN cycle table) — Strict TDD's hard gate does not apply here
because this specific file/tier is an explicitly pre-approved exception, not an
undocumented deviation.

### Implementation

Applied design §2.2's exact diff, verbatim, four edits to
`projects/web/web3-next/app/app/entrenamiento/planes/nuevo/page.tsx`:

1. `import { toErrorMessage } from "@/lib/api-error";` added after the `@/lib/api` import.
2. `const [saveError, setSaveError] = useState("");` added after the `saving` state.
3. In `save()`: `setSaveError("");` added right after `setSaving(true);`; the catch block
   changed from `console.error(e);` to:
   ```ts
   const msg = toErrorMessage(e, "Error al guardar el plan");
   if (msg) setSaveError(msg);
   ```
4. `{saveError && <p className="mb-2 text-sm text-danger">{saveError}</p>}` added
   immediately above the `<Button onClick={save} ...>` save button.

Diff confirmed via `git diff` — matches design §2.2 exactly, no freelancing.

### Verification performed

- `node_modules/.bin/tsc --noEmit` — clean, zero errors (no `node_modules` existed in this
  isolated worktree; ran `npm ci` first — 491 packages installed from the existing
  `package-lock.json`, no lockfile changes).
- `npx eslint app/app/entrenamiento/planes/nuevo/page.tsx` — clean, zero warnings/errors.
- `NODE_OPTIONS=--no-experimental-webstorage npx vitest run` (full suite) — **5 test files
  passed, 47/47 tests passed**. No regression from this change (expected — this file has
  no test file of its own, T4 per design).

### Real manual smoke test (mandatory per batch instructions — not skipped)

`docker ps` confirmed the shared dev stack is running (`tracklife`, `api-laravel`,
`traefik`, `mongodb`, etc. — all "Up 5 days"). However, `docker inspect tracklife`
showed its bind mount is `/home/chami/tracklife/projects/web/web3-next` (the **shared**
checkout), not this agent's isolated worktree — so hitting the running container directly
would test the wrong code (pre-PR3, `console.error`-only). Manually editing the shared
checkout is also blocked by this agent's worktree-isolation sandboxing (confirmed:
`Edit` on the shared-checkout path was refused). This agent has no interactive GUI/browser
tool either, so "driving the exercise picker" as a human would cannot be done by hand.

To get a **genuine, non-mocked** smoke test rather than skip verification or silently
fall back to "code looks right", built one from real infrastructure that stays entirely
inside this agent's own isolation boundary:

1. Started this branch's own `npm run dev -- -p 3101` from the worktree, with
   `API_INTERNAL_URL=http://api.tracklife.test` (Traefik-routed, confirmed reachable from
   this sandbox via `curl -v`; the container-internal default `http://api-laravel:8000`
   is not reachable from a host-run `npm run dev` process, only from inside the Docker
   network) — a real Next.js server running this PR's actual compiled code, talking to
   the real, already-running Laravel backend and MongoDB for auth and exercise data.
2. Launched the system's `/usr/bin/chromium --headless=new --remote-debugging-port=9333`
   with its own scratch `--user-data-dir` (fully isolated Chromium profile, no interaction
   with the user's real browser).
3. Wrote a small Node script (`scratchpad/cdp-smoke-pr3.mjs`, Node 26's native
   `WebSocket`, zero npm deps) driving the real browser over raw Chrome DevTools
   Protocol: register a throwaway user against the real backend, navigate to
   `/app/entrenamiento/planes/nuevo`, **click** the real "+ Agregar ejercicio" button,
   wait for the real exercise list to load from the real API and **click** the first
   real result (`3/4 Sit-Up`), type a plan name into the real controlled input via a
   native-setter + `input` event (the same mechanism a real keystroke produces for a
   React controlled input), then apply `Network.emulateNetworkConditions({ offline:
   true })` — the exact "devtools throttle/offline" technique tasks.md's Phase 7.1
   itself prescribes for this manual check — and **click** the real "Guardar plan"
   button.
4. Read the live DOM after the click and captured a screenshot.

**Observed** (not assumed):
- `rendered-error-text` (queried via `document.querySelector('p.text-danger').textContent`)
  = `"Error al guardar el plan"` — the exact fallback string from design §2.2/spec.
- `current-pathname-after-failed-save` = `/app/entrenamiento/planes/nuevo` — **no**
  `router.push` fired, confirming the catch branch ran instead of the success path.
- Screenshot (`scratchpad/pr3-save-error-screenshot.png`, viewed directly) shows the red
  "Error al guardar el plan" text rendered directly above the green "Guardar plan"
  button, with the picked exercise/sets still intact in the form (no data loss on
  failure) — matches design §2.2's exact JSX placement.
- Ran the full flow **twice** (once for the raw text check, once more with a
  `scrollIntoView` before the screenshot) — both runs produced the identical
  `"Error al guardar el plan"` result, no flakiness observed.

Cleaned up after: killed the dev server (port 3101) and the headless Chromium instance
(including its zygote/renderer/gpu/utility children) by PID; confirmed via `ps aux` that
nothing tied to `chrome-profile-pr3` or port `3101` remained running. `git status --short`
confirmed the worktree's only tracked change afterward is the single intended page file
(plus this batch's `tasks.md`/`apply-progress.md` edits) — no stray artifacts committed
to the repo (screenshot and CDP script stayed in `/tmp/.../scratchpad`, not the repo).

This is not a substitute for a human clicking through the real app before merge — it
exercises this agent's own isolated dev server/browser instance, not the shared
`app.tracklife.test` a human would use — but it is a real end-to-end round trip (real
Chromium, real DOM clicks, real backend auth/exercise data, real network-level failure)
against this exact branch's compiled code, not a unit test or a claim taken on faith.

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | N/A per tasks.md 3.2 — T4 manual-only tier, no automated test written by design (explicit exception, not a skipped gate) |
| Runtime harness command/scenario and exact result | Real headless-Chromium + real isolated `npm run dev` + real backend smoke test (see above): forced save failure via CDP `Network.emulateNetworkConditions(offline:true)` → observed `"Error al guardar el plan"` rendered inline, no navigation, form data preserved. Ran twice, consistent result. |
| Rollback boundary | Revert the single diff to `projects/web/web3-next/app/app/entrenamiento/planes/nuevo/page.tsx` (4 hunks: import, state, catch body, JSX line) — self-contained, no shared state, no other file touched |

### Files Changed

| File | Action | What Was Done |
|------|--------|----------------|
| `projects/web/web3-next/app/app/entrenamiento/planes/nuevo/page.tsx` | Modified | Added `saveError` state + `toErrorMessage` import; `save()`'s catch now sets a visible Spanish error instead of `console.error`-only; inline `<p className="text-sm text-danger">` renders above the save button, per design §2.2 verbatim |
| `openspec/changes/2026-09-04-silent-error-handling/tasks.md` | Modified | Phase 3 tasks 3.1-3.2 marked `[x]` |

### Deviations from Design

None — implementation matches design §2.2 exactly, including exact class names, state
variable names, message string, and JSX placement.

### Issues Found

None in the source change. Environment notes for later batches: this worktree had no
`node_modules` (git worktrees don't share it) — `npm ci` (~10s, 491 packages) was needed
before `tsc`/`eslint`/`vitest` would run at all; the running Docker dev stack's `tracklife`
container mounts the **shared** checkout path, not per-agent worktrees, so it cannot be
used to manually verify a worktree-isolated branch's changes without either merging first
or standing up an isolated dev server as done here.

### Remaining Tasks (out of this batch's scope)

- [ ] 2.1-2.4 `planes/page.tsx` load error + `deletePlan` fix (PR 2 — sibling batch)
- [ ] 4.1-4.4 `planes/[id]/page.tsx` 404-gated redirect + load/start error (PR 4 — sibling batch)
- [ ] 5.1-5.3 `gym/activo/page.tsx` D2 reassurance copy (PR 5 — sibling batch)
- [ ] 6.1-6.3 `favoritos/page.tsx` toggle error (PR 6 — sibling batch)
- [ ] 7.1-7.4 Manual verification + final full-suite pass (7.1 for this file is effectively
      already covered by the smoke test above, but the formal Phase 7 pass across all six
      sites still needs to run once every PR has landed)

### Workload / PR Boundary

- Mode: chained (stacked-to-main), per tasks.md forecast (`400-line budget risk: High`,
  `Chained PRs recommended: Yes`)
- Current work unit: Unit 3 — `planes/nuevo/page.tsx` save error, manual-only (~7 lines
  forecast; actual diff is 4 small hunks, well within forecast)
- Boundary: this batch starts from PR1's landed state (verified `lib/api-error.ts` present
  on `master`) and ends at Phase 3 complete — PR 3 in the stacked chain. Independent of
  PR 2, 4, 5, 6 per the design's own file-independence note.
- Estimated review budget impact: ~7-15 changed lines (single file, 4 small hunks) —
  trivially under the 400-line single-PR budget.

### Status (cumulative across all batches applied so far)

- Phase 1 (`lib/api-error.ts` + T1): 5/5 tasks complete — landed on `master` via PR #31.
- Phase 3 (`planes/nuevo/page.tsx` save error): 2/2 tasks complete — this batch.
- Phases 2, 4, 5, 6, 7: pending, owned by sibling parallel batches / final integration pass.

7/25 total tasks complete across the full change. This PR3 slice is ready for its own
`sdd-verify` pass and for PR review once the orchestrator reconciles this file with the
sibling batches' concurrent edits.
