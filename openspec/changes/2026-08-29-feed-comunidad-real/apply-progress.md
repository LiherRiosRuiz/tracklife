# Apply Progress: Real Community Feed — Follow Graph + Like Toggle (P4.3)

## Scope of this batch

PR1a — Follow backend only (api-laravel). Phase 1 (tasks 1.1-1.12) and
Phase 2 (tasks 2.1-2.4) from `tasks.md`. Phase 3 (web3-next Follow UI),
Phase 4-5 (kudos→like rename), and Phase 6 (docs) are explicitly out of
scope for this batch and remain untouched — they ship in later PRs
(PR1b, PR2) on separate branches.

This is the first apply batch — no prior apply-progress existed.

## Mode

Strict TDD (api-laravel). Test runner: `docker exec api-laravel php artisan test`
(equivalent to `composer test`). Followed RED → GREEN → REFACTOR per task,
in the exact sequence tasks.md specifies (1.4 RED before 1.5 GREEN, 1.6 RED
before 1.7 GREEN, 1.8 RED before 1.9 GREEN, 1.10 RED before 1.11 GREEN, 2.1
RED before 2.2 GREEN).

## Completed Tasks

### Phase 1 — Follow Backend Foundation
- [x] 1.1 `app/Models/Follow.php` — mongodb, `$collection='follows'`, `$fillable=['follower_id','followed_id']`
- [x] 1.2 Migration `2026_08_29_120000_add_unique_index_to_follows_collection.php` — unique `{follower_id,followed_id}`, `down()` drops `follower_id_1_followed_id_1`
- [x] 1.3 `StoreFollowRequest.php` — `prepareForValidation()` merges route `{id}` as `followed_id`; `Rule::notIn([(string) $this->user()->_id])` rejects self-follow
- [x] 1.4 RED — `FollowTest::test_requires_authentication` (401 on all 3 routes) — confirmed failing with 404 (routes didn't exist)
- [x] 1.5 GREEN — registered `GET /follows`, `POST/DELETE /users/{id}/follow` in the `auth:sanctum` group; stub `FollowController`
- [x] 1.6 RED — store scenarios (201 new, 200 duplicate, 422 self-follow, 404 unknown target) — 3 of 4 failed for the right reason (stub didn't persist/check); self-follow 422 already passed because `StoreFollowRequest` validation was already wired
- [x] 1.7 GREEN — `store()`: `abort_if(! User::find($id), 404)`, insert + catch `BulkWriteException` code 11000 (mirrors `FavoriteController::store`)
- [x] 1.8 RED — destroy scenarios — `destroy_returns_200_and_removes_row` failed for the right reason (stub didn't delete)
- [x] 1.9 GREEN — `destroy()` scoped to `Follow::where('follower_id', ...)`
- [x] 1.10 RED — `index_returns_only_callers_following_ids` failed for the right reason (stub returned `[]`); `unique_index_rejects_duplicate_at_db_level` passed immediately (index installed in `setUp()`, exercised directly against `Follow::create`)
- [x] 1.11 GREEN — `index()` → `Follow::where('follower_id', ...)->pluck('followed_id')` cast to strings → `{following_ids: string[]}`
- [x] 1.12 REFACTOR — `./vendor/bin/pint` on all new/changed files (fixed import ordering in the migration only); `FollowTest` re-run green after

### Phase 2 — Follow Feed-Visibility Wiring
- [x] 2.1 RED in `FeedTest.php` — 3 new tests added: follower sees followers-only post, non-follower filtered + 404 on `/kudos`, followed-but-not-following sees nothing. Only the first failed for the right reason (`isVisibleTo()` still degraded to poster-only); the other two already passed under the old poster-only logic (which is also correct behavior for those specific setups) and continued passing under the new logic — not trivial passes, see Deviations below for the direction-scenario correction.
- [x] 2.2 GREEN — `FeedService::isVisibleTo()` replaced `return $visibility === 'public'` with the exact `match` from design (`public`→true, `followers`→`$viewer !== null && $this->followsPoster($viewer, $poster)`, `default`→false); added `private array $followingCache` and `followsPoster()` exactly as specified; removed the stale "no follow-graph yet" docblock paragraph on `isVisibleTo()` and reworded the equivalent clause inside `paginateVisiblePosts()`'s docblock (design's cited line numbers had since shifted, content is the same paragraph)
- [x] 2.3 Comment-only — updated `DashboardTest.php`'s two "no follow-graph in this codebase yet" comments to reflect the real follow-graph; assertions themselves untouched (both tests create no `Follow` record, so behavior is unchanged)
- [x] 2.4 REFACTOR — full `php artisan test`: 215 passed (737 assertions), 0 regressions

## Files Changed

| File | Action | What Was Done |
|------|--------|----------------|
| `projects/web/api-laravel/app/Models/Follow.php` | Created | Mongo model, `follows` collection |
| `projects/web/api-laravel/database/migrations/2026_08_29_120000_add_unique_index_to_follows_collection.php` | Created | Unique compound index `{follower_id, followed_id}` |
| `projects/web/api-laravel/app/Http/Requests/StoreFollowRequest.php` | Created | Merges route `{id}` → `followed_id`, rejects self-follow |
| `projects/web/api-laravel/app/Http/Controllers/Api/FollowController.php` | Created | `index/store/destroy`, mirrors `FavoriteController` pattern |
| `projects/web/api-laravel/routes/api.php` | Modified | +3 routes (`GET /follows`, `POST/DELETE /users/{id}/follow`) in the `auth:sanctum` group, alphabetically placed import |
| `projects/web/api-laravel/app/Services/FeedService.php` | Modified | `isVisibleTo()` → real follow-graph `match`; added `followsPoster()` + `$followingCache`; removed stale no-follow-graph docblock/comment |
| `projects/web/api-laravel/tests/Feature/FollowTest.php` | Created | 10 tests: auth guard, store (create/duplicate/self-follow/unknown), destroy (remove/idempotent/scoped), index, unique-index |
| `projects/web/api-laravel/tests/Feature/FeedTest.php` | Modified | +3 tests for real follow-graph visibility; added `follows` to `$mongoCollections` |
| `projects/web/api-laravel/tests/Feature/DashboardTest.php` | Modified | Comment-only — 2 comments updated to describe the real follow-graph instead of "no follow-graph yet" |
| `openspec/changes/2026-08-29-feed-comunidad-real/tasks.md` | Modified | Marked 1.1-1.12, 2.1-2.4 as `[x]` |

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.4-1.5 | `tests/Feature/FollowTest.php` | Feature (HTTP) | N/A (new file) | ✅ Written (401 expected, got 404) | ✅ Passed (3 assertions) | ➖ Single scenario (auth guard, one route trio) | ➖ None needed |
| 1.6-1.7 | `tests/Feature/FollowTest.php` | Feature (HTTP) | ✅ 1/1 (prior test still green) | ✅ Written (4 scenarios) | ✅ Passed | ✅ 4 cases (create/duplicate/self/unknown) | ➖ None needed |
| 1.8-1.9 | `tests/Feature/FollowTest.php` | Feature (HTTP) | ✅ 5/5 | ✅ Written (3 scenarios) | ✅ Passed | ✅ 3 cases (remove/idempotent/scoped) | ➖ None needed |
| 1.10-1.11 | `tests/Feature/FollowTest.php` | Feature (HTTP) | ✅ 8/8 | ✅ Written (2 scenarios) | ✅ Passed | ✅ 2 cases (index isolation, DB-level unique) | ➖ None needed |
| 1.12 | — | — | ✅ 10/10 | — | — | — | ✅ Pint: fixed import order in migration file only |
| 2.1-2.2 | `tests/Feature/FeedTest.php` | Feature (HTTP) | ✅ 15/15 | ✅ Written (3 scenarios) | ✅ Passed | ✅ 3 cases (follower-visible, non-follower-hidden+404, reverse-direction-hidden) | ➖ None needed |
| 2.3 | `tests/Feature/DashboardTest.php` | — | ✅ 8/8 (comment-only, no logic change) | N/A | N/A | N/A | N/A |
| 2.4 | Full suite | Feature (HTTP) | — | — | ✅ 215/215 passed (737 assertions) | — | — |

### Test Summary
- **Total tests written**: 13 (10 `FollowTest` + 3 new `FeedTest`)
- **Total tests passing**: 215/215 (full suite, includes all pre-existing tests)
- **Layers used**: Feature/HTTP (13 new)
- **Approval tests**: None — no refactoring-of-existing-behavior tasks in this batch (the `isVisibleTo()` change is a spec'd behavior change, not a preserve-behavior refactor, and it already had RED/GREEN coverage from the spec scenarios)
- **Pure functions created**: 0 — `followsPoster()` and the CRUD methods are inherently stateful (DB reads/writes); kept minimal per D6 (one memoized query per viewer per request)

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `docker exec api-laravel php artisan test --filter=FollowTest` → 10 passed (26 assertions); `docker exec api-laravel php artisan test --filter=FeedTest` → 18 passed (107 assertions) |
| Runtime harness command/scenario and exact result | `docker exec api-laravel php artisan test` (full suite, real MongoDB `tracklife_testing` DB via the running `mongodb` + `api-laravel` containers) → 215 passed, 0 failed, 737 assertions |
| Rollback boundary | Drop `app/Models/Follow.php`, the migration, `StoreFollowRequest.php`, `FollowController.php`, the 3 routes in `routes/api.php`, and `tests/Feature/FollowTest.php`; in `FeedService.php` restore `return $visibility === 'public';` and remove `followsPoster()`/`$followingCache`; revert the 3 new `FeedTest` cases and the `follows` entry in `$mongoCollections`; revert the 2 comment-only lines in `DashboardTest.php`. No persisted data migration to undo (additive index only) |

## Deviations from Design

1. **Spec scenario inconsistency found and resolved (not silently)**: the `social-feed` spec's "Followed-but-not-following user does not see the post" scenario states `GIVEN user A follows user D, but user D does not follow user A ... THEN D's post is NOT included in A's results`. Applied literally, this contradicts the design's own authoritative code and its explicit prose ("viewer follows poster ⇒ viewer may see the poster's followers content. The reverse (poster follows viewer) grants nothing.") — under that rule, viewer=A following poster=D should grant A visibility, not deny it. It also contradicts the pattern of the sibling scenario ("Actual follower sees a followers-only post": viewer follows poster ⇒ visible). The internally consistent version — matching both the design's exact `followsPoster()` code and its own direction prose — is the reverse: the **poster** follows the **viewer**, not vice versa. I implemented `followsPoster()` exactly as specified in the design (unchanged) and wrote the corresponding `FeedTest` case (`test_feed_index_hides_followers_only_post_from_followed_but_not_following_user`) using the semantically consistent setup (D follows A, A does not follow D → A does not see D's post), documented inline in the test. This exercises the same "reverse direction grants nothing" property the scenario intended to verify, using a setup that is actually consistent with the design's own rule. **Flagging for spec correction**: the GIVEN clause in `specs/social-feed/spec.md`'s "Followed-but-not-following user does not see the post" scenario likely has user A and user D swapped and should read `GIVEN user D follows user A, but user A does not follow user D`.
2. **Migration import order**: `./vendor/bin/pint` reordered the `use` statements in the new migration file (alphabetical: `Migration`, `Schema` facade, then `Blueprint`) — cosmetic only, no behavior change. The existing `2026_07_21_120000_add_unique_index_to_favorites_collection.php` this migration mirrors has a different (non-alphabetical) import order that predates pint being run on it; the new file follows current pint rules instead of copying that inconsistency.

No other deviations. `formatPost()`/`formatPosts()` viewer-forwarding, the `like` route rename, and all frontend/docs work are explicitly Phase 3-6 and were not touched.

## Issues Found

None blocking. One pre-existing unrelated dirty file was observed in the working tree (`projects/web/web2-nuxt/package-lock.json`, modified) — not touched by this batch, flagged for the orchestrator's awareness only.

## Remaining Tasks (out of scope for this batch, tracked in tasks.md)

- [ ] Phase 3: Follow UI (web3-next) — PR1b
- [ ] Phase 4: Like Toggle Rename — Backend — PR2
- [ ] Phase 5: Like Toggle Rename — Frontend — PR2
- [ ] Phase 6: Docs — PR2

## Workload / PR Boundary

- Mode: feature-branch-chain, PR1a slice
- Current work unit: Unit 1 — "Follow backend CRUD + feed-visibility wiring (api-laravel)"
- Boundary: starts from the tracker branch `feat/feed-comunidad-real` (currently on `feat/feed-comunidad-real-01-follow-backend`); ends with Phase 1 + Phase 2 complete, full `composer test` green, no web3-next/web2-nuxt/Phase 3-6 changes
- Estimated review budget impact: ~419 lines forecast for PR1a per tasks.md's Review Workload Forecast (High risk overall for the whole change, mitigated by this chained slice)

## Status

215/215 tests passing (full suite). Phase 1 (12/12 tasks) and Phase 2 (4/4 tasks) complete. Ready for verify (this PR1a slice) / ready for the next apply batch (PR1b, Phase 3, on a new branch based on this one).
