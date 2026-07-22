# Tasks: Persist Nutrition Favorites via API (P4.2)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~350-420 (backend ~250-300, frontend ~100-120) |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (backend) → PR 2 (frontend, stacked on PR 1) |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Backend Favorite API: model, request, resource, controller, routes, 11-scenario feature test | PR 1 (base: tracker/main) | `php artisan test --filter=FavoriteTest` | Manual curl w/ sanctum token vs api.test | Revert `routes/api.php` favorites block + delete 4 new files; drop additive `favorites` Mongo collection |
| 2 | Frontend integration: `lib/api.ts` methods + `favoritos/page.tsx` API-backed state + migration | PR 2 (base: PR 1 branch) | `npm run build` (typecheck; no vitest) | Manual browser check at app.tracklife.test/nutricion/favoritos incl. localStorage migration | Revert `lib/api.ts` + `page.tsx` to prior localStorage-only version; backend untouched |

## Phase 1: Backend Foundation

- [x] 1.1 Create `app/Models/Favorite.php` mirroring `Workout.php`: `$connection='mongodb'`, `$collection='favorites'`, `$fillable=['user_id','type','ref']`. No migration file — Mongo is schemaless (confirmed via `Workout.php`).
- [x] 1.2 Create `app/Http/Requests/StoreFavoriteRequest.php`: `authorize()` true; rules `type=>required|in:food,recipe`, `ref=>required|string`.
- [x] 1.3 Create `app/Http/Resources/FavoriteResource.php`: expose `id`,`type`,`ref`,`created_at`; hide `user_id`.

## Phase 2: Unauthenticated Rejection (RED→GREEN→REFACTOR)

- [x] 2.1 RED: create `tests/Feature/FavoriteTest.php` with `MongoTestCleanup` (`$mongoCollections=['users','personal_access_tokens','favorites']`), `test_favorites_index_requires_authentication`, `test_store_favorite_requires_authentication` (assert 401).
- [x] 2.2 GREEN: register `GET/POST/DELETE /api/favorites` in `routes/api.php` inside existing `auth:sanctum` group; create `FavoriteController` stub (index/store/destroy). Run `--filter=FavoriteTest` to confirm 401s pass.
- [x] 2.3 REFACTOR: none expected — mirrors `WorkoutController` route registration.

## Phase 3: Happy Path (RED→GREEN→REFACTOR)

- [x] 3.1 RED: add `test_store_creates_new_favorite_returns_201`, `test_favorite_resource_does_not_expose_user_id`, `test_user_lists_only_their_favorites`.
- [x] 3.2 GREEN: implement `index`/`store` using `Favorite::firstOrCreate(['user_id','type','ref'])` + `FavoriteResource`; 201 when `wasRecentlyCreated`.
- [x] 3.3 REFACTOR: confirm controller style matches `WorkoutController`.

## Phase 4: Idempotency (RED→GREEN→REFACTOR)

- [x] 4.1 RED: add `test_store_existing_favorite_returns_200`, `test_destroy_removes_favorite_returns_200_with_message`, `test_destroy_absent_favorite_still_returns_200` — expect body `{"message": "Favorito eliminado"}` (verified string, matches `WorkoutPlanController::destroy` → `"Plan eliminado"` precedent).
- [x] 4.2 GREEN: implement `destroy` — delete matching `user_id/type/ref`, always `response()->json(['message' => 'Favorito eliminado'])` (200, never 204); store returns 200 on existing.
- [x] 4.3 REFACTOR: dedupe shared validated-data lookup if repeated across store/destroy. (Skipped — only 2 call sites, both already reading `$request->validated()` once; extracting would add indirection without reducing duplication.)

## Phase 5: Cross-User Isolation & Input Validation (RED→GREEN→REFACTOR)

- [x] 5.1 RED: add `test_store_rejects_invalid_type`, `test_store_fails_without_required_fields`, `test_destroy_only_deletes_own_favorite` (two-user scenario).
- [x] 5.2 GREEN: confirm every action scopes `where('user_id', (string) $request->user()->_id)`; close any gap. (No gap found — all 3 tests passed immediately since Phase 1/4 implementation already generalized correctly.)
- [x] 5.3 REFACTOR: run full `php artisan test --filter=FavoriteTest`, `./vendor/bin/pint`. (11/11 passed; pint found 1 style issue in `FavoriteResource.php`, fixed; full suite re-verified 96/96 passed.)

## Phase 5b: Corrective Coverage (post-verify — closes 2 CRITICAL gaps from sdd-verify)

- [x] 5b.1 Add `test_same_ref_favorited_independently_by_two_users` — user A and user B both POST identical `{type, ref}`; both assert 201, DB asserts 1 record per user + 2 total. Passed immediately, no production change (store already scoped by `user_id`).
- [x] 5b.2 Add `test_destroy_favorite_requires_authentication` — unauthenticated DELETE asserts 401. Passed immediately, no production change (DELETE already inside the same `auth:sanctum` group as GET/POST).
- [x] 5b.3 Strengthen `test_user_lists_only_their_favorites` (WARNING) — assert `user_id` absent from every returned item, not just index 0.
- [x] 5b.4 Run full `php artisan test`. (98/98 passed, 354 assertions — up from 96/96, zero regressions.) Commit `572772e`.

## Phase 6: Frontend (no test-first — vitest not installed; accepted gap per design, not bundled here)

- [x] 6.1 Add `Favorite` type + `favorites`/`addFavorite`/`removeFavorite` to `lib/api.ts` per design contract.
- [x] 6.2 Rewrite `app/app/nutricion/favoritos/page.tsx`: replace localStorage `Set` with API-backed state hydrated from `api.favorites()`; `toggle()` optimistic mutate + revert on failure.
- [x] 6.3 Add one-time migration effect on mount: read `tracklife_favorites`, split each composite key on the FIRST `:`, `await addFavorite` per entry in try/catch (best-effort, no abort on single failure), `localStorage.removeItem` once attempt completes.
- [x] 6.4 Remove stale localStorage NOTE/TODO comment from `page.tsx`.
