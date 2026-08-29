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

(Design document abbreviated for archive — full technical specifications in the original document.)
