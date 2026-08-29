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

- [x] Phase 3: Follow UI (web3-next) — PR1b — completed in the PR1b batch below
- [ ] Phase 4: Like Toggle Rename — Backend — PR2
- [ ] Phase 5: Like Toggle Rename — Frontend — PR2
- [ ] Phase 6: Docs — PR2

## Workload / PR Boundary

- Mode: feature-branch-chain, PR1a slice
- Current work unit: Unit 1 — "Follow backend CRUD + feed-visibility wiring (api-laravel)"
- Boundary: starts from the tracker branch `feat/feed-comunidad-real` (currently on `feat/feed-comunidad-real-01-follow-backend`); ends with Phase 1 + Phase 2 complete, full `composer test` green, no web3-next/web2-nuxt/Phase 3-6 changes
- Estimated review budget impact: ~419 lines forecast for PR1a per tasks.md's Review Workload Forecast (High risk overall for the whole change, mitigated by this chained slice)

## Status (as of PR1a batch)

215/215 tests passing (full suite). Phase 1 (12/12 tasks) and Phase 2 (4/4 tasks) complete. Ready for verify (this PR1a slice) / ready for the next apply batch (PR1b, Phase 3, on a new branch based on this one).

---

# PR1b batch — Follow UI (web3-next)

## Scope of this batch

Phase 3 (tasks 3.1-3.5) from `tasks.md`: Follow UI on `web3-next` only.
Branch `feat/feed-comunidad-real-02-follow-ui`, based on
`feat/feed-comunidad-real-01-follow-backend` (PR1a, merged in). Did not
touch `api-laravel` or `web2-nuxt`. Did not touch Phase 4/5/6
(kudos→like rename + docs) — that ships in a separate later PR (PR2) on
this chain.

## Mode

Standard (no TDD). Confirmed via `openspec/config.yaml`:
`testing.web3-next.ready: false` (no vitest/jest installed) — Strict TDD
does not apply here per the skill's mode-resolution rule ("IF strict_tdd:
true AND test runner exists" is false for web3-next even though the
global `strict_tdd: true` marker is set). Verified with `npm run lint`
and `npm run build` instead, per the design's Testing Strategy row for
web3-next.

## Completed Tasks

### Phase 3 — Follow UI (web3-next)
- [x] 3.1 `lib/api.ts` — added `follows(token)` → `GET /api/follows`, `followUser(token, id)` → `POST /api/users/{id}/follow`, `unfollowUser(token, id)` → `DELETE /api/users/{id}/follow`. Signatures match the design's `Next.js <-> Laravel contract` section exactly.
- [x] 3.2 Created `components/FollowButton.tsx` — client component, props `{ userId: string; initialFollowing: boolean }`. Local `following`/`pending`/`error` state; `onClick` sets `pending=true`, calls `api.followUser`/`unfollowUser` based on current `following`, sets `following` from the server response, clears `pending`; on throw, `following` is left untouched and a local error string is set (no optimistic flip, per D9). Renders `Button` from `components/ui` (`variant="primary"`/label `Seguir` when not following, `variant="secondary"`/label `Siguiendo` when following, `disabled={pending || !token}`); error rendered as `<p className="text-xs text-danger">`, matching `FeedList.tsx`'s existing error-line convention.
- [x] 3.3 `perfil/[id]/page.tsx` — added `useAuth()` for `token` + `currentUser`; added a second `useApiData(() => api.follows(token!), [token], { enabled: !!token })` alongside the existing `userProfile` call; renders `<FollowButton userId={id} initialFollowing={followingIds.includes(id)} />` inside the profile `Card`, directly below the streak row; hidden via `{!isSelf && ...}` where `isSelf = currentUser?.id === id`, making the self-follow 422 path unreachable from the UI as specified.
- [x] 3.4 `buscar/page.tsx` — added one page-level `useApiData(() => api.follows(token!), [token], { enabled: !!token })` (single request for the whole result list, not per card); `UserCard` now takes `isFollowing`/`isSelf` props and renders `<FollowButton userId={user.id} initialFollowing={isFollowing} />` next to the existing "Ver perfil" `Button`, guarded by `!isSelf` (`currentUser?.id === user.id`) per card.
- [x] 3.5 Verify — `npm run lint`: 0 errors, 5 pre-existing `@next/next/no-img-element` warnings on files/lines untouched by this batch (`perfil/[id]/page.tsx:53` and `buscar/page.tsx:35` are pre-existing `<img>` tags this batch did not modify). `npm run build`: compiled successfully, TypeScript check passed, all 47 routes generated including `/app/comunidad/buscar` (static) and `/app/comunidad/perfil/[id]` (dynamic).

