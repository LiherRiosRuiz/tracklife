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

---

# Verify Report: Follow UI (PR1b, web3-next)

```yaml
schema: gentle-ai.verify-result/v1
verdict: pass
blockers: 0
critical_findings: 0
requirements: 8/8 (social-follow, backend-scoped; PR1b adds no new spec requirements — UI is design-governed only, see Scope)
scenarios: 0/0 new (no spec scenario targets web3-next UI; frontend correctness verified via source inspection + lint/build per design's Testing Strategy row, config testing.web3-next.ready: false)
test_command: N/A - no test runner installed for web3-next (testing.web3-next.ready: false)
test_exit_code: N/A
test_output_hash: N/A
build_command: npm run build (cd projects/web/web3-next)
build_exit_code: 0
build_output_hash: sha256:9ae1d5e56c46cfbf45dad1e9ffa0485c4f68674ad05d99231ecbadb3c08ca686
lint_command: npm run lint (cd projects/web/web3-next)
lint_exit_code: 0
lint_output_hash: sha256:0b9393ddbc938d263e4dc0aaf1544effad1da25c95a3481b597145078e56fac3
```

## Scope

PR1b only: Phase 3 (Follow UI, `web3-next`) from `tasks.md`. Phase 1-2
(follow backend, previously verified PASS in the PR1a report above, merged
into this branch's history) are not re-verified here. Phase 4-6
(kudos→like rename + docs, `[ ]` unchecked in `tasks.md`) are out of
scope by design and are not flagged as missing.
Branch: `feat/feed-comunidad-real-02-follow-ui` (base:
`feat/feed-comunidad-real-01-follow-backend`), commit `97a6edf`.
Mode: Standard — `testing.web3-next.ready: false`, no vitest/jest
installed, so Strict TDD does not apply to this slice even though the
global `strict_tdd: true` marker is set (no runner exists). Verified via
independent re-run of `npm run lint` and `npm run build`, not by trusting
`apply-progress.md`'s reported numbers.

## Completeness

| Metric | Value |
|--------|-------|
| Phase 3 tasks (3.1-3.5) | 5/5 complete (`tasks.md` confirmed) |
| Phase 4-6 tasks | 0/N, correctly left unchecked (future PR2) |

## Build & Lint Execution (independently re-run, not trusted from apply-progress)

**Build**: PASS — `npm run build` inside `projects/web/web3-next`: Turbopack
compiled successfully in 4.8s, TypeScript check passed, all 47 routes
generated including `○ /app/comunidad/buscar` (static) and
`ƒ /app/comunidad/perfil/[id]` (dynamic). Exit code 0.

**Lint**: PASS — `npm run lint`: 0 errors, 5 warnings, all pre-existing
`@next/next/no-img-element` warnings on `<img>` tags this change did not
introduce (`buscar/page.tsx:35`, `perfil/[id]/page.tsx:53`, plus 3 more in
files untouched by this PR: `entrenamiento/gym/ejercicios/[id]/page.tsx`,
`entrenamiento/gym/ejercicios/page.tsx`, `ExercisePickerModal.tsx`). Exit
code 0. Numbers match `apply-progress.md`'s PR1b claims exactly.

**Tests**: N/A — no test runner installed for `web3-next`
(`testing.web3-next.ready: false`, confirmed proposal risk, not silently
skipped). This is the documented project convention for this subproject,
not a verification gap invented by this batch.

## Git Scope Verification

`git show --stat 97a6edf` confirms exactly the 4 code files the design's
"web3-next rows" and `tasks.md` Phase 3 call for, plus `tasks.md` and
`apply-progress.md` bookkeeping — no `api-laravel`/`web2-nuxt` changes, no
Phase 4-5 `kudos`→`like` touches:

| File | Insertions/Deletions |
|---|---|
| `projects/web/web3-next/lib/api.ts` | +9 |
| `projects/web/web3-next/components/FollowButton.tsx` | +48 (new) |
| `projects/web/web3-next/app/app/comunidad/perfil/[id]/page.tsx` | +15 |
| `projects/web/web3-next/app/app/comunidad/buscar/page.tsx` | +36/-13 |

Code-only diff (excluding SDD bookkeeping docs) is ~108 lines added, well
under the 400-line review budget, matching the ~95-line forecast in
`tasks.md`'s Review Workload Forecast.

## Design Coherence Matrix (web3-next Follow UI, per design.md "Follow button integration")

| Design element | Implemented as specified? | Evidence |
|---|---|---|
| `FollowButton` props `{userId, initialFollowing}` | Yes | `FollowButton.tsx:8-14` |
| No optimistic UI (D9) — state only from server response | Yes | `setFollowing(res.following)` runs only after `await api.followUser/unfollowUser` resolves; on `catch`, `following` is left untouched, only `error` is set | 
| `pending` state gates re-entrancy | Yes | `pending=true` before the call, `pending=false` in `finally` |
| `disabled={pending \|\| !token}` | Yes | `FollowButton.tsx:41`, exact match |
| Variant/label swap: `primary`/"Seguir" not following, `secondary`/"Siguiendo" following | Yes | `FollowButton.tsx:40,43`, exact match |
| Inline error styling `<p className="text-xs text-danger">` | Yes | `FollowButton.tsx:45`, byte-identical to design's snippet and to `FeedList.tsx`'s existing convention |
| `perfil/[id]/page.tsx`: second `useApiData(() => api.follows(token!), [token], { enabled: !!token })` alongside existing `userProfile` call | Yes | `page.tsx:33-37` |
| `perfil/[id]/page.tsx`: self-view guard hides button when `id === currentUser.id` | Yes | `isSelf = currentUser?.id === id` (`page.tsx:45`), `{!isSelf && <FollowButton .../>}` (`page.tsx:76-78`) |
| `buscar/page.tsx`: one page-level `following_ids` hydration, not per-card | Yes | Single `useApiData` call in `BuscarPage`, passed down as `isFollowing` prop (`page.tsx:93-97, 100, 141`) |
| `buscar/page.tsx`: self-view guard per card | Yes | `isSelf={currentUser?.id === user.id}` computed per row (`page.tsx:142`), `UserCard` renders `{!isSelf && <FollowButton .../>}` (`page.tsx:53`) |
| `lib/api.ts` contract shape (`follows`, `followUser`, `unfollowUser`) | Yes | `api.ts:171-178`, byte-identical to design's TS snippet |

**Self-view guard verification (explicit check requested)**: Both pages
correctly compute `isSelf`/`isSelf` from `useAuth().user.id` compared
against the profile/row's user id, and both wrap the `<FollowButton>` in a
`{!isSelf && ...}` conditional — the button is genuinely absent from the
rendered tree (not merely disabled) when viewing/searching one's own
account, making the backend's 422 self-follow path unreachable from the
UI, as design and tasks.md 3.3/3.4 require.

## Correctness (Static Evidence)

| Requirement | Status | Notes |
|---|---|---|
| `lib/api.ts` follow methods | Implemented | Signatures match design's contract table exactly |
| `FollowButton.tsx` | Implemented | Pessimistic UI, pending/disabled/error handling all match D9 |
| `perfil/[id]/page.tsx` integration | Implemented | Hydration + self-guard match design |
| `buscar/page.tsx` integration | Implemented | Page-level hydration (not per-card) + per-row self-guard match design |

## Issues Found

**CRITICAL**: None

**WARNING**: None

**SUGGESTION**:
- Unrelated dirty file `projects/web/web2-nuxt/package-lock.json` remains
  modified in the working tree (confirmed still present via `git status`
  during this verify run). Flagged in the PR1a verify report and the PR1a/
  PR1b apply-progress notes; still not cleaned up. Carry forward before
  PR2, or clean it up out-of-band — it is unrelated to this change.

## Verdict

**PASS**

Phase 3 (5/5 tasks) complete and matches `tasks.md`'s checklist and the
design's "Follow button integration (web3-next)" section point-for-point,
independently confirmed via source inspection (no rubber-stamping the
apply report). `npm run lint` (0 errors) and `npm run build` (0 errors,
all 47 routes including both touched pages) were re-run independently
during this verify pass, not just trusted from `apply-progress.md` — exit
codes and warning counts match exactly. No optimistic UI, no unreachable-
guard, and no prop/behavior deviation from the design were found. This is
a lint+build verification by explicit, documented project convention
(`testing.web3-next.ready: false`), not a silently skipped test suite.
Ready for `sdd-archive` of this PR1b slice; PR2 (Phase 4-6) remains
tracked and unstarted, as expected.
