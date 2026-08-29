# Verify Report: Real Community Feed — Follow Graph + Feed-Visibility Wiring (PR1a)

```yaml
schema: gentle-ai.verify-result/v1
verdict: pass
blockers: 0
critical_findings: 0
requirements: 7/7 (in-scope: social-follow 6/6, social-feed followers-visibility 1/1; Phase 3-6 requirements out of scope, not counted)
scenarios: 11/11 (in-scope: social-follow 8/8, social-feed followers-visibility 3/3)
test_command: docker exec api-laravel composer test
test_exit_code: 0
test_output_hash: sha256:051c571512aad06bc3aa604cec2811a9eb23e41234eb5f111644df2f176217ca
build_command: docker exec api-laravel php artisan route:list (route registration sanity check; no separate build step for interpreted PHP)
build_exit_code: 0
build_output_hash: sha256:8e942640b42376e951c7f02e0b93b4a357fbdfe4817711763ca512c00f9ff969
```

## Scope

PR1a only: Phase 1 (Follow backend CRUD) + Phase 2 (feed-visibility wiring), api-laravel.
Phase 3 (web3-next follow UI), Phase 4-5 (kudos→like rename), Phase 6 (docs) are
out of scope for this batch, unimplemented by design, and are not flagged as missing.
Branch: `feat/feed-comunidad-real-01-follow-backend`, commit `7c9b055`.
Mode: Strict TDD (api-laravel).

## Completeness

| Metric | Value |
|--------|-------|
| Phase 1 tasks (1.1-1.12) | 12/12 complete |
| Phase 2 tasks (2.1-2.4) | 4/4 complete |
| Phase 3-6 tasks | 0/N, correctly left unchecked (future PRs) |

## Build & Tests Execution

**Build**: PASS — `php artisan route:list` confirms all 3 new routes registered
without error (`GET /api/follows`, `POST /api/users/{id}/follow`,
`DELETE /api/users/{id}/follow`), inside the `auth:sanctum` group.

**Tests**: PASS — 215 passed / 0 failed (737 assertions), full suite,
`docker exec api-laravel composer test`, exit code 0. Re-run independently
during verify (not just trusted from apply-progress); numbers match exactly:
- `--filter=FollowTest` → 10 passed (26 assertions) — matches apply-progress
- `--filter=FeedTest` → 18 passed (107 assertions) — matches apply-progress
- Full suite → 215 passed (737 assertions) — matches apply-progress

**Lint**: `./vendor/bin/pint --test` — 16 pre-existing style issues in files
NOT touched by this change (AuthController, several Resources, an older
migration, TestCase, MongoTestCleanup). Zero issues in any file created or
modified by this PR (Follow.php, migration, StoreFollowRequest.php,
FollowController.php, FeedService.php, FollowTest.php, FeedTest.php,
DashboardTest.php).

## Strict TDD Compliance

| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | Found in apply-progress.md, "TDD Cycle Evidence" table |
| All tasks have tests | 12/12 Phase 1 + 4/4 Phase 2 tasks map to `FollowTest.php`/`FeedTest.php` |
| RED confirmed | Test files exist and contain the exact methods named in apply-progress |
| GREEN confirmed | Re-ran independently: exact assertion counts (10/26, 18/107, 215/737) match apply-progress verbatim — high-confidence, not a rubber-stamp |
| Triangulation | Store: 4 cases, Destroy: 3 cases, Index+uniqueness: 2 cases, Feed-visibility: 3 cases — adequate |
| Safety net for modified files | `FeedTest.php`/`DashboardTest.php` safety-net percentages in the evidence table are internally consistent with the task sequence |

**TDD Compliance**: 6/6 checks passed — credible.

### Assertion Quality Audit

Scanned `FollowTest.php` (10 tests) and the 3 new `FeedTest.php` cases. All
assertions call production code (real HTTP requests via `actingAs()->postJson/
getJson/deleteJson`) and assert real values (status codes, `assertJsonPath`,
DB row counts via `Follow::where(...)->count()`, `assertContains`/`assertCount`
on response payloads, `expectException(BulkWriteException::class)` with a
message-pattern match). No tautologies, no ghost loops, no smoke-test-only
patterns, no mock usage.

**Assertion quality**: All assertions verify real behavior — no issues found.

## Spec Compliance Matrix

### social-follow (all 6 requirements, 8 scenarios — fully in scope)

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Follow a User | New follow created | `FollowTest::test_store_creates_follow_returns_201` | COMPLIANT |
| Follow a User | Duplicate follow idempotent | `FollowTest::test_store_duplicate_returns_200_and_single_row` | COMPLIANT |
| Reject Self-Follow | Self-follow rejected | `FollowTest::test_store_rejects_self_follow_422` | COMPLIANT |
| Unfollow a User | Existing follow removed | `FollowTest::test_destroy_returns_200_and_removes_row` | COMPLIANT |
| Unfollow a User | Unfollowing non-followed is idempotent | `FollowTest::test_destroy_absent_follow_still_returns_200` | COMPLIANT |
| Compound Uniqueness | Unique index prevents duplicate storage | `FollowTest::test_unique_index_rejects_duplicate_at_db_level` | COMPLIANT |
| List Own Following IDs | Caller receives only their own following list | `FollowTest::test_index_returns_only_callers_following_ids` | COMPLIANT |
| Authentication Required | Unauthenticated request rejected | `FollowTest::test_requires_authentication` | COMPLIANT |