## Files Changed

| File | Action | What Was Done |
|------|--------|----------------|
| `projects/web/web3-next/lib/api.ts` | Modified | Added `follows()`, `followUser()`, `unfollowUser()` methods to the `api` object |
| `projects/web/web3-next/components/FollowButton.tsx` | Created | Presentational + action follow/unfollow button, pending state, inline error, no optimistic UI |
| `projects/web/web3-next/app/app/comunidad/perfil/[id]/page.tsx` | Modified | Hydrates `following_ids`, renders `<FollowButton>`, self-view guard via `useAuth()` |
| `projects/web/web3-next/app/app/comunidad/buscar/page.tsx` | Modified | Page-level `following_ids` hydration, `UserCard` renders `<FollowButton>` per result with self-view guard |
| `openspec/changes/2026-08-29-feed-comunidad-real/tasks.md` | Modified | Marked 3.1-3.5 as `[x]` |

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | N/A — no test runner installed for web3-next (`testing.web3-next.ready: false`), per design's Testing Strategy row and tasks.md's Unit 2 row ("N/A — no runner") |
| Runtime harness command/scenario and exact result | `npm run lint` → 0 errors (5 pre-existing unrelated warnings); `npm run build` → "Compiled successfully", TypeScript check passed, static/dynamic route generation succeeded for all 47 routes incl. the two touched pages |
| Rollback boundary | Remove `components/FollowButton.tsx`; revert the 3 added methods in `lib/api.ts`; revert `perfil/[id]/page.tsx` and `buscar/page.tsx` to their pre-batch versions (drop the `useAuth`/second `useApiData`/`FollowButton` additions and the `UserCard` prop changes). Backend (`api-laravel`) untouched; PR1a's follow endpoints remain available but simply unconsumed if reverted |

## Deviations from Design

None. Implementation matches the design's "Follow button integration (web3-next)" section verbatim: props, state machine, button variants/labels, disabled condition, error styling, hydration pattern (`useApiData` alongside existing calls, one page-level fetch for `buscar` rather than per-card), and the self-view guard on both pages.

## Issues Found

None blocking. The pre-existing `web2-nuxt/package-lock.json` dirty-file note from the PR1a batch is unrelated and still untouched by this batch.

## Workload / PR Boundary (PR1b)

- Mode: feature-branch-chain, PR1b slice
- Current work unit: Unit 2 — "Follow UI: button + profile/search integration (web3-next, lint+build only)"
- Boundary: starts from branch `feat/feed-comunidad-real-02-follow-ui` (base: `feat/feed-comunidad-real-01-follow-backend`); ends with Phase 3 complete, `npm run lint` and `npm run build` both green, no api-laravel/web2-nuxt/Phase 4-6 changes
- Estimated review budget impact: ~95 lines forecast for PR1b per tasks.md's Review Workload Forecast (well under the 400-line budget)

## Status (as of PR1b batch)

Phase 1 (12/12), Phase 2 (4/4), Phase 3 (5/5) tasks complete — 21/25 total
tasks in `tasks.md` done. `npm run lint` and `npm run build` both green
for web3-next. Ready for verify (this PR1b slice) / ready for the next
apply batch (PR2, Phase 4-6, on a new branch based on this one).

---

# PR2 batch — kudos→like rename (indivisible) + Roadmap doc

## Scope of this batch

