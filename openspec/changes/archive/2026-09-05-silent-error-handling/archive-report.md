# Archive Report: Surface silent API failures to the user (web3-next)

**Change**: 2026-09-04-silent-error-handling  
**Archived**: 2026-09-05  
**Status**: Complete — all 25/25 tasks checked, all 6 PRs merged to master, full verification passed

## Archive Contents

All artifacts from the completed change have been moved to this directory:

- `proposal.md` — Change proposal with scope, capabilities, approach, and decisions
- `specs/client-error-feedback/spec.md` — Formal spec (merged to main specs at `openspec/specs/client-error-feedback/`)
- `design.md` — Implementation design with technical approach and file-change details
- `tasks.md` — 25 tasks across 7 phases, all checked `[x]` (Phase 1-7 complete)
- `apply-progress.md` — Detailed progress across all 6 PRs (PR1-PR6, all landed)
- `verify-report.md` — Verification pass summary (PASS verdict, no blockers)
- `exploration.md` — Initial exploration that identified the 6 silent-error sites

## Key Decisions

| ID | Decision | Rationale |
|---|---|---|
| D1 | Spanish error copy: "Error al {verb} {object}" | Matches existing UI convention in login and planes pages |
| D2 | gym/activo fixed reassurance: "No se pudo guardar el entrenamiento..." | Precise, honest about data safety (sessionStorage preserved) |
| D3 | planes/page uses `<ErrorState>` component, not `useApiData` hook | Avoids UX regression (would re-flash entire list loading state on delete retry) |
| D4 | 404-only redirect in planes/[id]; other errors show inline | Distinguishes "plan not found" from transient failures |
| D5 | 401 returns `null` from `toErrorMessage()`; no inline error | Avoids red flash during in-flight navigation to `/login` |
| D6 | 4xx API message + timeout special case; 5xx/network use fallback | Prevents English statusText leak; timeout has genuinely useful message |

## Implementation Summary

### New Artifacts

- **`lib/api-error.ts`** — Pure decision logic for error messages:
  - `toErrorMessage(error, fallback)` — returns message string | null
  - `isNotFound(error)` — detects 404 status only
  - `API_TIMEOUT_MESSAGE` — timeout discriminator

### Modified Files (6 pages)

1. **`planes/page.tsx`** — Load error + `deletePlan` migration to `toErrorMessage`
2. **`planes/nuevo/page.tsx`** — Save error inline message
3. **`planes/[id]/page.tsx`** — 404-gated redirect + load/start error handling
4. **`gym/activo/page.tsx`** — D2 reassurance sentence + `sessionStorage` verification
5. **`favoritos/page.tsx`** — Toggle failure message (migration block untouched)
6. **`lib/api-error.ts`** — Pure error-decision module (new)

### Tests Written

- **T1 (mandatory)**: `lib/api-error.test.ts` — 17 unit + contract tests (API_TIMEOUT_MESSAGE, 4xx/5xx branching, 401 null, timeout discriminator, empty-message guard)
- **T2a (mandatory)**: `planes-detail.test.tsx` — 7 component tests (404 redirect, 500 inline, network error, 401 silent, retry-clears-error)
- **T2b (mandatory)**: `gym-activo.test.tsx` — 4 component tests (reassurance + sessionStorage intact, 4xx detail secondary, 401 silent, success path)
- **T3 (best-effort)**: `planes-list.test.tsx` — 1 component test (load error + retry button)
- **T4 (manual)**: `planes/nuevo`, `favoritos` — manual E2E verification per Phase 7

## Delivery

### PRs (all merged to master)

| PR | Phase | File(s) | Lines | Status |
|---|---|---|---|---|
| PR #31 | Phase 1 | `lib/api-error.ts` + test | ~194 | ✅ Merged |
| PR #32 | Phase 2 | `planes/page.tsx` + test | ~93 | ✅ Merged |
| PR #33 | Phase 3 | `planes/nuevo/page.tsx` | ~7 | ✅ Merged |
| PR #34 | Phase 4 | `planes/[id]/page.tsx` + test | ~122 | ✅ Merged |
| PR #35 | Phase 5 | `gym/activo/page.tsx` + test | ~137 | ✅ Merged |
| PR #36 | Phase 6 | `favoritos/page.tsx` | ~7 | ✅ Merged |

All on `master` at commit 76a7947 (post-merge). No outstanding branches.

### Quality Gates Passed

- ✅ Full test suite: 59/59 tests pass (`npm test`)
- ✅ Linting: 0 errors (7 pre-existing unrelated warnings)
- ✅ Build: `npm run build` clean
- ✅ Type checking: `tsc --noEmit` clean
- ✅ Phase 7 manual verification:
  - 7.1: `planes/nuevo` save-error smoke test (real headless-Chromium + real dev server)
  - 7.2: `favoritos` toggle-error live test on `app.tracklife.test`
  - 7.3: 401-sweep across all 6 sites — no error flashes during login redirect
  - 7.4: No `.catch(console.error)` / bare `catch { console.error }` remains

## Spec Compliance

All 7 requirements from `specs/client-error-feedback/spec.md`:

1. ✅ **Visible Error Feedback at All Sites** — 6 sites now render Spanish inline messages
2. ✅ **planes/[id] 404 vs Other Failures** — 404 redirects; 5xx/network shows inline error
3. ✅ **gym/activo Reassurance + Data Safety** — Fixed sentence + `sessionStorage` preserved after failed save
4. ✅ **401 Never Inline** — Returns `null`, no flash during redirect
5. ✅ **Error Message Source by Status/Type** — 4xx uses API message, 5xx uses fallback, timeout special-cased
6. ✅ **Favoritos Migration Byte-Identical** — Confirmed zero-byte diff on lines 89-134
7. ✅ **Error State Clears on Success** — All handlers clear on retry success

## Rollback Boundary

Single `git revert` of all 6 PR merges. UI-only; no schema, migration, env var, or server-side effect to undo. Alternatively, revert per-file:
- Delete `lib/api-error.ts` + its test
- Revert 5 page files to pre-change state

## Post-Archive Steps

1. **Git cleanup** (user must perform):
   ```bash
   git rm -r openspec/changes/2026-09-04-silent-error-handling/
   git commit -m "archive(sdd): move 2026-09-04-silent-error-handling to openspec/changes/archive/"
   ```

2. **Verification**:
   ```bash
   ls openspec/changes/ | grep "2026-09-04"  # Should be empty
   ls openspec/changes/archive/ | grep "2026-09-05"  # Should show the archived folder
   ```

## Notes for Future Reference

- **Mock stability issue** (minor): `next/navigation` mocks that return fresh object literals on every call can cause infinite loops in tests. See PR5's gym-activo batch notes for the diagnosis and fix (hoist to stable reference).
- **Lint false-positive** (minor): `react-hooks/set-state-in-effect` rule fires in Components but not custom Hooks, even for identical code patterns. See PR2's planes-list batch notes (eslint-disable with rationale is acceptable per repo precedent).
- **TypeScript sandbox quirk** (environment): `tsconfig.tsbuildinfo` write permission issue in CI/sandbox requires `--tsBuildInfoFile <scratch>` workaround.

---

**Archive completed successfully.**  
All 25 tasks checked, spec merged, PRs landed, verification passed, no outstanding issues.  
The change is closed and ready for release.
