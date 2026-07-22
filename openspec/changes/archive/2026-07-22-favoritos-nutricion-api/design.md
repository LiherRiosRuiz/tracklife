# Design: Persist Nutrition Favorites via API (P4.2)

## Technical Approach

Port the proven `Workout` vertical slice (Model + Resource + FormRequest + Controller + `auth:sanctum` route + PHPUnit Feature test) to a new polymorphic `Favorite` collection `{ user_id, type, ref }`. Frontend swaps the localStorage `Set<string>` composite-key logic in `favoritos/page.tsx` for API-backed state via three new `lib/api.ts` methods, plus a one-time best-effort migration on mount. Deliberate deviation from the `{id}` route precedent: POST/DELETE are body-keyed because `ref` (a free-text food name) is unsafe as a URL path segment (`/`, spaces, unicode; `%2F` is an nginx/Laravel footgun).

## Architecture Decisions

| Decision | Choice | Rejected alternative | Rationale |
|----------|--------|----------------------|-----------|
| Data model | Single polymorphic `Favorite` (`user_id`, `type`, `ref`) | Separate `favorite_foods`/`favorite_recipes` collections | Leanest proven pattern; direct port of frontend `favoriteKey()`; smallest diff |
| Route shape | Body-keyed `POST`/`DELETE /api/favorites` (`{type, ref}` in JSON body) | Path-keyed `DELETE /api/favorites/{ref}` | `ref` is arbitrary free text; unsafe as path segment. Symmetric verbs on one URL |
| Idempotency | POST findOrCreate → 201 new / 200 existing; DELETE → 200 `{message}` always | POST 409 on dup; DELETE 404 when absent | UI `toggle()` never distinguishes add/remove failure; idempotent = simpler client |
| DELETE response | `destroy()` returns **200** `{"message": "..."}`, never 204 | `response()->noContent()` (204 empty body) | FINAL. `request<T>()` calls `res.json()`, which throws on an empty 204 body. Matches this codebase's established convention: the existing `WorkoutPlanController::destroy` already returns 200 with a JSON message, not 204. Idempotency intent (proposal) is fully satisfied by 200-always |
| User scoping | `auth:sanctum` + `(string) $request->user()->_id` | Trust client-sent user_id | Server-authoritative; mirrors `WorkoutController` exactly |
| user_id exposure | `FavoriteResource` hides `user_id`, exposes `id`/`type`/`ref`/`created_at` | Return raw model | Mirrors `WorkoutResource`; no internal id leak |
| Destroy validation | Reuse `StoreFavoriteRequest` rules (both POST/DELETE need `type`,`ref`) | Inline `$request->validate()` in destroy | One source of validation truth |
| Frontend TDD | Ship without a test-first cycle; do NOT bundle vitest install | Install vitest in this change | Out of scope — installing/configuring a test runner is a separate prerequisite (proposal risk, High). Bundling it inflates the diff and mixes concerns. Backend stays Strict-TDD |

## Data Flow

    favoritos/page.tsx ──(token)──> api.favorites/addFavorite/removeFavorite
            │                                    │
            │                          request<T>() [Bearer token]
            │                                    ▼
            │              FavoriteController (auth:sanctum, user->_id)
            │                                    ▼
            │                  Favorite model ──> mongodb.favorites
            ▼
    on mount: read localStorage tracklife_favorites → POST each → removeItem (best-effort)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `app/Models/Favorite.php` | Create | Mongo model: `$connection='mongodb'`, `$collection='favorites'`, `$fillable=['user_id','type','ref']` |
| `app/Http/Requests/StoreFavoriteRequest.php` | Create | `authorize():true`; rules `type => required|in:food,recipe`, `ref => required|string` |
| `app/Http/Resources/FavoriteResource.php` | Create | Exposes `id`,`type`,`ref`,`created_at`; hides `user_id` |
| `app/Http/Controllers/Api/FavoriteController.php` | Create | `index/store/destroy`; mirrors `WorkoutController` style |
| `routes/api.php` | Modify | Add 3 routes inside `auth:sanctum` group (opens L37, closes L104), near Workout block |
| `tests/Feature/FavoriteTest.php` | Create | Mirror `WorkoutTest` (MongoTestCleanup trait) |
| `lib/api.ts` | Modify | Add `Favorite` type + `favorites`/`addFavorite`/`removeFavorite` methods |
| `app/app/nutricion/favoritos/page.tsx` | Modify | API-backed state + migration; remove stale localStorage NOTE/TODO comment |

## Interfaces / Contracts

Controller (mirrors `WorkoutController`):
```php
public function index(Request $request): JsonResponse   // ['favorites' => FavoriteResource::collection($rows)]
public function store(StoreFavoriteRequest $request): JsonResponse // firstOrCreate → 200|201, ['favorite' => new FavoriteResource($fav)]
public function destroy(StoreFavoriteRequest $request): JsonResponse // deleteWhere(user_id,type,ref) → response()->json(['message' => 'Favorito eliminado']) (200)
```
`store` uses `Favorite::firstOrCreate(['user_id'=>$uid,'type'=>$data['type'],'ref'=>$data['ref']])`; return 201 when `wasRecentlyCreated`, else 200.

Routes (inside `auth:sanctum` group):
```php
Route::get('/favorites', [FavoriteController::class, 'index']);
Route::post('/favorites', [FavoriteController::class, 'store']);
Route::delete('/favorites', [FavoriteController::class, 'destroy']);
```