Phase 4 (tasks 4.1-4.3, api-laravel), Phase 5 (tasks 5.1-5.4, web3-next),
and Phase 6 (task 6.1, docs) from `tasks.md`. Branch
`feat/feed-comunidad-real-03-like-rename`, based on
`feat/feed-comunidad-real-02-follow-ui` (PR1b, merged in). This is the
**third and final** apply batch for the whole change — after this, all
25/25 tasks in `tasks.md` are complete.

Per the design's "kudos → like rename — diff shape (one commit, never
split)" and task 5.4 ("Do not merge Phase 4 without Phase 5"), backend and
frontend were implemented and verified together as a single indivisible
unit before this batch was considered done — Phase 4 was never left
unmerged with Phase 5 pending, even between the RED/GREEN steps below (the
whole sequence ran inside this one apply invocation before returning).

## Mode

Strict TDD (api-laravel), Standard/lint+build-only (web3-next, no test
runner — `testing.web3-next.ready: false`), plain doc edit (Phase 6).
Test runner: `docker exec api-laravel php artisan test` (equivalent to
`composer test`). Followed the design's exact ordering: (1) `FeedTest`
RED on `/like` + `likes_count`, (2) `routes/api.php` + `FeedController` +
`FeedService` GREEN, (3) `lib/api.ts`, (4) `FeedList.tsx`, (5)
`explorar/page.tsx`, (6) `npm run lint && npm run build`.

## Completed Tasks

### Phase 4 — Like Toggle Rename — Backend
- [x] 4.1 RED — `FeedTest.php`: renamed `/kudos` → `/like` in the 3 existing
  toggle tests (`test_user_can_kudos_own_post_regardless_of_privacy` →
  `test_user_can_like_own_post_regardless_of_privacy`,
  `test_user_can_kudos_other_users_public_post` →
  `test_user_can_like_other_users_public_post`,
  `test_user_gets_404_kudos_other_users_followers_only_post` →
  `test_user_gets_404_liking_other_users_followers_only_post`,
  `test_feed_index_hides_followers_only_post_from_non_follower_and_kudos_returns_404`
  → `..._and_like_returns_404`), `assertJsonPath('post.kudos_count', 1)` →
  `'post.likes_count'` in the 2 like-assertion tests; added
  `test_like_toggles_back_and_forth` (first call `liked:true`/
  `likes_count:1`, second call `liked:false`/`likes_count:0`, both at the
  top level and inside `post`) and
  `test_feed_index_reflects_each_viewers_own_liked_state` (liker sees
  `liked:true`, non-liker sees `liked:false` on the same post via
  `GET /api/feed`, both see the same `likes_count`). Confirmed RED: 4
  tests failed with 404 (route didn't exist yet), the pre-existing 404
  test still passed (already expected 404, coincidentally for the same
  reason) — 16 passed, 4 failed before GREEN.
- [x] 4.2 GREEN — `routes/api.php`: `/feed/{id}/kudos` → `/feed/{id}/like`,
  controller method `kudos` → `like`. `FeedController::like()`: symmetric
  toggle (`$liked = in_array(...)`, then add-or-remove via
  `array_diff`/spread), persists to the unchanged `kudos_user_ids`/
  `kudos_count` fields (D7 — persisted names stay), returns
  `{liked, likes_count, post}`. `store()`/`comment()` now pass
  `$request->user()` as `formatPost`'s viewer too (`store` passes it as
  both poster and viewer since the creator is trivially the viewer of
  their own just-created post). `FeedService::formatPost()` gained a third
  `?User $viewer = null` param, emits `likes_count` (from the still-named
  `kudos_count` column) + `liked` (`in_array` against `kudos_user_ids`),
  dropped the `kudos_count` JSON key entirely (no alias). `formatPosts()`
  forwards its existing `$viewer` param to `formatPost()`'s new third arg.
  Also fixed the stale `FeedController::kudos/comment` docblock reference
  in `FeedService::canView()` to `FeedController::like/comment`.
