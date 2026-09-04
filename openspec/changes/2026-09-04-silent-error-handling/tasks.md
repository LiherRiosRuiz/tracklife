# Tasks: Surface silent API failures to the user (web3-next)

## Review Workload Forecast

**Correction to design's estimate**: design claims "~135 source + ~330 test lines, comfortably
under 400" — but 135+330=465 already exceeds 400 by the design's own numbers. A line-count of the
design's actual diff hunks (~178 across 6 page/lib files) plus the three fully-specified test files
(T1 ≈139, T2a ≈82, T2b ≈115 = 336) puts the **mandatory-only** slice at ~514 lines, before the
optional T3 test (~50-70) is even added. This repo's convention (see `remove-token-localstorage`
tasks.md) sums test-file lines into the same budget as source — no exclusion for authored test code,
only generated goldens are excluded. So this is High risk, not Low, and needs chaining.

| Field | Value |
|-------|-------|
| Estimated changed lines | ~514-585 (178 source + 336 mandatory tests + ~50-70 optional T3) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 → PR 5 → PR 6 |
| Delivery strategy | auto-forecast (not one of ask-on-risk/auto-chain/single-pr/exception-ok) |
| Chain strategy | pending — recommend stacked-to-main; all units import `lib/api-error.ts` (PR 1) but are otherwise file-independent per proposal's own rollback plan, so PR 2-6 do not need to stack on each other, only on PR 1 |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | `lib/api-error.ts` + T1 unit/contract tests (~194 lines) | PR 1 | `npm test -- api-error` | N/A — pure module; C1/C2 already exercise real `lib/api.ts` via stubbed `fetch` | Delete `lib/api-error.ts` + its test; inert until imported |
| 2 | `planes/page.tsx` load error + `deletePlan` fix (A6) + T3 best-effort test (~84-104 lines) | PR 2 | `npm test -- planes-list` (if T3 written) | Manual: kill API, load `/app/entrenamiento/planes`, confirm `<ErrorState>` + Reintentar | Revert page diff; `deletePlan` reverts to raw `err.message` |
| 3 | `planes/nuevo/page.tsx` save error, manual-only (~7 lines) | PR 3 | N/A — T4 manual only | Manual: real exercise picker + forced save failure (Phase 7.1) | Revert page diff |
| 4 | `planes/[id]/page.tsx` 404-gated redirect + load/start error + T2a tests (~122 lines) | PR 4 | `npm test -- planes-detail` | Browser: real 404 plan id vs forced 500/network failure | Revert page diff; restores redirect-on-any-error |
| 5 | `gym/activo/page.tsx` D2 reassurance + T2b tests (~151 lines) | PR 5 | `npm test -- gym-activo` | Manual: in-progress workout, force save failure, confirm `sessionStorage` intact | Revert page diff |
| 6 | `favoritos/page.tsx` toggle error, manual-only (~6 lines) + final full-suite pass | PR 6 | N/A — T4 manual only; final `npm test && npm run lint && npm run build` | Manual: forced toggle failure (7.2); full 401 sweep across all six sites (7.3) | Revert page diff; migration block (lines 89-134) untouched throughout |

## Phase 1: `lib/api-error.ts` — RED first (T1, mandatory)

