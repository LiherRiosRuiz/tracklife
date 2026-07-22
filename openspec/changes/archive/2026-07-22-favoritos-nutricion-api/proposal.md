# Proposal: Persist Nutrition Favorites via API (P4.2)

## Intent

`nutricion/favoritos/page.tsx` stores favorites in browser `localStorage`
(`tracklife_favorites`), so they are shared across accounts on one browser and
lost on device change. Roadmap P4.2 requires a real `POST/DELETE /api/favorites`
backend and migrating the page off `localStorage`. Success: favorites persist
server-side, scoped per authenticated user, surviving device/browser changes.

## Scope

### In Scope
- Backend (`api-laravel`): `Favorite` model, controller, Form Request, routes, feature tests.
- Frontend (`web3-next`): `lib/api.ts` favorites methods/type; rewire `favoritos/page.tsx` load/save/toggle to the API; remove stale header comment.
- One-time client-side migration of existing `localStorage` favorites.

### Out of Scope
- Building a Food/Alimento or `Product`/barcode-backed catalog to give foods stable IDs (deferred debt, see Decision 1).
- Removing the `tracklife_token` localStorage dual-write (P5.1).
- Other P4 items (community feed, coach insights, nutrition-plan persistence).

## Capabilities

### New Capabilities
- `nutrition-favorites`: authenticated users list, add, and remove favorite foods and recipes, persisted per user.

### Modified Capabilities
- None.

## Approach

Exploration Approach 1 (confirmed): single polymorphic `Favorite` collection
`{ user_id: string, type: "food"|"recipe", ref: string }`, unique compound index
`(user_id, type, ref)`, mirroring the proven `Workout` model/controller/test
pattern. `ref` is the recipe `_id` or the food `name` — a direct port of the
current `favoriteKey()` composite key.

Automatic-mode decisions (rationale documented, not left open):

| # | Decision | Rationale |
|---|----------|-----------|
| 1 Food identity | Keep free-text `name` as `ref`; accept collision/rename fragility as deferred debt | Catalog resolution is scope creep beyond the 2-line roadmap; a separate change |
| 2 Data model | Single polymorphic `Favorite`, mirror `Workout` | Leanest proven pattern; 1:1 port of `favoriteKey()`; smallest reviewable diff |
| 3 Route shape | Body-keyed `POST /api/favorites` and `DELETE /api/favorites` (`{type, ref}` in body) | Food `ref` is arbitrary free-text (spaces, `/`, unicode) — unsafe as a path segment; `%2F` is a known nginx/Laravel footgun. Symmetric POST/DELETE on one URL; deviates from `{id}` precedent for a concrete data-shape reason, not doc-following |
| 4 Idempotency | POST = findOrCreate → 201 new / 200 existing; DELETE = 204 always (no 404 when absent) | Matches UI `toggle()` which never distinguishes add/remove failure |
| 5 User scoping | `auth:sanctum` + `$request->user()->_id` | Intentional, user-visible change: switching accounts no longer inherits favorites |
| 6 Migration | One-time best-effort client migration: POST existing `localStorage` entries, then clear key | Low effort, avoids "favorites vanished" surprise; attributes shared-browser entries to current account (acceptable for convenience data) |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `api-laravel/app/Models/Favorite.php` | New | Polymorphic favorite model |
| `api-laravel/app/Http/Controllers/Api/FavoriteController.php` | New | index/store/destroy |
| `api-laravel/app/Http/Requests/StoreFavoriteRequest.php` | New | Validate `type`, `ref` |
| `api-laravel/routes/api.php` | Modified | Routes in `auth:sanctum` group |
| `api-laravel/tests/Feature/FavoriteTest.php` | New | Mirror `WorkoutTest` |
| `web3-next/lib/api.ts` | Modified | Favorites methods + type |
| `web3-next/app/app/nutricion/favoritos/page.tsx` | Modified | API wiring + migration |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Food name collision / rename silently unfavorites | Med | Documented deferred debt (Decision 1); pre-existing fragility |
| Frontend has no test runner (vitest not installed) | High | Real gap: frontend changes ship without TDD until vitest is a prerequisite; backend is Strict-TDD (PHPUnit, mirror `WorkoutTest`) |
| Body-keyed DELETE sets a new codebase convention | Med | Justified by data shape; documented for future features |
| Migration attributes shared-browser favorites to current account | Low | Convenience data, not critical; one-time and best-effort |

## Rollback Plan

Revert the `favoritos/page.tsx` and `lib/api.ts` diffs to restore `localStorage`
behavior; drop the `favorites` routes/model/controller. The `favorites` Mongo
collection is additive and can be left orphaned or dropped. No destructive
migration of other collections occurs.

## Dependencies

- `web3-next` TDD gap: vitest + @testing-library/react must be installed before strict TDD applies to the frontend slice (prerequisite, flagged not resolved here).

## Success Criteria

- [ ] `GET/POST/DELETE /api/favorites` work under `auth:sanctum`, scoped by `user_id`.
- [ ] POST idempotent (201/200), DELETE idempotent (204), no user_id leaked in JSON.
- [ ] `FavoriteTest` passes (`composer test`); cross-user isolation covered.
- [ ] `favoritos/page.tsx` reads/writes favorites via API; stale comment removed.
- [ ] Existing `localStorage` favorites migrate once, then key is cleared.