- [x] 4.3 REFACTOR — full `php artisan test`: 217 passed (755 assertions,
  +2 tests / +18 assertions vs. the PR1b baseline of 215/737 — 2 renamed
  tests contribute no net new count, the 2 new tests
  `test_like_toggles_back_and_forth` +
  `test_feed_index_reflects_each_viewers_own_liked_state` do), 0
  regressions. `./vendor/bin/pint --test` on the 4 touched files
  (`FeedController.php`, `FeedService.php`, `FeedTest.php`, `routes/api.php`)
  — 0 style issues (ran scoped to touched files only; a repo-wide
  `pint --test` shows 16 pre-existing style issues in unrelated files,
  untouched by this batch, not fixed here to avoid scope creep into an
  unrelated diff).

### Phase 5 — Like Toggle Rename — Frontend
- [x] 5.1 `lib/api.ts` — `FeedPost` type: dropped `kudos_count: number`,
  added `likes_count: number` + `liked: boolean`. `api.kudos` → `api.like`,
  route `/api/feed/{id}/kudos` → `/api/feed/{id}/like`, response type
  widened to `{ liked: boolean; likes_count: number; post: FeedPost }` to
  match the design's literal top-level-duplicated shape (previously only
  `{ post: FeedPost }`).
- [x] 5.2 `FeedList.tsx` — `showKudos` prop → `showLikes`; `kudosError`
  state → `likeError`; `handleKudos` → `handleLike`, now calling
  `api.like`; error fallback text `"No se pudo dar kudos"` →
  `"No se pudo dar like"`. Heart icon now reflects `post.liked`: filled
  (`fill="currentColor"`) and styled `text-danger` when liked, outlined
  (`fill="none"`) and `text-fg-muted` when not — a design-consistent
  interpretation of "Heart filled when `post.liked`" (the design specifies
  the behavior, not exact styling code). Count reads `post.likes_count`.
- [x] 5.3 `explorar/page.tsx` — `showKudos={false}` → `showLikes={false}`
  (compile-required by the prop rename; confirmed this is the only
  `FeedList` consumer that passed the old prop explicitly — `app/page.tsx`
  and `comunidad/page.tsx` both rely on the `showLikes = true` default and
  needed no change).
- [x] 5.4 Verify — `npm run lint`: 0 errors, same 5 pre-existing
  `@next/next/no-img-element` warnings as the PR1b batch (unrelated files,
  untouched). `npm run build`: "Compiled successfully" (Turbopack),
  TypeScript check passed, all 47 routes generated (static + the 2
  dynamic routes touched in PR1b). Backend + frontend verified together
  before this task was marked done — Phase 4 was never left unmerged with
  Phase 5 pending.

### Phase 6 — Docs
- [x] 6.1 `docs/Roadmap TrackLife.md` — P4.3 section rewritten from a
  "TODO, feed is mock" list to a `[x] COMPLETADO 2026-08-29` **Resultado**
  block (matching the style of the other completed sprint sections):
  states the feed reads/writes were real from the start (never mock), the
  real follow-graph now backs `followers` visibility, the like toggle is
  live with per-viewer `liked`, `FollowButton` is integrated in both
  community pages, and cites the 217/217 green suite. Also removed the
  now-stale `| Feed mock | api-laravel/FeedController.php | TODO: lógica
  real de following (P4.3) |` row from the "Deuda técnica acumulada"
  table (that debt item is resolved by this change). Scope kept to
  exactly the P4.3 section + its debt-table row per proposal Decision 6 —
  did not touch the unrelated `P4.2 Favoritos persistentes` section or the
  "Deuda técnica" row for it, which is also arguably stale but out of this
  change's stated scope.

## Files Changed