- [ ] 1.1 RED `projects/web/web3-next/__tests__/lib/api-error.test.ts`: `toErrorMessage` cases E1-E11 (401→null; 4xx→API message; boundary 400/499; 5xx→fallback, no `statusText` leak; empty/whitespace 4xx message→fallback; timeout→its own message; network `TypeError`→fallback; arbitrary `Error`→fallback; non-`Error` value→fallback; 5xx matching timeout literal→NOT timeout branch; empty-fallback detail channel) per design §1, D5/D6. Confirm all fail (module doesn't exist).
- [ ] 1.2 RED same file: `isNotFound` cases N1-N4 (404→true; 500/401/403→false; no-status error→false; non-`Error` value→false) per D4. Confirm fail.
- [ ] 1.3 RED same file: contract tests C1 (stub global `fetch` to reject with a real `AbortError`, import the real `@/lib/api`, assert `toErrorMessage` recognizes `API_TIMEOUT_MESSAGE`) and C2 (stub `fetch` to resolve a 500 with a non-JSON body, assert no `statusText` leak) per design §1, A1. Confirm fail (module doesn't exist).
- [ ] 1.4 GREEN: create `projects/web/web3-next/lib/api-error.ts` — `API_TIMEOUT_MESSAGE`, `asApiError`, `isTimeout`, `isNotFound`, `toErrorMessage` exactly per design §1 (A1 timeout discriminator, A2 empty-message guard, A3 401→null). `lib/api.ts` stays byte-identical.
- [ ] 1.5 Run `npm test -- api-error` in web3-next — E1-E11, N1-N4, C1-C2 all green.

## Phase 2: `planes/page.tsx` — load error + `deletePlan` fix (D3, A6; T3 best-effort)

- [ ] 2.1 (best-effort, do not block) RED `projects/web/web3-next/__tests__/app/entrenamiento/planes-list.test.tsx`: reject `api.workoutPlans`, assert "Error al cargar tus planes" and a "Reintentar" control render, per spec scenario "Planes list load failure shows visible error". If `next/link`/router-context errors surface, mock `next/link` per design §3.4 caveat only — do not exceed that scope.
- [ ] 2.2 GREEN: modify `projects/web/web3-next/app/app/entrenamiento/planes/page.tsx` per design §2.1 — extract `loadPlans` into `useCallback`, add `loadError` state, render `<ErrorState message={loadError} onRetry={loadPlans} />` on non-401 load failure.
- [ ] 2.3 Same file (A6): migrate `deletePlan`'s catch from raw `err.message` to `toErrorMessage(e, "Error al eliminar el plan")`, writing into the already-existing `deleteError` state — no new state, no new render site.
- [ ] 2.4 Run `npm test -- planes-list` (if 2.1 completed); manually confirm delete-failure copy still renders via the existing `deleteError` UI.

## Phase 3: `planes/nuevo/page.tsx` — save error (manual verification only, T4)

- [ ] 3.1 GREEN: modify `projects/web/web3-next/app/app/entrenamiento/planes/nuevo/page.tsx` per design §2.2 — add `saveError` state; replace `console.error(e)` in `save()`'s catch with `toErrorMessage(e, "Error al guardar el plan")` (skip render on `null`); render inline `<p className="text-sm text-danger">` above the save button.
- [ ] 3.2 No automated test — manual verification only, per proposal Q4 (exercise-picker guard makes RTL coverage brittle relative to its value). Deferred to Phase 7.1.

## Phase 4: `planes/[id]/page.tsx` — 404-gated redirect + load/start error (D4, A4; T2 mandatory)

- [ ] 4.1 RED `projects/web/web3-next/__tests__/app/entrenamiento/planes-detail.test.tsx`: P1 (404 redirects, no inline error), P2 (500 shows inline error, no redirect, no `statusText` leak), P3 (network `TypeError` also shows inline error, no redirect), P4 (401 renders nothing inline, no redirect via this page) per design §3.2. Mock `next/navigation`, `@/lib/auth`, `@/lib/api`. Confirm all fail (page doesn't branch on `isNotFound` yet).
- [ ] 4.2 GREEN: modify `projects/web/web3-next/app/app/entrenamiento/planes/[id]/page.tsx` per design §2.3 — extract `loadPlan` into `useCallback`, add `loadError`/`startError` state; branch `isNotFound(e)` → `router.push` (only case that redirects), else `toErrorMessage(e, "Error al cargar el plan")` → `loadError`; render `<ErrorState message={loadError} onRetry={loadPlan} />` **between** the `loading` and `!plan` branches — branch order matters, do not let non-404 fall through to the blank-page `!plan` return.
- [ ] 4.3 Same file: wrap `startWorkout()`'s catch with `toErrorMessage(e, "Error al iniciar el workout")` → `startError`; render inline `<p className="text-sm text-danger">` below the "Iniciar Workout" button.
- [ ] 4.4 Run `npm test -- planes-detail` — P1-P4 green.

## Phase 5: `gym/activo/page.tsx` — D2 reassurance copy (T2 mandatory)

- [ ] 5.1 RED `projects/web/web3-next/__tests__/app/entrenamiento/gym-activo.test.tsx`: G1 (failed save shows the exact fixed sentence AND `sessionStorage` still holds the workout with correct `completed`/`weight`, no navigation, no English leak), G2 (4xx API detail renders as secondary muted line, never replacing the fixed sentence), G3 (401 renders nothing, `sessionStorage` untouched), G4 (successful save clears `sessionStorage` and navigates, no reassurance shown) per design §3.3. Confirm all fail.
- [ ] 5.2 GREEN: modify `projects/web/web3-next/app/app/entrenamiento/gym/activo/page.tsx` per design §2.4 — add `saveFailed`/`saveErrorDetail` state; in `finishWorkout()`'s catch call `toErrorMessage(e, "")` (empty fallback = detail channel, `null` = 401 skip); render the fixed D2 sentence as primary text with `saveErrorDetail` as secondary muted `<p>` only when non-empty. Keep both `sessionStorage.removeItem` calls inside `try`, after the `await`, unchanged.
- [ ] 5.3 Run `npm test -- gym-activo` — G1-G4 green.

## Phase 6: `favoritos/page.tsx` — toggle error (manual verification only, T4)

- [ ] 6.1 GREEN: modify `projects/web/web3-next/app/app/nutricion/favoritos/page.tsx` per design §2.5 — add `toggleError` state; set it on `toggle()`'s existing `.catch` via `toErrorMessage(err, "Error al actualizar el favorito")` (keep the existing `console.error` line); render inline `<p className="text-sm text-danger">` near the favorites list. Do not touch the migration block (lines 89-134, catches at 111-124).
- [ ] 6.2 Diff `favoritos/page.tsx:111-124` against its pre-change version — confirm byte-identical (spec requirement).
- [ ] 6.3 No automated test — manual verification only, per proposal Q4. Deferred to Phase 7.2.

## Phase 7: Manual Verification + Final Full-Suite Pass

- [ ] 7.1 Manual, `planes/nuevo/page.tsx`: drive the real exercise picker, submit with a forced API failure (devtools throttle/offline) — confirm "Error al guardar el plan" (or 4xx API text) renders inline, no console-only failure.
- [ ] 7.2 Manual, `favoritos/page.tsx`: force a `toggle()` failure — confirm "Error al actualizar el favorito" renders alongside the optimistic-revert icon flip; confirm the localStorage migration still runs silently.
- [ ] 7.3 Manual: expired session (401) at each of the six sites — confirm redirect to `/login` with no red error flash anywhere (D5).
- [ ] 7.4 Run `npm test`, `npm run lint`, `npm run build` in web3-next — all pass; confirm no `.catch(console.error)` / bare `catch { console.error }` remains at the six in-scope sites (proposal Success Criteria).
