# Tasks: Real Community Feed — Follow Graph + Like Toggle (P4.3)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~825 total (PR1a ~419, PR1b ~95, PR2 ~212) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1a (Follow backend) → PR1b (Follow frontend) → PR2 (like rename, indivisible + docs) |
| Delivery strategy | auto-forecast |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Follow backend CRUD + feed-visibility wiring (api-laravel) | PR1a (base: tracker) | `php artisan test --filter=FollowTest` / `--filter=FeedTest` | Manual curl w/ sanctum token vs api.test | Drop `follow` routes/model/request/controller; restore `'followers' => false` poster-only branch in `isVisibleTo()`; drop `follows` collection |
| 2 | Follow UI: button + profile/search integration (web3-next, lint+build only) | PR1b (base: PR1a branch) | N/A — no runner (`testing.web3-next.ready: false`) | `npm run build`; manual check at app.tracklife.test/comunidad/perfil, /buscar | Remove `FollowButton.tsx` + its two page integrations; backend untouched |
| 3 | kudos→like rename, indivisible (5 backend + 3 frontend files, one commit) + Roadmap doc | PR2 (base: PR1b branch) | `php artisan test --filter=FeedTest` then `npm run lint && npm run build` | Manual toggle Heart button vs deployed api.test | Revert all 8 files + doc together in one commit; persisted fields untouched, no data rollback |

## Phase 1: Follow Backend Foundation (api-laravel, Strict TDD) — PR1a

- [x] 1.1 Create `app/Models/Follow.php`: mongodb, `$collection='follows'`, `$fillable=['follower_id','followed_id']`.
- [x] 1.2 Create migration `2026_08_29_120000_add_unique_index_to_follows_collection.php`: unique `{follower_id,followed_id}`; `down()` drops it.
- [x] 1.3 Create `StoreFollowRequest.php`: merge route `{id}` as `followed_id`; reject self-follow via `Rule::notIn`.
- [x] 1.4 RED: `FollowTest.php` — auth required on all 3 routes incl. `GET /api/follows` (401).
- [x] 1.5 GREEN: register `GET /follows`, `POST/DELETE /users/{id}/follow` in `auth:sanctum` group; stub `FollowController`.
- [x] 1.6 RED: store scenarios — 201 new, 200 duplicate, 422 self-follow, 404 unknown target.
- [x] 1.7 GREEN: implement `store()` — `abort_if` unknown user, insert + catch `BulkWriteException` 11000.
- [x] 1.8 RED: destroy scenarios — 200 removed, 200 idempotent absent, only deletes caller's own row.
- [x] 1.9 GREEN: implement `destroy()` scoped to `follower_id`.
- [x] 1.10 RED: `index_returns_only_callers_following_ids`; `unique_index_rejects_duplicate_at_db_level`.
- [x] 1.11 GREEN: implement `index()` → `{following_ids: string[]}`.
- [x] 1.12 REFACTOR: `composer test --filter=FollowTest`; `./vendor/bin/pint`.

## Phase 2: Follow Feed-Visibility Wiring (api-laravel, Strict TDD) — PR1a

- [x] 2.1 RED in `FeedTest.php`: follower sees followers-only post; non-follower filtered + 404 on like; followed-but-not-following sees nothing; poster always sees own post.
- [x] 2.2 GREEN: `FeedService::isVisibleTo()` → `match` w/ `followsPoster()` + `$followingCache`; remove stale TODO (L165-171) + docblock clause (L104-107).
- [x] 2.3 Comment-only: update `DashboardTest.php` L114-118, L167-169 (follow-graph now real; assertions unchanged).
- [x] 2.4 REFACTOR: full `composer test` (FollowTest, FeedTest, DashboardTest green, no regressions).

## Phase 3: Follow UI (web3-next, no test runner — lint+build verified) — PR1b

- [x] 3.1 `lib/api.ts`: add `follows()`, `followUser()`, `unfollowUser()`.
- [x] 3.2 Create `components/FollowButton.tsx`: props `{userId, initialFollowing}`, pending state, no optimistic flip (D9), inline error text.
- [x] 3.3 `perfil/[id]/page.tsx`: hydrate `following_ids` via `api.follows()`; render `<FollowButton>`; hide on self-view.
- [x] 3.4 `buscar/page.tsx`: hydrate `following_ids` once at page level; render `<FollowButton>` per `UserCard`.
- [x] 3.5 Verify: `npm run lint && npm run build`.

## Phase 4: Like Toggle Rename — Backend (api-laravel, Strict TDD) — PR2, ships only with Phase 5

- [ ] 4.1 RED in `FeedTest.php`: `/kudos`→`/like` (L268,310,355), `kudos_count`→`likes_count` (L271,313), toggle-back case, per-viewer `liked` on `/api/feed`.
- [ ] 4.2 GREEN: `routes/api.php` rename; `FeedController::like()` symmetric toggle; `FeedService::formatPost()` emits `likes_count`/`liked`, drops `kudos_count`; `formatPosts` forwards `$viewer`.
- [ ] 4.3 REFACTOR: full `composer test`.

## Phase 5: Like Toggle Rename — Frontend (web3-next, lint+build verified) — PR2, same commit as Phase 4

- [ ] 5.1 `lib/api.ts`: `kudos`→`like`; `FeedPost` type drops `kudos_count`, adds `likes_count`/`liked`.
- [ ] 5.2 `FeedList.tsx`: `showKudos`→`showLikes`, `handleKudos`→`handleLike`, `kudosError`→`likeError`, Heart filled on `liked`.
- [ ] 5.3 `explorar/page.tsx` L24: `showKudos={false}`→`showLikes={false}`.
- [ ] 5.4 Verify: `npm run lint && npm run build`. Do not merge Phase 4 without Phase 5 (dead route / missing field otherwise).

## Phase 6: Docs — PR2

- [ ] 6.1 `docs/Roadmap TrackLife.md`: correct stale P4.3 section (feed/kudos are not mock).
