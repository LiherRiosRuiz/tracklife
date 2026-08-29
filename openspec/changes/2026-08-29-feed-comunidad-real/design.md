# Design: Real Community Feed — Follow Graph + Like Toggle (P4.3)

Subprojects: **api-laravel**, **web3-next**. Repo paths below are relative to `projects/web/{subproject}/` unless stated otherwise.

## Technical Approach

Port the proven P4.2 `Favorite` vertical slice (Mongo model + compound unique index migration + FormRequest + controller + `auth:sanctum` routes + PHPUnit feature test re-installing the index in `setUp()`) to a `follows` collection. `FeedService::isVisibleTo()` replaces its `return $visibility === 'public'` with a three-way `match` whose `'followers'` arm calls a request-memoized follow check — `paginateVisiblePosts()`'s over-fetch/widen loop and `formatPosts()`'s batch-author load are untouched in shape. The `kudos → like` rename is a single cross-service commit: 5 backend files + 3 frontend files, never split.

## Architecture Decisions

| # | Decision | Choice | Rejected alternative | Rationale |
|---|---|---|---|---|
| D1 | Follow storage | `follows` collection `{follower_id, followed_id}` + unique compound index via migration | Embedded `following_ids` on `User` | Proposal D1; mirrors `favorites` migration `2026_07_21_120000` exactly |
| D2 | Route shape | Path-keyed `POST`/`DELETE /api/users/{id}/follow` | Body-keyed `/api/follows` (Favorite precedent) | `{id}` is a Mongo ObjectId hex — safe as a path segment. Favorite is body-keyed only because `ref` is free text. Path shape matches the neighbouring `/api/users/{id}/profile`, `/api/challenges/{id}/join` |
| D3 | Follow-state hydration | `GET /api/follows` → `{following_ids: string[]}` (`FollowController::index`) | `is_following` flag on `UserProfileController::show` + `UserSearchController::search` | UI needs correct button state on load. Index is 1 request per page and mirrors how `favoritos/page.tsx` hydrates a `Set<string>` from `GET /api/favorites`. The flag alternative modifies two unrelated controllers plus `UserProfileTest`/`UserSearchTest`, and costs one follow lookup per search hit. **Scope refinement**: the proposal's Affected Areas listed only store/destroy |
| D4 | Status codes | 201 new follow / 200 duplicate / 422 self-follow / 404 unknown target; `DELETE` always 200 | 409 on duplicate; 204 on delete | Proposal D4 idempotency. Never 204: `lib/api.ts request<T>()` always calls `res.json()` and throws on an empty body (settled in the P4.2 design) |
| D5 | Duplicate handling | Insert always, catch `BulkWriteException` code `11000` | `firstOrCreate` | Copies `FavoriteController::store` verbatim — find-then-insert races across PHP-FPM workers; the unique index is the single source of truth |
| D6 | Follow check cost | Instance-level memo: one `pluck('followed_id')` per viewer per request | `->exists()` per candidate post | `paginateVisiblePosts` may call `formatPosts` up to `MAX_WIDEN_ATTEMPTS` (3) times over windows of `needed*4*attempt` posts. A per-post query would be O(window); the memo is O(1) queries and keeps the loop's shape untouched |
| D7 | API response naming | `formatPost()` emits `likes_count` + `liked`, **drops** `kudos_count`; persisted `kudos_count`/`kudos_user_ids` unchanged | Keep `kudos_count` in JSON | Proposal D2: "like" is user-facing everywhere; persisted names stay to avoid a data migration. Breaking for clients — shipped in the same unit (see Rename Sequencing) |
| D8 | Deprecated `kudos` alias | Not taken | Alias `/feed/{id}/kudos` → `like()` for one release | The response shape changes too (D7), so an alias would not keep an old client working; it would only add a dead route |
| D9 | Frontend UI mode | No optimistic UI. Button `disabled` while in flight, state set from the server response, error surfaced inline | Optimistic flip + revert (the `favoritos/page.tsx` pattern) | `web3-next` has no test runner (config `testing.web3-next.ready: false`), so a revert branch would ship untested. Both endpoints return authoritative state, so pessimistic UI costs one render delay and zero branches |

## Data Flow

    perfil/[id] + buscar ──GET /api/follows──> FollowController::index ──> follows
            │  POST|DELETE /api/users/{id}/follow ──> FollowController::store/destroy
            ▼
    FeedList ──POST /api/feed/{id}/like──> FeedController::like ──> social_posts
            ▲                                       │
            └────────── {liked, likes_count, post} ─┘

    GET /api/feed ─> paginateVisiblePosts ─> formatPosts($candidates, $viewer)
                                                   │
                                          isVisibleTo(post, poster, viewer)
                                                   │  'followers'
                                                   ▼
                                    followsPoster() ── memo ──> follows (1 query/request)