| File | Action | What Was Done |
|------|--------|----------------|
| `projects/web/api-laravel/routes/api.php` | Modified | `/feed/{id}/kudos` → `/feed/{id}/like`, controller method rename |
| `projects/web/api-laravel/app/Http/Controllers/Api/FeedController.php` | Modified | `kudos()` → `like()` symmetric toggle; `store`/`comment` pass viewer to `formatPost` |
| `projects/web/api-laravel/app/Services/FeedService.php` | Modified | `formatPost()` gains `?User $viewer`, emits `likes_count`/`liked`, drops `kudos_count` key; `formatPosts()` forwards `$viewer`; docblock fix |
| `projects/web/api-laravel/tests/Feature/FeedTest.php` | Modified | Renamed kudos→like across 4 tests/route calls/assertions; added 2 new tests (toggle-back, per-viewer `liked`) |
| `projects/web/web3-next/lib/api.ts` | Modified | `FeedPost` type swap; `kudos` → `like` method + route + response type |
| `projects/web/web3-next/components/FeedList.tsx` | Modified | `showKudos`→`showLikes`, `handleKudos`→`handleLike`, `kudosError`→`likeError`, Heart reflects `post.liked`, count reads `likes_count` |
| `projects/web/web3-next/app/explorar/page.tsx` | Modified | `showKudos={false}` → `showLikes={false}` |
| `docs/Roadmap TrackLife.md` | Modified | P4.3 section corrected to reflect real (non-mock) state; stale debt-table row removed |
| `openspec/changes/2026-08-29-feed-comunidad-real/tasks.md` | Modified | Marked 4.1-4.3, 5.1-5.4, 6.1 as `[x]` — all 25/25 tasks now complete |

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 4.1-4.2 | `tests/Feature/FeedTest.php` | Feature (HTTP) | ✅ 215/215 (PR1b baseline) | ✅ Written (4 renamed scenarios + 2 new: toggle-back, per-viewer `liked`) | ✅ Passed (20/20 in `FeedTest`, 125 assertions) | ✅ toggle-back covers both directions (like→unlike) in one test with 2 assertion sets; per-viewer test covers both a liker and a non-liker against the same post | ➖ None needed |
| 4.3 | Full suite | Feature (HTTP) | — | — | ✅ 217/217 passed (755 assertions), 0 regressions vs. 215/737 baseline | — | ✅ Pint scoped to 4 touched files: 0 issues |

