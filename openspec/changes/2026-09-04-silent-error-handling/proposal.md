# Proposal: Surface silent API failures to the user (web3-next)

**Target subproject: `web3-next` only.** No `api-laravel`, `web1-astro`, `web2-nuxt`, or infra changes.

## Intent

Six API failure paths in web3-next are caught and only `console.error`'d. The user sees a button
stop spinning and nothing else: a failed plan save looks like a successful one, and a failed workout
save looks like lost training data. `planes/[id]` is worse — it redirects away on *any* load failure,
telling the user "this plan does not exist" when the real cause was a network blip. Exploration
confirmed all six are still present after the auth rewrite. The app already has two working error
conventions; these sites simply never adopted them.

## Scope

### In Scope

| # | Site | Fix |
|---|------|-----|
| 1 | `app/app/entrenamiento/planes/page.tsx:19` | Load failure → `<ErrorState>` + retry |
| 2 | `app/app/entrenamiento/planes/nuevo/page.tsx:68` | `save()` → inline error |
| 3 | `app/app/entrenamiento/gym/activo/page.tsx:156` | `finishWorkout()` → inline error with data-safety copy |
| 4a | `app/app/entrenamiento/planes/[id]/page.tsx:35` | `startWorkout()` → inline error |
| 4b | `app/app/entrenamiento/planes/[id]/page.tsx:21` | Redirect only on 404; inline error otherwise |
| 5 | `app/app/nutricion/favoritos/page.tsx:165` | `toggle()` → message alongside the existing icon revert |
| 6 | `lib/api-error.ts` (new) | Pure helpers `toErrorMessage()` / `isNotFound()` |

### Out of Scope

- `app/explorar/page.tsx:12` — separate public-page 401 bug, descoped in `feed-comunidad-real`.
- `favoritos/page.tsx:111-124` — migration catches stay intentional best-effort (user decision 2026-09-04).
- Retry/idempotency for `createWorkout` (see Risks), toast/global notification system, `useApiData`
  migration of pages that do not need it.

## Capabilities

### New Capabilities
- `client-error-feedback`: how web3-next surfaces API failures — message derivation rules, copy tone,
  per-surface placement, and the 404-vs-other load-failure distinction.

### Modified Capabilities
- None. `nutrition-favorites` is API/migration-scoped; the `toggle()` message is the same UI
  convention as the other five sites, so it belongs with them in `client-error-feedback` rather than
  splitting one convention across two specs.

## Approach

Reuse the two existing conventions (`login/page.tsx:34` inline `<p className="text-sm text-danger">`;
`components/ErrorState.tsx` card + "Reintentar"). No new components, no dependencies. Extract only the
*decision* logic into `lib/api-error.ts` so it is unit-testable independently of React.

### Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| **D1 — Copy pattern** | Fallback copy is `"Error al {infinitivo} {objeto}"`, sentence case, correct accents, no exclamation, no emoji, no status codes. Matches `login/page.tsx:34` (`"Error al iniciar sesión"`) and `planes/page.tsx:30` (`"Error al eliminar el plan"`). Strings: `"Error al cargar tus planes"`, `"Error al cargar el plan"`, `"Error al guardar el plan"`, `"Error al iniciar el workout"`, `"Error al actualizar el favorito"`. | Established voice already exists in two files; inventing a second register would make the app less consistent, not more polished. |
| **D2 — gym/activo copy** | Fixed, non-overridable sentence: **"No se pudo guardar el entrenamiento. Tus series siguen aquí — no cierres esta pestaña y vuelve a intentarlo."** Any API detail renders as a secondary muted line, never replacing it. | `sessionStorage` is only cleared *after* a successful `await` (line 153), so the data really does survive — but only in this tab. The copy states exactly what is true (data intact, tab-bound) and avoids the unverifiable claim "nothing was saved on the server". Calm, no alarm words. |
| **D3 — planes/page.tsx uses `<ErrorState>` component, not the `useApiData` hook** | Neither option offered. Migrating to `useApiData` forces a choice between a derived-state mirror (anti-pattern) or `refetch()` after delete — and `useApiData` sets `loading: true` on refetch, so every delete would flash the whole list back to "Cargando...", a real UX regression on a currently-working path. Instead: extract the fetch into a `useCallback loadPlans`, add a `loadError` state, and render `<ErrorState message={loadError} onRetry={loadPlans} />`. | Gets the free "Reintentar" button and the visual consistency with `favoritos` (the stated benefit of option A) at the diff size of option B, with zero change to the working delete path. ~12 lines. |
| **D4 — 404 detection** | `lib/api.ts:118-119` already attaches `error.status`. `isNotFound(e)` is `status === 404`; only that redirects to `/app/entrenamiento/planes`. Everything else sets `loadError`. | The working 404 case is preserved by construction, and is locked by a mandatory test (see D6). |
| **D5 — 401 is never shown inline** | `toErrorMessage()` returns `null` for `status === 401`; callers skip rendering. | `request()` already calls `handleUnauthorized()` → `/login`, but *still throws*, so the catch runs during an in-flight navigation. Without this, every expired session flashes a red error before redirecting. |
| **D6 — API message only for 4xx, plus a timeout special case** | `toErrorMessage(e, fallback)` returns `e.message` when `status` is 400–499; also returns `e.message` when the error is `lib/api.ts`'s own timeout error (recognizable independent of `status`, e.g. by name/message shape — design decides the exact discriminator); else `fallback`. | Laravel 4xx messages are user-actionable Spanish validation text. `request()` falls back to `res.statusText` on a non-JSON body — a 500 with an HTML error page would otherwise render **"Internal Server Error"** in English to a Spanish user, hence the 4xx restriction. The timeout case is carved back out (resolved Q3) because `"La petición tardó demasiado (timeout 10s)"` is genuinely more useful than the generic fallback and is cheap to special-case. |
| **D7 — Test strategy (honest tiering)** | **T1 mandatory RED-first unit tests**: `lib/api-error.ts` — pure functions, full branch coverage, matches the proven `__tests__/lib/` style. **T2 mandatory component tests**: `planes/[id]` (404 → `router.push` called; 500 → no push + error visible) and `gym/activo` (failed save → reassurance visible **and** `sessionStorage` still holds the workout). **T3 best-effort**: `planes/page.tsx` (easy: reject `workoutPlans`, assert text + Reintentar). **T4 manual/E2E**: `nuevo/page.tsx` (requires driving the exercise picker to satisfy the `exercises.length === 0` guard — brittle) and `favoritos/page.tsx` (3 `useApiData` calls + migration effect + modal). | Component tests *are* feasible: `__tests__/lib/auth.test.tsx` already renders React in jsdom with `vi.mock("@/lib/api")`; these pages only add `vi.mock("next/navigation")` and `vi.mock("@/lib/auth")`. No new infra. T2 is non-negotiable because those two sites are the ones with real behavior change and a real safety claim — the `gym/activo` test literally asserts the promise D2's copy makes. T4 is named as manual rather than faked, per the exploration's warning against brittle coverage theatre. |

## Affected Areas