## File Changes

| File | Action | Description |
|---|---|---|
| `api-laravel/app/Models/Follow.php` | Create | `$connection='mongodb'`, `$collection='follows'`, `$fillable=['follower_id','followed_id']` |
| `api-laravel/database/migrations/2026_08_29_120000_add_unique_index_to_follows_collection.php` | Create | `$collection->unique(['follower_id','followed_id'])`; `down()` drops `follower_id_1_followed_id_1`. Mirrors the favorites migration |
| `api-laravel/app/Http/Requests/StoreFollowRequest.php` | Create | `prepareForValidation()` merges route `{id}` as `followed_id`; rules `required|string` + `Rule::notIn([(string) $this->user()->_id])` → 422 on self-follow |
| `api-laravel/app/Http/Controllers/Api/FollowController.php` | Create | `index/store/destroy`; `follower_id` always from `$request->user()->_id` |
| `api-laravel/routes/api.php` | Modify | +3 routes in the `auth:sanctum` group near `/users/{id}/profile` (L55); L67 `kudos` → `like` |
| `api-laravel/app/Services/FeedService.php` | Modify | `isVisibleTo()` `match`; `followsPoster()` + `$followingCache`; `formatPost()` gains `?User $viewer`, emits `likes_count`/`liked`; remove the stale TODO block (L165-171) and the "no follow-graph yet" clause in the `paginateVisiblePosts` docblock (L104-107) |
| `api-laravel/app/Http/Controllers/Api/FeedController.php` | Modify | `kudos()` → `like()` toggle; pass `$request->user()` as `formatPost`'s viewer in `store`/`like`/`comment` |
| `api-laravel/tests/Feature/FollowTest.php` | Create | Mirrors `FavoriteTest` incl. the index-reinstall `setUp()` |
| `api-laravel/tests/Feature/FeedTest.php` | Modify | `/kudos` → `/like` (L268, L310, L355); `post.kudos_count` → `post.likes_count` (L271, L313); real follow-graph visibility cases; toggle-back case |
| `api-laravel/tests/Feature/DashboardTest.php` | Modify | **Comment-only**: L114-118 and L167-169 claim "no follow-graph in this codebase yet". Assertions stay green (neither user follows the other). Not in the proposal's Affected Areas |
| `web3-next/lib/api.ts` | Modify | `FeedPost` L34 field swap; `kudos` → `like` (L182-183); `follows`/`followUser`/`unfollowUser` |
| `web3-next/components/FeedList.tsx` | Modify | `showKudos`→`showLikes`, `handleKudos`→`handleLike`, `kudosError`→`likeError`, `post.likes_count`, Heart filled when `post.liked` |
| `web3-next/app/explorar/page.tsx` | Modify | **One line** (L24): `showKudos={false}` → `showLikes={false}`. Compile-required by the prop rename; the page's 401 bug stays descoped |
| `web3-next/components/FollowButton.tsx` | Create | Shared presentational+action button used by both community pages |
| `web3-next/app/app/comunidad/perfil/[id]/page.tsx` | Modify | `<FollowButton>` under the profile card |
| `web3-next/app/app/comunidad/buscar/page.tsx` | Modify | `<FollowButton>` in `UserCard`; page hydrates `following_ids` once |
| `docs/Roadmap TrackLife.md` | Modify | P4.3 no longer describes the feed as mock |

## Interfaces / Contracts

### Follow routes (inside the `auth:sanctum` group)

```php
Route::get('/follows', [FollowController::class, 'index']);
Route::post('/users/{id}/follow', [FollowController::class, 'store']);
Route::delete('/users/{id}/follow', [FollowController::class, 'destroy']);
```

`store(StoreFollowRequest $request, string $id)`: `abort_if(! User::find($id), 404)` **before** the insert (unknown target is 404, not 422 — self-follow is the only 422); then `Follow::create([...])` inside the `BulkWriteException` 11000 try/catch of D5. `destroy` deletes only rows whose `follower_id` is the caller's id.

### Next.js ↔ Laravel contract

