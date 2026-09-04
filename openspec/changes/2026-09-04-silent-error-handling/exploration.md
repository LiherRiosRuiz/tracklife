# Exploration: Silent API-failure catches in web3-next (post auth-rewrite re-verification)

## Context

An earlier audit (2026-08-29/30) found 5 places in web3-next where API call failures are caught
and only `console.error`'d — zero user-facing feedback. Since then, the repo went through a full
auth rewrite (merged 2026-09-02, removed localStorage token storage) that touched `lib/api.ts`
significantly (global 401 redirect via `handleUnauthorized()`, retargeted `request()` through a
same-origin proxy). This exploration re-verifies the 5 spots against current code and does a
fresh, broader grep.

## Current State

`lib/api.ts`'s `request<T>()` (post-rewrite): on `!res.ok`, if `status === 401` and
`!skipAuthRedirect`, calls `handleUnauthorized()` (async navigation to `/login`), **then still
throws**. Callers' `.catch()`/`try/catch` blocks still execute even on 401 — the redirect doesn't
skip the catch. The rewrite does not remove any of the flagged catches; it adds a parallel side
effect for the 401 subset only.

Two established, already-in-use error-display conventions exist:
- **Form/action pattern** (`app/login/page.tsx:33-34`, `planes/page.tsx`'s `deleteError`): local
  `useState<string>` error var, set via `catch (err) { setError(err instanceof Error ? err.message
  : "fallback") }`, rendered inline as `{error && <p className="text-sm text-danger">{error}</p>}`
  near the triggering button.
- **Data-fetch pattern** (`hooks/use-api-data.ts` + `components/ErrorState.tsx`, used in
  `favoritos/page.tsx`): `useApiData()` returns `{ data, loading, error, refetch }`; pages render
  `{error && <ErrorState message={error} onRetry={refetch} />}` — a `Card` with the message + a
  "Reintentar" button.

## Confirmed Instances (all still present, near-identical line numbers to the original audit)

1. `app/explorar/page.tsx:12` — `.catch(console.error)`. **Out of scope** — separate known
   public-page 401 bug, explicitly descoped in the P4.3 feed-comunidad-real proposal.
2. `app/app/entrenamiento/planes/page.tsx:19` — load failure, `.catch(console.error)`. Same
   component has a working `deleteError` slot for a *different* action; load failure has no
   state/UI. **In scope.**
3. `app/app/entrenamiento/planes/nuevo/page.tsx:68` — `save()` catch, no `setError`, no error
   state anywhere in the file. **In scope.**
4. `app/app/entrenamiento/gym/activo/page.tsx:156-158` — `finishWorkout()` catch, no `setError`.
   **Highest stakes**: on failure, `sessionStorage` is NOT cleared (only cleared on success after
   `await`), so workout data survives — but the user has no way to know that; UI just stops
   saving with zero explanation. **In scope, prioritize first.**
5. `app/app/nutricion/favoritos/page.tsx:117,122,165` — three narrower catches. Lines 111-124
   (one-time localStorage→API migration, intentionally best-effort, no direct user action to give
   feedback about) and line 165 (`toggle()` optimistic-UI revert — visual feedback exists, no
   message). **User decision (2026-09-04): add a message to the `toggle()` case (line 165) for
   long-term consistency; leave the migration catches (111-124) as intentional best-effort,
   unchanged** — they have no direct user action to attach feedback to.

## New Instance Found (fresh grep, not in original 5)

6. `app/app/entrenamiento/planes/[id]/page.tsx:35` — `startWorkout()` catch, same shape as #3/#4:
   `console.error(e)`, `finally { setStarting(false) }`, no `setError`, no error state in the
   file. **In scope.**

## Adjacent Bug (not a silent-catch, but same root problem — hiding information from the user)

`app/app/entrenamiento/planes/[id]/page.tsx:21` — the initial plan-detail load does
`.catch(() => router.push("/app/entrenamiento/planes"))`, treating ANY failure (network blip, 500,
not just "plan not found") as if the plan doesn't exist and silently navigating away. **In scope**
per orchestrator decision (2026-09-04) — this is a bug, not a prior deliberate design choice like
favoritos' catches were, and it's in the same file already being touched for #6.

## 401-Redirect Interaction

Not meaningfully improved by the auth rewrite for any of these. Items 2 and 6's GET loads could
occasionally be a 401 (now redirects instead of failing silently, though with zero "session
expired" explanation). Items 3, 4, 6's action handlers and favoritos' POST/DELETE catches are
dominated by 422 validation errors, network errors, or 500s — none trigger `handleUnauthorized()`.
The fix is needed regardless of the auth rewrite.

## Approach

Reuse existing conventions, split by call-site type:
- **GET-list/detail loads** (item 2, and item 6's file's initial load at line 21): migrate to
  `useApiData` + `<ErrorState>`, OR for the redirect-on-any-error case, keep the "plan not found"
  redirect ONLY for a confirmed 404, and show an inline error (not a silent redirect) for any
  other failure.
- **POST/action handlers** (items 3, 4, 6, favoritos' `toggle()`): add a local `error` state +
  inline `<p className="text-sm text-danger">` near the action button/element, matching
  `login/page.tsx`'s convention.

No new components or dependencies needed.

## Risks

- Zero test coverage exists for any of these 6 pages. This repo is Strict-TDD (web3-next now has
  a real Vitest setup as of the localStorage-token change) — a fix here should ship with tests
  first, though these are page-level components (harder to unit test than `lib/api.ts`/`auth.tsx`
  were) — design/tasks phase should scope test feasibility per file honestly, not force brittle
  component tests where they don't add real value.
- `gym/activo`'s error message should be precise about data safety (sessionStorage survives a
  failed save) to avoid an anxious user hammering retry and creating duplicate-submit risk.
- `planes/[id]:21`'s fix changes existing navigation behavior (some genuine 404s already
  redirect correctly; changing the catch to distinguish 404 from other errors must not break that
  working case).

## Ready for Proposal

Yes. Scope: items 2, 3, 4, 6 (silent catches), the adjacent `planes/[id]:21` redirect bug, and
favoritos' `toggle()` message (line 165). Favoritos' migration catches (111-124) stay unchanged.
`explorar/page.tsx` stays out of scope.
