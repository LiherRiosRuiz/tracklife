```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:e4c7eae052b6ebbbcb5f3dd1985a9b6221d02001
verdict: pass
blockers: 0
critical_findings: 0
requirements: 1/7
scenarios: 0/16
test_command: NODE_OPTIONS=--no-experimental-webstorage npx vitest run
test_exit_code: 0
test_output_hash: sha256:1003310cab480dc9a2d70a2c9ac278ae541cadf18c136fc16db1ce006ee5ab83
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:35758a2d7cba4a39d4dcce8a3b88b66581029b2d468ecafb901de82449644746
```

## Verification Report

**Change**: 2026-09-04-silent-error-handling
**Scope**: PR1 of 6 — `lib/api-error.ts` foundation module only (Phase 1 of tasks.md). PR2-6
(pages 1-5, `favoritos` toggle) do not exist yet in this branch; this report does not claim
their spec scenarios are satisfied.
**Version**: N/A (spec has no version field)
**Mode**: Strict TDD

### Completeness (Phase 1 scope)
| Metric | Value |
|--------|-------|
| Phase 1 tasks total | 5 |
| Phase 1 tasks complete | 5 (1.1–1.5, all `[x]`) |
| Phase 1 tasks incomplete | 0 |
| Tasks 2.1–7.4 | 20 unchecked — intentionally out of scope for this PR-scoped verify pass (chained-PR strategy, tasks.md "Suggested Work Units" table) |

### Build & Tests Execution
**Build**: ✅ Passed (`npm run build`, exit 0) — Turbopack compiled successfully, TypeScript check passed, 47/47 pages generated.

**Tests**: ✅ 47 passed / 0 failed / 0 skipped (5 test files: `api-error.test.ts` new + 4 pre-existing)
```text
$ NODE_OPTIONS=--no-experimental-webstorage npx vitest run
 Test Files  5 passed (5)
      Tests  47 passed (47)
```

**Lint**: ✅ 0 errors / 7 pre-existing warnings, none touching `lib/api-error.ts` or its test (unused-var + `<img>` warnings in unrelated files: `app/api/auth/{login,register}/route.ts`, community/exercise pages, `ExercisePickerModal.tsx`).

**tsc --noEmit**: ✅ Clean, zero errors.

**Coverage**: Not available — no coverage tool/script configured in this project (`rg coverage package.json vitest.config.*` returns nothing). Skipped, not a failure.

### Independent Source Verification (lib/api-error.ts vs lib/api.ts)
Read both files side by side, independent of apply-progress's narrative:

| Design claim | `lib/api-error.ts` (actual) | `lib/api.ts` (actual) | Match |
|---|---|---|---|
| 401 → `null` | line 48: `if (e.status === 401) return null;` | api.ts:118-119 sets `error.status = res.status` from the real HTTP status | ✅ |
| Timeout discriminator: no `.status` + exact literal, NOT name-based | lines 25-27: `isTimeout` = `status === undefined && message === API_TIMEOUT_MESSAGE` | api.ts:107-109: catches `AbortError`, rethrows **plain** `new Error("La petición tardó demasiado (timeout 10s)")` with no `.status` assigned — `.name` stays `"Error"`, confirming a name-based discriminator was correctly rejected | ✅ |
| 4xx with non-empty message → API message | lines 51-53: `isClientError = status !== undefined && 400 <= status <= 499`; returns `message` only if `message.trim() !== ""` | api.ts:117-120: `err.message ?? "Error de API"`, `error.status = res.status` | ✅ |
| Empty-message fallback (HTTP/2 empty `statusText`) | same lines 51-53: `message !== ""` guard | api.ts:117 uses `res.json().catch(() => ({ message: res.statusText }))` — `statusText` can legitimately be `""` | ✅ |
| Unrecognized / non-Error / 5xx / network → fallback | line 47 (`!e` → fallback for non-Error), fallthrough of lines 51-53 for 5xx | api.ts:110 rethrows raw `fetch` rejection (e.g. `TypeError`) with no `.status` | ✅ |
| `lib/api.ts` byte-identical to master | — | `git diff master...HEAD -- projects/web/web3-next/lib/api.ts` → 0 lines | ✅ |

All six checks independently confirmed against the real files — the module's logic genuinely
matches its own doc-comment contract and the real `lib/api.ts` throw sites, not merely the
apply-progress narrative.

### Spec Compliance Matrix
The `client-error-feedback` spec's scenarios are all page-level (rendering behavior at the six
call sites). PR1 does not modify any page — `lib/api-error.ts` is an unimported, inert pure
module (confirmed: no page in the current tree imports `@/lib/api-error`). Per design and
tasks.md's explicit chained-PR sequencing, page-level scenario compliance is deferred to PR2-6.

| Requirement | Scenario | Test | Result (PR1 scope) |
|-------------|----------|------|--------|
| Visible Error Feedback at All Silent-Catch Sites | (5 site scenarios) | none (pages unmodified) | ➖ N/A — deferred to PR2, PR3, PR4, PR6 |
| planes/[id] 404 vs other failures | 404 redirects / 500 shows inline | none (page unmodified) | ➖ N/A — deferred to PR4 |
| gym/activo reassurance matches data state | failed save / API detail secondary | none (page unmodified) | ➖ N/A — deferred to PR5 |
| Expired Session (401) never inline | 401 → redirect only | none (page unmodified) | ➖ N/A — deferred to PR2-6 |
| Error Message Text Source Restricted by Status/Type | 4xx uses API msg / timeout uses timeout msg / 5xx uses fallback | `__tests__/lib/api-error.test.ts` — E2-E11, C1, C2 | ✅ COMPLIANT (decision-logic layer; wiring into pages pending PR2-6) |
| Favoritos Migration Catches Byte-Identical | migration unchanged | none (page unmodified) | ➖ N/A — deferred to PR6 |
| Error State Clears on Subsequent Success | retry clears error | none (page unmodified) | ➖ N/A — deferred to PR2-6 |

