# Client Error Feedback Specification

## Purpose

How web3-next surfaces API failures to the user at the six previously-silent
call sites: message derivation rules, copy tone, per-surface placement, and
the 404-vs-other load-failure distinction for `planes/[id]`.

## Requirements

### Requirement: Visible Error Feedback at All Silent-Catch Sites

The system MUST render a visible Spanish error message for each previously-silent failure site; none MUST rely on `console.error` alone.

| Site | Fallback message |
|---|---|
| `planes/page.tsx` load | "Error al cargar tus planes" |
| `planes/nuevo/page.tsx` save | "Error al guardar el plan" |
| `gym/activo/page.tsx` finishWorkout | Fixed D2 sentence — see dedicated requirement |
| `planes/[id]/page.tsx` startWorkout | "Error al iniciar el workout" |
| `planes/[id]/page.tsx` initial load (non-404) | "Error al cargar el plan" |
| `favoritos/page.tsx` toggle | "Error al actualizar el favorito" |

#### Scenario: Planes list load failure shows visible error

- GIVEN the plans list request fails (non-401)
- WHEN `planes/page.tsx` renders
- THEN "Error al cargar tus planes" is visible, not console-only

#### Scenario: Plan save failure shows visible error

- GIVEN `planes/nuevo` `save()` fails (non-401)
- WHEN the save request is submitted
- THEN "Error al guardar el plan" renders inline near the save action

#### Scenario: Workout start failure shows visible error

- GIVEN `planes/[id]` `startWorkout()` fails (non-401)
- WHEN the user starts a workout
- THEN "Error al iniciar el workout" renders inline

#### Scenario: Favorito toggle failure shows visible message

- GIVEN favoritos `toggle()` fails (non-401)
- WHEN the icon reverts optimistically
- THEN "Error al actualizar el favorito" also renders alongside the revert

### Requirement: planes/[id] Initial Load Distinguishes 404 From Other Failures

WHEN the plan-detail initial load fails with a 404, the system MUST redirect to `/app/entrenamiento/planes` (existing behavior preserved). WHEN it fails with any other error (network, 5xx, timeout, etc.), the system MUST NOT redirect; it MUST show "Error al cargar el plan" inline and remain on the page.

#### Scenario: 404 still redirects

- GIVEN the plan detail fetch returns 404
- WHEN the page loads
- THEN the user is redirected to `/app/entrenamiento/planes`
- AND no inline error renders

#### Scenario: 500/network failure shows inline error, no redirect

- GIVEN the plan detail fetch fails with a 500 or network error
- WHEN the page loads
- THEN "Error al cargar el plan" renders inline
- AND no redirect occurs

### Requirement: gym/activo Failed-Save Reassurance Matches Actual Data State

WHEN `finishWorkout()` fails (non-401), the system MUST show the fixed sentence: "No se pudo guardar el entrenamiento. Tus series siguen aquí — no cierres esta pestaña y vuelve a intentarlo." Any API detail MUST render only as a secondary muted line, never replacing it. `sessionStorage` MUST still hold the workout data after the failed save (cleared only after a successful save), so the sentence's claim MUST be true.

#### Scenario: Failed save shows reassurance and preserves data

- GIVEN a workout is in progress with data in `sessionStorage`
- WHEN `finishWorkout()` fails (non-401)
- THEN the fixed reassurance sentence renders visibly
- AND `sessionStorage` still holds the workout data unchanged

#### Scenario: API detail is secondary, never replaces the sentence

- GIVEN `finishWorkout()` fails with a 4xx carrying an API message
- WHEN the error renders
- THEN the fixed sentence is shown as the primary message
- AND the API detail, if shown, appears only as a secondary muted line

### Requirement: Expired Session (401) Never Renders Inline at These Sites

WHEN any of the six flows receives a 401, the system MUST NOT render an inline error; it MUST rely solely on the existing redirect to `/login`.

#### Scenario: 401 during action triggers redirect only

- GIVEN a session has expired
- WHEN any of the six flows calls the API and receives 401
- THEN the user is redirected to `/login`
- AND no inline error message flashes during navigation

### Requirement: Error Message Text Source Is Restricted by Status/Type

The system MUST use the raw API error message only when the response status is 4xx, or when the error is `lib/api.ts`'s recognized client-side timeout. For all other failures (5xx, network errors, non-JSON bodies), the system MUST use the fixed local Spanish fallback message defined for that action and MUST NOT surface `res.statusText` or other English text.

#### Scenario: 4xx uses the API message

- GIVEN a request fails with a 422 carrying a Spanish validation message
- WHEN the error renders
- THEN the API's message text is shown

#### Scenario: Timeout uses the timeout message

- GIVEN a request fails via `lib/api.ts`'s timeout error
- WHEN the error renders
- THEN the timeout-specific message is shown

#### Scenario: 500/network error uses local fallback, not statusText

- GIVEN a request fails with a 500 and a non-JSON body
- WHEN the error renders
- THEN the fixed local Spanish fallback for that action is shown
- AND no English `statusText` text appears

### Requirement: Favoritos Migration Catches Remain Byte-Identical

The three migration catch sites in `favoritos/page.tsx` (lines 111-124) MUST remain unchanged: best-effort, no new user-facing message, byte-identical behavior. Only the `toggle()` failure (line 165) gets a visible message.

#### Scenario: Migration failure stays silent to the user

- GIVEN one migration POST fails during the one-time localStorage migration
- WHEN the migration runs
- THEN no user-facing error message renders for that failure
- AND the remaining entries still migrate

#### Scenario: Migration code is unchanged

- GIVEN the change is applied
- WHEN `favoritos/page.tsx:111-124` is diffed against its pre-change version
- THEN the diff is empty

### Requirement: Error State Clears on Subsequent Success

Each fixed error state MUST clear itself when the corresponding action subsequently succeeds; no stale error message MUST remain visible after a working retry.

#### Scenario: Retry after failure clears the error

- GIVEN an action previously failed and shows a visible error
- WHEN the user retries and the action succeeds
- THEN the error message is no longer visible