| Area (under `projects/web/web3-next/`) | Impact | Description |
|---|---|---|
| `lib/api-error.ts` | New | `toErrorMessage()`, `isNotFound()` — pure, no React |
| `app/app/entrenamiento/planes/page.tsx` | Modified | `loadPlans` callback + `loadError` + `<ErrorState>` |
| `app/app/entrenamiento/planes/nuevo/page.tsx` | Modified | `saveError` + inline `<p>` near the save button |
| `app/app/entrenamiento/planes/[id]/page.tsx` | Modified | `loadError` (404-gated redirect) + `startError` |
| `app/app/entrenamiento/gym/activo/page.tsx` | Modified | `saveError` + D2 copy near "Finalizar" |
| `app/app/nutricion/favoritos/page.tsx` | Modified | `toggleError` message; migration catches untouched |
| `__tests__/lib/api-error.test.ts`, `__tests__/app/**` | New | Per D7 |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Duplicate workout: the save reached the server but the response was lost, user retries | Med | D2 copy deliberately does **not** say "nothing was saved"; it says the local data is intact. Idempotency keys are out of scope and logged as a follow-up. |
| `planes/[id]` regression — a genuine 404 stops redirecting | Med | D4 keys off the existing `error.status`; T2 test asserts both branches (404 redirects, 500 does not). |
| English `statusText` leaking into Spanish UI | Med | D6 restricts raw API text to 4xx. |
| Error state persists after a later successful retry | Low | Every handler clears its error state at entry, as `deletePlan` already does (`planes/page.tsx:26`). |
| Over-scoping into a full toast/notification system | Low | Explicit non-goal; only local state + two existing render patterns. |

## Rollback Plan

1. **Single revert** — one `git revert` of the change commit. UI-only: no schema, no migration, no env
   var, no persisted state, no server-side effect to undo.
2. **Per-file revert** — the six files are independent; any single page can be reverted alone without
   breaking the others. `lib/api-error.ts` is additive and inert once unimported.
3. **Only behavior change to undo** is `planes/[id]`'s navigation (D4); reverting restores the previous
   redirect-on-any-error. No user data is involved in either direction.
4. **No data risk** — nothing in this change writes to `sessionStorage`, `localStorage`, or the API.
   `gym/activo` only *reads* and *displays*; the existing clear-on-success logic is untouched.

## Dependencies

- None. Vitest + Testing Library are already installed (`openspec/config.yaml` → `testing.web3-next.ready: true`).

## Proposal question round — resolved by orchestrator (2026-09-04)

- **Q1**: keep the precise wording ("no cierres esta pestaña...") as drafted. It's not alarming,
  it's accurate — the softer version would omit the tab-scoping fact, which could produce a worse
  outcome (user closes the tab believing data is safe everywhere, loses it). Precision over vague
  reassurance.
- **Q2**: keep the explicit "vuelve a intentarlo" — a functional retry button next to *vague*
  copy is more likely to invite blind hammering than clear copy that states what will happen. The
  real mitigation for duplicate-submits is a follow-up engineering concern (disable-after-first-attempt
  or idempotency keys), already logged as out of scope in Risks — not something copy wording alone
  can fix either way.
- **Q3**: yes, special-case it. `lib/api.ts`'s own timeout error is a small, recognizable,
  low-cost addition and it's a genuinely more useful message than the generic fallback — worth
  doing in `lib/api-error.ts`.
- **Q4**: accept T4 (manual/E2E) for `nuevo/page.tsx` and `favoritos/page.tsx`. Forcing tests here
  would be exactly the "coverage theatre" the exploration warned against (driving the exercise
  picker past a guard; mocking 3 `useApiData` calls + migration effect + modal) — low real value,
  high maintenance cost, for general UI copy rather than security- or data-safety-critical logic
  (unlike `gym/activo`, which stays T2-mandatory precisely because it makes a safety claim).

## Success Criteria

- [ ] No `.catch(console.error)` or bare `catch { console.error }` remains at the six in-scope sites
- [ ] Every in-scope failure renders visible Spanish text; none is console-only
- [ ] `planes/[id]`: a 404 still redirects; a 500/network failure shows an inline error and stays put
- [ ] `gym/activo`: after a failed save, the reassurance is visible **and** `sessionStorage` still holds the workout
- [ ] An expired session (401) redirects to `/login` with no red error flash (D5)
- [ ] `favoritos` migration catches (lines 111-124) are byte-identical after the change
- [ ] `npm test`, `npm run lint`, `npm run build` pass in web3-next
