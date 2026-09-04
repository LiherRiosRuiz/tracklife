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