**Compliance summary**: 1/7 requirements have any covering evidence in PR1 (the decision-logic
requirement, at the pure-function layer only); the other 6 requirements are page-level and
correctly out of scope until their respective PRs land. 0/16 total spec scenarios are claimed
complete by this PR — none of them can be, since all describe rendered page behavior.

### Correctness (Static + Runtime Evidence) — lib/api-error.ts decision logic
| Decision | Status | Notes |
|------------|--------|-------|
| D4 — 404 detection (`isNotFound`) | ✅ Implemented & tested | N1-N4, all pass |
| D5 — 401 → `null` | ✅ Implemented & tested | E1, E11 (empty-fallback variant), all pass |
| D6 — 4xx message / empty guard / timeout special case | ✅ Implemented & tested | E2-E11, C1, C2, all pass |
| A1 — timeout discriminator (no name-based check) | ✅ Implemented & tested | C1 drives real `AbortError` through real `lib/api.ts` |
| A2 — empty-message guard | ✅ Implemented & tested | E5 |
| `lib/api.ts` stays byte-identical | ✅ Confirmed | `git diff master...HEAD` empty |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| Design §1 exact module contents | ✅ Yes | `lib/api-error.ts` is byte-for-byte the design §1 reference implementation |
| Design §3.1 exact test contents | ✅ Yes | `__tests__/lib/api-error.test.ts` is byte-for-byte the design §3.1 reference implementation |
| File Changes table — only `lib/api-error.ts` + its test in this batch | ✅ Yes | `git status` / file listing confirms no page files touched |

### TDD Compliance
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | Found in apply-progress.md ("TDD Cycle Evidence" table) |
| All tasks have tests | ✅ | 1/1 implementation task (1.4) backed by tasks 1.1-1.3's RED tests |
| RED confirmed (tests exist) | ✅ | `__tests__/lib/api-error.test.ts` exists, 17 test cases verified by direct read |
| GREEN confirmed (tests pass) | ✅ | 17/17 pass on independent re-run (part of the 47/47 full-suite pass) |
| Triangulation adequate | ✅ | 15 branch-matrix cases (E1-E11, N1-N4) + 2 real-module contract cases (C1-C2), varied expected values (not all same type) |
| Safety Net for modified files | ✅ N/A (new file) | `lib/api-error.ts` is new; `lib/api.ts` untouched (confirmed via git diff) |

**TDD Compliance**: 6/6 checks passed

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit (incl. C1/C2 contract-style, stubbed `fetch` against real `lib/api.ts`) | 17 | 1 | Vitest |
| Integration | 0 | 0 | not exercised in this batch |
| E2E | 0 | 0 | not exercised in this batch |
| **Total** | **17** | **1** | |

### Changed File Coverage
Coverage analysis skipped — no coverage tool detected (`package.json` / `vitest.config.*` have
no `coverage` entry).

### Assertion Quality
Spot-checked 3 of 17 tests by reading assertions against the actual implementation:

- **E10** (`5xx with a message that happens to equal the timeout literal`): `httpError(500, API_TIMEOUT_MESSAGE)` sets `.status = 500`, so `isTimeout()` (line 26: `status === undefined && ...`) is false — falls through to the 4xx range check, which 500 fails, so the fallback `"Error al cargar el plan"` is returned. Test asserts exactly that. Exercises the real discriminator collision case (status takes priority over message equality); not tautological.
- **E5** (empty/whitespace 4xx message): `httpError(404, "")` and `httpError(403, "   ")` both trigger `message.trim() !== ""` failing (line 51-53), returning fallback. Verifies the A2 empty-message guard, which exists specifically because `res.statusText` can be `""` on HTTP/2 — a real production edge case, not a synthetic one.
- **C1** (real-module contract test): stubs global `fetch` to reject with a genuine `AbortError`, imports the **real** `@/lib/api`, calls `api.workoutPlans(...)`, and asserts the thrown error's `.message`/`.status` shape AND that `toErrorMessage` recognizes it. This calls actual production code in `lib/api.ts` (not a mock of its shape) and is the strongest evidence in the suite against design/implementation drift.

No tautologies, ghost loops, orphan empty-checks-without-companion, smoke-test-only patterns, or
CSS/implementation-detail coupling found in a full read of all 137 lines. Mock ratio: 2
`vi.stubGlobal` calls across 17 tests with 20+ total assertions — well under the 2x threshold.

**Assertion quality**: ✅ All assertions verify real behavior

### Quality Metrics
**Linter**: ⚠️ 7 warnings (0 in files touched by this PR — all in unrelated pre-existing files)
**Type Checker**: ✅ No errors

### Issues Found
**CRITICAL**: None
**WARNING**: None
**SUGGESTION**: None — PR1 is self-contained, correctly scoped, and matches its design/spec
decision-logic requirements exactly. The 6 remaining page-level spec requirements are not
gaps in PR1; they are correctly sequenced to PR2-6 per the chained-PR strategy documented in
tasks.md and apply-progress.md.

### Verdict
PASS
PR1 (`lib/api-error.ts` foundation module) is complete, byte-accurate to design, fully unit/contract-tested against real `lib/api.ts`, non-tautological, and `lib/api.ts` remains byte-identical to master. `npm test`, `npm run lint`, `npm run build`, and `tsc --noEmit` all pass. No spec scenario can regress from this PR since it touches zero pages; full spec compliance requires PR2-6.