### Test Summary
- **Total tests written this batch**: 2 new (`test_like_toggles_back_and_forth`, `test_feed_index_reflects_each_viewers_own_liked_state`); 4 existing tests renamed/updated in place (not counted as "written")
- **Total tests passing**: 217/217 (full suite)
- **Layers used**: Feature/HTTP (2 new)
- **Approval tests**: None — the `formatPost()` shape change is a spec'd breaking rename (D7), not a preserve-behavior refactor; it already had RED/GREEN coverage from the toggle-back and per-viewer-liked scenarios
- **Pure functions created**: 0 — `like()`'s toggle logic mutates a persisted model and is 4 lines inline; extracting it to a pure function was considered but rejected as needless indirection for logic this small and directly spec-mirrored (design gives the exact diff)

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `docker exec api-laravel php artisan test --filter=FeedTest` → 20 passed (125 assertions); `npm run lint && npm run build` (web3-next) → 0 lint errors, build compiled successfully with TypeScript check passed |
| Runtime harness command/scenario and exact result | `docker exec api-laravel php artisan test` (full suite, real MongoDB `tracklife_testing` DB) → 217 passed, 0 failed, 755 assertions; `npm run build` generated all 47 Next.js routes including the touched `/explorar` (static) |
| Rollback boundary | Revert all 8 files together in one commit (per the design's indivisibility requirement and task 5.4): `routes/api.php`, `FeedController.php`, `FeedService.php`, `FeedTest.php`, `lib/api.ts`, `FeedList.tsx`, `explorar/page.tsx`, `docs/Roadmap TrackLife.md`. No persisted-data rollback needed — `kudos_count`/`kudos_user_ids` column names were never touched (D7) |

## Deviations from Design

1. **`store()` passes `$request->user()` as both poster and viewer to `formatPost()`**: the design's File Changes table says "pass `$request->user()` as `formatPost`'s viewer in `store`/`like`/`comment`" without specifying the second (`$user`/poster) argument for `store()` specifically. Previously `store()` called `formatPost($post)` with no second argument at all (poster resolved via an extra `User::find()` inside `formatPost`). Since the creator of a post is always its poster, I passed `$request->user()` for *both* the poster and viewer args in `store()` (`formatPost($post, $request->user(), $request->user())`), which also avoids the redundant `User::find()` lookup `formatPost()`'s fallback would otherwise perform. Functionally correct either way (a creator has clearly not yet liked their own just-created post, so `liked` is always `false` here regardless of which User instance is passed), but flagging the exact two-argument choice since the design's prose only explicitly named the third (viewer) argument.
2. **Heart-icon "filled" styling is an interpretation, not literal design code**: the design states "Heart filled when `post.liked`" without exact JSX/Tailwind. I implemented `fill={post.liked ? "currentColor" : "none"}` plus a `text-danger`/`text-fg-muted` color swap on the button, consistent with the existing `lucide-react` `Heart` usage and the app's existing `text-danger` error-color token. Purely presentational; does not affect the API contract or any test.
3. **Test method renames beyond what tasks.md's line-number references implied**: tasks.md's task 4.1 cites specific old line numbers (L268, L310, L355) for the `/kudos`→`/like` route rename, which by the time of this batch had shifted slightly (PR1a/PR1b added tests in between). I located and renamed all 4 occurrences by content match rather than exact line number, and — per this batch's explicit instruction to leave zero `kudos` references outside the persisted `kudos_count`/`kudos_user_ids` field names — also renamed the 4 affected test **method names** themselves (e.g. `test_user_can_kudos_own_post_regardless_of_privacy` → `test_user_can_like_own_post_regardless_of_privacy`) and 2 inline comments using "kudos-able"/"un-kudos-able" phrasing, which the design's File Changes table did not explicitly call out (it only listed route paths and JSON keys). This is a stricter application of the "kudos is retired from the UI/API surface" intent (spec's Purpose section: "the kudos-to-like rename"), not a deviation from it.

No other deviations. Backend and frontend were implemented, verified, and are being delivered together as required by task 5.4 and the design's "one commit, never split" rule for this rename.

## Issues Found

None blocking. Repo-wide `./vendor/bin/pint --test` (unscoped) reports 16
pre-existing style issues across 12 files not touched by any batch of this
change (`AuthController.php`, several `*Resource.php` files, older
migrations, and a few test files) — flagged for awareness only, not fixed
here to keep this diff scoped to the rename. The pre-existing
`web2-nuxt/package-lock.json` dirty-file note from earlier batches remains
unrelated and untouched.

## Workload / PR Boundary (PR2)

- Mode: feature-branch-chain, PR2 slice (final slice of this change)
- Current work unit: Unit 3 — "kudos→like rename, indivisible (5 backend + 3 frontend files, one commit) + Roadmap doc"
- Boundary: starts from branch `feat/feed-comunidad-real-03-like-rename` (base: `feat/feed-comunidad-real-02-follow-ui`); ends with Phase 4 + Phase 5 + Phase 6 all complete together, `composer test` and `npm run lint && npm run build` both green, no api-laravel Follow/web2-nuxt changes
- Estimated review budget impact: ~212 lines forecast for PR2 per tasks.md's Review Workload Forecast (well under the 400-line budget)

## Status (as of PR2 batch — FINAL batch of this change)

25/25 tasks in `tasks.md` complete (Phase 1: 12/12, Phase 2: 4/4, Phase 3:
5/5, Phase 4: 3/3, Phase 5: 4/4, Phase 6: 1/1). `php artisan test`: 217/217
passing (755 assertions). `npm run lint`: 0 errors. `npm run build`:
compiled successfully, all 47 routes generated. Zero `kudos` references
remain in either `api-laravel` or `web3-next` outside the persisted
`kudos_count`/`kudos_user_ids` Mongo field names (verified by grep before
and after this batch). This is the final apply batch for the "Real
Community Feed — Follow Graph + Like Toggle (P4.3)" change — ready for
`sdd-verify`.