| Endpoint | Request | Response |
|---|---|---|
| `GET /api/follows` | — | 200 `{"following_ids": ["<userId>", ...]}` (caller's own list only) |
| `POST /api/users/{id}/follow` | empty body | 201 `{"following": true}` new · 200 `{"following": true}` duplicate · 422 `{errors:{followed_id:[...]}}` self · 404 unknown · 401 unauth |
| `DELETE /api/users/{id}/follow` | empty body | 200 `{"following": false}` always (also when no row existed) · 404 unknown target · 401 |
| `POST /api/feed/{id}/like` | empty body | 200 `{"liked": bool, "likes_count": int, "post": FeedPost}` · 404 missing **or** not visible (indistinguishable, per `findVisiblePostOrAbort`) |
| `GET /api/feed`, `POST /api/feed`, `POST /api/feed/{id}/comments`, `GET /api/dashboard.feed_preview` | unchanged | each `FeedPost` now carries `likes_count` + `liked`; `kudos_count` is **gone** |

`liked`/`likes_count` are duplicated at the top level of the like response (Proposal D3 literal shape) and inside `post` (preserves `FeedList`'s existing replace-in-place). Deliberate.

```ts
export type FeedPost = { /* ... */ likes_count: number; liked: boolean; /* kudos_count removed */ };

like: (token: string, postId: string) =>
  request<{ liked: boolean; likes_count: number; post: FeedPost }>(`/api/feed/${postId}/like`, { method: "POST" }, token),
follows: (token: string) =>
  request<{ following_ids: string[] }>("/api/follows", {}, token),
followUser: (token: string, id: string) =>
  request<{ following: boolean }>(`/api/users/${id}/follow`, { method: "POST" }, token),
unfollowUser: (token: string, id: string) =>
  request<{ following: boolean }>(`/api/users/${id}/follow`, { method: "DELETE" }, token),
```

### `FeedService::isVisibleTo()` — exact replacement

The guard clauses (null poster → false; viewer is poster → true; no `TYPE_PRIVACY_KEY` entry → true) and the signature are unchanged. Only the final return and the docblock change:

```php
-        return $visibility === 'public';
+        return match ($visibility) {
+            'public' => true,
+            'followers' => $viewer !== null && $this->followsPoster($viewer, $poster),
+            default => false,   // 'private' and any unknown value: poster only
+        };
```

```php
/** @var array<string, array<string, true>> viewerId => set of followed ids */
private array $followingCache = [];

private function followsPoster(User $viewer, User $poster): bool
{
    $viewerId = (string) $viewer->_id;

    $this->followingCache[$viewerId] ??= array_fill_keys(
        array_map('strval', Follow::where('follower_id', $viewerId)->pluck('followed_id')->all()),
        true
    );

    return isset($this->followingCache[$viewerId][(string) $poster->_id]);
}
```

Direction: **viewer follows poster** ⇒ viewer may see the poster's `followers` content. The reverse (poster follows viewer) grants nothing. The memo is keyed by viewer id even though one request has one viewer, so a reused instance cannot cross-contaminate. `FeedService` is container-resolved per request, so the cache never outlives a request; an in-process unit test that follows and re-queries the *same* instance would read stale data — feature tests issue separate HTTP requests and are unaffected.

### `kudos → like` rename — diff shape (one commit, never split)

`FeedController::like()` replaces the add-only `if (! in_array(...))` block with a symmetric toggle:

```php
$liked  = in_array($userId, $likes, true);
$likes  = $liked ? array_values(array_diff($likes, [$userId])) : [...$likes, $userId];
$post->kudos_user_ids = $likes;          // persisted names unchanged (D7)
$post->kudos_count    = count($likes);
$post->save();

return response()->json([
    'liked' => ! $liked,
    'likes_count' => count($likes),
    'post' => $this->feedService->formatPost($post->fresh(), $poster, $request->user()),
]);
```

`formatPost(SocialPost $post, ?User $user = null, ?User $viewer = null)` swaps `'kudos_count' => $post->kudos_count ?? 0` for `'likes_count' => $post->kudos_count ?? 0` and adds `'liked' => $viewer !== null && in_array((string) $viewer->_id, $post->kudos_user_ids ?? [], true)`; `formatPosts` forwards its existing `$viewer` at L80.

Ordering inside the single commit: (1) `FeedTest` RED on `/like` + `likes_count`, (2) `routes/api.php` + `FeedController` + `FeedService` GREEN, (3) `lib/api.ts`, (4) `FeedList.tsx`, (5) `explorar/page.tsx`, (6) `npm run lint && npm run build`. Merging (2) without (3)-(5) leaves the deployed frontend POSTing a dead `/kudos` and reading an absent `kudos_count`; merging (3)-(5) first breaks likes against the deployed API. Revert is the same set, together.

### Follow button integration (web3-next)

`components/FollowButton.tsx` — client component, props `{ userId: string; initialFollowing: boolean }`:

- Local `following` + `pending` state. `onClick` → `pending=true` → `api.followUser`/`unfollowUser` → `setFollowing(res.following)` → `pending=false`. On throw: leave `following` untouched, set a local error string. No optimistic flip (D9).
- Renders the existing `Button` from `components/ui`: `variant="primary"` label `Seguir` when not following, `variant="secondary"` label `Siguiendo` when following; `disabled={pending || !token}`.
- Error copy is rendered as `<p className="text-xs text-danger">` beside the button, matching `FeedList`'s error line. A 401 shows the API message; nothing is retried automatically.

`perfil/[id]/page.tsx`: add a second `useApiData(() => api.follows(token!), [token], { enabled: !!token })` alongside the existing `api.userProfile(id)` call, and render `<FollowButton userId={id} initialFollowing={followingIds.includes(id)} />` inside the profile `Card`, below the streak row. Self-view guard: hide the button when `id === currentUser.id` (`useAuth()`), so the 422 path is unreachable from the UI.

`buscar/page.tsx`: hydrate `following_ids` once at page level (same `useApiData`, not per card — one request for the whole result list), pass `initialFollowing` down through `UserCard` next to the existing "Ver perfil" `Button`. The search list itself already excludes nobody, so the same self-view guard applies per card.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Feature (api-laravel) | Follow CRUD, feed visibility, like toggle | PHPUnit, Strict TDD (RED first). `FollowTest` mirrors `FavoriteTest`, `$mongoCollections = ['users','personal_access_tokens','follows']`, `setUp()` re-installs the unique index because `MongoTestCleanup` drops the whole collection |
| Feature (api-laravel) | Regression | `DashboardTest`, `FeedTest` remain green; `composer test` full suite |
| Frontend (web3-next) | Follow button + like toggle | Manual + `npm run lint` + `npm run build` only — no runner installed (config `testing.web3-next.ready: false`). Flagged, not silently skipped |

`FollowTest` method map: `requires_authentication` (401 on all three) · `store_creates_follow_returns_201` · `store_duplicate_returns_200_and_single_row` · `store_rejects_self_follow_422` · `store_unknown_user_returns_404` · `destroy_returns_200_and_removes_row` · `destroy_absent_follow_still_returns_200` · `destroy_only_removes_own_follow` · `index_returns_only_callers_following_ids` · `unique_index_rejects_duplicate_at_db_level` (expects `BulkWriteException` / `E11000`).

`FeedTest` additions: follower sees a `followers`-visibility post · non-follower gets it filtered from `/api/feed` and 404 on `/like` · followed-but-not-following viewer does **not** see it (direction assertion) · poster always sees own post · like toggles `liked` true→false and `likes_count` back to its prior value · `liked` is per-viewer in `/api/feed`.

## Threat Matrix

Routing is the only applicable boundary: 3 new authed routes + 1 renamed route. No shell, subprocess, VCS/PR automation, or executable-file classification → those rows are **N/A**.

| Row | Status | Expected behavior / planned RED test |
|---|---|---|
| Untrusted input in a route path (`{id}`) | Applicable | `{id}` reaches only `User::find()` / an equality filter, cast `(string)`; no regex, no `$where`. Unknown id → 404. Test: `store_unknown_user_returns_404` |
| Authorization bypass / forged identity | Applicable | `follower_id` is always `$request->user()->_id`, never client-supplied; there is no request field that can set it. Test: `destroy_only_removes_own_follow`, `index_returns_only_callers_following_ids` |
| Privacy/data exposure | Applicable | `GET /api/follows` returns only the caller's own list; no follower lists, counts, or reverse lookups are exposed. Feed 404s stay indistinguishable between "missing" and "hidden" (existing `findVisiblePostOrAbort` contract, unchanged) |
| Privilege escalation via visibility change | Applicable | `followers` grants read only; `private` still resolves to poster-only via the `default` arm. Test: followed-but-not-following viewer sees nothing |
| Rate limiting | Applicable | Inherits the api-wide `throttle:60,1` from `bootstrap/app.php`; no per-route override needed for a follow toggle |
| Shell / subprocess / VCS / executable classification | N/A | No such surface in this change |

## Migration / Rollout

Additive. Run `php artisan migrate` to create the `follows` unique index (creating a Mongo index on an absent collection creates the collection — safe). No document migration: `kudos_count`/`kudos_user_ids` keep their persisted names (D7). Rollback per the proposal's two paths — the follow slice reverts independently (restore the `'public'`-only return in `isVisibleTo`, drop routes/model/request/controller, orphan the `follows` collection); the like slice reverts as the single 8-file unit described above.

## Open Questions

- None blocking. Two scope refinements over the proposal's Affected Areas table are decided here and must be carried into tasks: `FollowController::index` + `GET /api/follows` (D3), and the one-line `showKudos` prop rename in `web3-next/app/explorar/page.tsx` plus comment-only edits in `tests/Feature/DashboardTest.php`.