Additional coverage beyond the minimum scenario set: `test_store_unknown_user_returns_404`,
`test_destroy_only_removes_own_follow` (authorization-scoping, matches design's
threat-matrix row "Authorization bypass / forged identity").

### social-feed — Followers-Visibility Uses the Real Follow Graph (only feed requirement in scope for PR1a)

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Followers-Visibility Uses the Real Follow Graph | Actual follower sees a followers-only post | `FeedTest::test_feed_index_shows_followers_only_post_to_actual_follower` | COMPLIANT |
| Followers-Visibility Uses the Real Follow Graph | Non-follower does not see a followers-only post | `FeedTest::test_feed_index_hides_followers_only_post_from_non_follower_and_kudos_returns_404` | COMPLIANT |
| Followers-Visibility Uses the Real Follow Graph | Being followed by the poster does not grant visibility (corrected scenario) | `FeedTest::test_feed_index_hides_followers_only_post_from_followed_but_not_following_user` | COMPLIANT |

**Compliance summary**: 11/11 in-scope scenarios compliant. Remaining `social-feed`
requirements (Create Feed Post, Read Feed Scoped by Visibility — pre-existing;
Toggleable Like, Per-Viewer Like State — Phase 4/5) are correctly out of scope
for this batch and not implemented; not counted as failures.

## Spec/Design Discrepancy Verification (mandatory per task brief)

The orchestrator's stated correction to `specs/social-feed/spec.md`'s
"Followed-but-not-following user does not see the post" scenario was verified
directly:

- Git diff of commit `7c9b055` confirms the spec text now reads exactly:
  `GIVEN user D follows user A, but user A does not follow user D ... THEN D's
  post is NOT included in A's results` — i.e. "being followed by the poster
  grants nothing."
- `FeedService::followsPoster()` (design D-authoritative code, unchanged from
  design.md) checks `$viewer` follows `$poster`, never the reverse.
- `FeedTest::test_feed_index_hides_followers_only_post_from_followed_but_not_following_user`
  sets up `Follow::create(['follower_id' => D, 'followed_id' => A])` (D follows A),
  D posts, A reads the feed, and asserts D's post is absent from A's results —
  this is exactly the corrected spec's GIVEN/THEN, not the original (inverted)
  wording.

Code, test, and corrected spec text are mutually consistent. No discrepancy remains.

## Correctness (Static Evidence)

| Requirement | Status | Notes |
|---|---|---|
| `Follow` model | Implemented | `mongodb` connection, `follows` collection, `fillable` matches design D1 |
| Migration unique index | Implemented | `unique(['follower_id','followed_id'])`, `down()` drops `follower_id_1_followed_id_1` |
| `StoreFollowRequest` | Implemented | `prepareForValidation()` merges route `{id}`; `Rule::notIn` on the caller's own id |
| `FollowController` | Implemented | `index/store/destroy`; `store` uses insert-then-catch `BulkWriteException` 11000 (D5), `destroy` scoped to `follower_id` |
| Routes | Implemented | All 3 inside `auth:sanctum` group, path-keyed per design D2 |
| `FeedService::isVisibleTo()` | Implemented | Exact `match` from design (public/followers/default) |
| `FeedService::followsPoster()` + `$followingCache` | Implemented | Memoized per-viewer, matches design D6 code verbatim |

## Coherence (Design)

| Decision | Followed? | Notes |
|---|---|---|
| D1 Follow storage | Yes | Dedicated collection, not embedded array |
| D2 Route shape | Yes | Path-keyed `/users/{id}/follow` |
| D3 Follow-state hydration | Yes | `GET /api/follows` → `{following_ids}` |
| D4 Status codes | Yes | 201/200/422/404 all verified by tests |
| D5 Duplicate handling | Yes | Insert-then-catch 11000, not `firstOrCreate` |
| D6 Follow check cost | Yes | Per-viewer memoized cache, O(1) queries |

## Issues Found

**CRITICAL**: None

**WARNING**: None

**SUGGESTION**:
- Unrelated dirty file `projects/web/web2-nuxt/package-lock.json` remains modified
  in the working tree. Not touched by this change, already flagged by the apply
  phase — carry it forward or clean it up before it accumulates across PR1b/PR2.

## Verdict

**PASS**

All Phase 1 + Phase 2 tasks complete, all in-scope spec requirements/scenarios
(11/11) have passing covering tests independently re-run during verify (not
just trusted from apply-progress — exact assertion counts match), the spec/design
discrepancy correction was independently confirmed consistent across spec text,
design code, and test, and zero regressions across the full 215-test suite.
Ready for `sdd-archive` of this PR1a slice (Phase 3-6 remain tracked, unstarted).