HTTP contract:
- `GET /api/favorites` → 200 `{ "favorites": [ { "id": "...", "type": "food|recipe", "ref": "...", "created_at": "ISO8601|null" } ] }`
- `POST /api/favorites` body `{ "type": "food", "ref": "Avena" }` → 201 (new) or 200 (existing) `{ "favorite": { "id", "type", "ref", "created_at" } }`; 422 on invalid; 401 unauth
- `DELETE /api/favorites` body `{ "type": "recipe", "ref": "665..." }` → 200 `{ "message": "Favorite removed" }` (always, even if absent — idempotent); 422 invalid; 401 unauth. Never 204: `request<T>()` throws on an empty body, and the existing `WorkoutPlanController::destroy` sets the 200+`{message}` precedent

Frontend (`request<T>` wrapper — same shape as `meals`/`createWorkout`/`deleteWorkoutPlan`):
```ts
export type Favorite = { id: string; type: "food" | "recipe"; ref: string; created_at?: string };

favorites: (token: string) =>
  request<{ favorites: Favorite[] }>("/api/favorites", {}, token),
addFavorite: (token: string, type: "food" | "recipe", ref: string) =>
  request<{ favorite: Favorite }>("/api/favorites", { method: "POST", body: JSON.stringify({ type, ref }) }, token),
removeFavorite: (token: string, type: "food" | "recipe", ref: string) =>
  request<{ message?: string }>("/api/favorites", { method: "DELETE", body: JSON.stringify({ type, ref }) }, token),
```
Note: `removeFavorite` reads `{ message?: string }` because `destroy()` returns 200 with a JSON `{message}` body (not 204). This keeps the shared `request<T>` wrapper untouched — it always calls `res.json()`, so an empty 204 body would throw. Matches the existing `deleteWorkoutPlan`/`WorkoutPlanController::destroy` contract.

Page state: replace `Set<string>` of composite keys with the same `Set<string>` keyed by `favoriteKey()`, hydrated from `api.favorites()` (map each `{type,ref}` → `type==='food' ? food:${ref} : recipe:${ref}`). `toggle()` optimistically mutates the Set then calls `addFavorite`/`removeFavorite`; on failure, revert. Migration effect on mount: if `localStorage.tracklife_favorites` exists, parse composite keys, split each on the FIRST `:` (`type = key.slice(0, i)`, `ref = key.slice(i+1)`), `await addFavorite` each inside try/catch (a single failed POST must not abort the rest), then `localStorage.removeItem(FAVORITES_KEY)`.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Feature (backend) | See test plan below | PHPUnit, mirror `WorkoutTest`, `MongoTestCleanup` (`$mongoCollections = ['users','personal_access_tokens','favorites']`) |
| Frontend | Migration + toggle wiring | Manual/deferred — no runner (vitest absent) |

`FavoriteTest.php` method → scenario map:
- `test_favorites_index_requires_authentication` → GET without token → 401
- `test_store_favorite_requires_authentication` → POST without token → 401
- `test_store_fails_without_required_fields` → POST `{}` → 422, errors `type`,`ref`
- `test_store_rejects_invalid_type` → POST `{type:'x',ref:'a'}` → 422 error `type`
- `test_store_creates_new_favorite_returns_201` → 201, structure `favorite=>{id,type,ref}`
- `test_store_existing_favorite_returns_200` → POST same twice → 2nd is 200, only one row exists
- `test_favorite_resource_does_not_expose_user_id` → response `favorite` has `id`, not `user_id`
- `test_user_lists_only_their_favorites` → user A/B isolation, count asserts, no `user_id` key
- `test_destroy_removes_favorite_returns_200_with_message` → 200, `message` present, row gone
- `test_destroy_absent_favorite_still_returns_200` → 200 `{message}` when nothing matches (idempotent)
- `test_destroy_only_deletes_own_favorite` → user B's row untouched by user A delete

## Threat Matrix

Routing change is limited to adding three authed Laravel routes (no shell, subprocess, VCS/PR automation, or executable-file classification). The one relevant surface: `ref` as free-text input. Mitigation: `ref` travels only in JSON request bodies (POST/DELETE) and response JSON — never in a URL path or query — so path-injection/`%2F` decoding is structurally impossible. Validated as `required|string`. No other threat-matrix rows apply → N/A.

## Migration / Rollout

Client-side one-time migration only (see page state above). Additive `favorites` collection — no destructive migration. Rollback: revert `page.tsx` + `lib/api.ts` to restore localStorage; drop routes/model/controller; orphan/drop the `favorites` collection.

## Risk Check — composite key mapping

`food:${name}` → `{type:'food', ref:name}`; `recipe:${id}` → `{type:'recipe', ref:id}`. Split on the FIRST `:` only — food names may contain `:`, and `ref` absorbs everything after it, so no truncation/data loss. Because `ref` is carried in JSON bodies (POST/DELETE) and JSON responses (GET), URL-encoding concerns for special characters do NOT apply — GET returns a list and never places `ref` in the URL. Confirmed clean, zero data loss. Residual (documented deferred debt, not fixed here): food-name rename/collision silently unfavorites — pre-existing fragility carried over from `favoriteKey()`.

## Open Questions

- None. (The prior DELETE 204-vs-200 question is now resolved and settled in the Architecture Decisions table, Interfaces / Contracts, and Testing Strategy: `destroy()` returns 200 with `{"message": ...}`, matching the existing `WorkoutPlanController::destroy` precedent.)
