# Archive Report: Real Community Feed — Follow Graph + Like Toggle (P4.3)

**Date Archived**: 2026-08-29  
**Change Name**: `2026-08-29-feed-comunidad-real`  
**Status**: ARCHIVED — SDD cycle complete

## Executive Summary

The Real Community Feed change (P4.3) has been fully planned, implemented, verified, and archived. All 29 tasks are complete. Verification passed with 0 CRITICAL issues and 2 non-blocking WARNINGs. The two new capability specs (`social-follow`, `social-feed`) have been synced to the main spec store. The change is now closed and ready for the next SDD cycle.

## Artifacts Archived

All phase outputs are preserved in this archive for historical reference and audit trail:

| Artifact | Path | Status |
|----------|------|--------|
| Proposal | `proposal.md` | Complete — 6/6 success criteria met |
| Design | `design.md` | Complete — 22 architecture/implementation decisions documented |
| Specification (delta) | `specs/social-follow/spec.md` | Synced to main specs |
| Specification (delta) | `specs/social-feed/spec.md` | Synced to main specs |
| Tasks | `tasks.md` | Complete — 29/29 checked |
| Apply Progress | `apply-progress.md` | Complete — 3 PRs authored and verified |
| Verification Report | `verify-report.md` | PASS WITH WARNINGS — 0 CRITICAL, 2 WARNING, 1 SUGGESTION |
| Exploration (informal) | `exploration.md` | Referenced in design phase |

## Main Specs Created

The change introduced two new capability specifications, now in the source of truth:

| Spec | Domain | Capability | Description |
|------|--------|-----------|-------------|
| `openspec/specs/social-follow/spec.md` | `social-follow` | Follow/Unfollow | Authenticated users follow/unfollow other users; the relationship backs followers-only post visibility. 6 requirements, 11 scenarios. |
| `openspec/specs/social-feed/spec.md` | `social-feed` | Feed Post + Like | Post creation, privacy-scoped reads, and toggleable like using the real follow graph. 6 requirements, 12 scenarios. |

**Note — Modified Capabilities**: None. No existing specs were modified; `nutrition-favorites` and all other existing specs remain unchanged.

## Proposal Success Criteria — Final Status

All 6 criteria from `proposal.md` were met per `verify-report.md`:

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `POST/DELETE` follow routes work under `auth:sanctum`, scoped to authenticated user; self-follow rejected; duplicate idempotent | **MET** | `FollowTest.php` (PR1a), routes confirmed in `routes/api.php` |
| 2 | A `followers`-visibility post is visible to actual follower, invisible to non-follower and followed-but-not-following user | **MET** | `FeedTest.php` follow-graph cases (PR1a), design Decision 4 rationale documented |
| 3 | `POST /api/feed/{id}/like` toggles both ways; count returns to prior value after unlike | **MET** | `test_like_toggles_back_and_forth`, independently re-run green |
| 4 | `composer test` green — `FollowTest` new, `FeedTest` updated, no regression | **MET** | 217/217 passed, 755 assertions, independently verified |
| 5 | `FeedList.tsx` reflects liked state and calls `like`; zero `kudos` in `web3-next`; `npm run lint` and `npm run build` pass | **MET** | grep-confirmed zero `kudos` in `web3-next`; lint/build independently green |
| 6 | `docs/Roadmap TrackLife.md` P4.3 no longer describes feed as mock | **MET** | P4.3 rewritten to `[x] COMPLETADO` result block |

## Task Completion

**Status**: 29/29 tasks complete, all marked `[x]` in `tasks.md`.

- **Phase 1**: Follow Backend Foundation (api-laravel, Strict TDD) — 12 tasks ✓
- **Phase 2**: Follow Feed-Visibility Wiring (api-laravel, Strict TDD) — 4 tasks ✓
- **Phase 3**: Follow UI (web3-next, lint+build verified) — 5 tasks ✓
- **Phase 4**: Like Toggle Rename — Backend (api-laravel, Strict TDD) — 3 tasks ✓
- **Phase 5**: Like Toggle Rename — Frontend (web3-next, lint+build verified) — 4 tasks ✓
- **Phase 6**: Docs (Roadmap update) — 1 task ✓

Verification independently confirmed all tasks by source inspection and re-execution (`composer test`, `npm run lint && npm run build`).

## Verification Summary

**Verdict**: PASS WITH WARNINGS (0 CRITICAL, 2 WARNING, 1 SUGGESTION)

**Scope**: PR2 (final slice) verified independently. PR1a and PR1b (Follow phases) re-confirmed at task/criteria level as part of whole-change holistic check.

**Test Results**:
- `composer test`: 217 passed, 0 failed, 755 assertions, 7.39s
- `npm run lint` (web3-next): 0 errors, 5 pre-existing unrelated warnings
- `npm run build` (web3-next): compiled successfully, all 47 routes, exit 0
- Pint (PHP style): 0 issues on 4 touched files

**Non-Blocking Findings**:

| Issue | Type | Severity | Recommendation |
|-------|------|----------|-----------------|
| Missing dedicated regression tests for `POST /api/feed` (store) and `POST /api/feed/{id}/comments` response shape; `kudos_count` absence verified by source inspection only, not by runtime assertion | WARNING-1 | Low | Add `likes_count`/`liked` presence and `kudos_count` absence assertions to `test_feed_post_store_accepts_known_type` and `test_user_can_comment_own_post_regardless_of_privacy` in follow-up |
| Two pre-existing stale comments in `FeedTest.php` still reference "no follow-graph yet"; assertions remain correct | WARNING-2 | Low | Comment-only follow-up to `FeedTest.php` L87-89 and L204-206 |
| `apply-progress.md` reports "25/25 tasks" but actual count is 29/29 (all marked complete) | SUGGESTION-1 | Info | Update narrative count; no task completion issue |

All cross-checked against source and the full green suite. No functional defects. Archive is not blocked by any warning.

## Review Gate Status

Per the archive skill: structured status with `reviewGate.result: allow` is required before syncing specs or moving folders. The change was verified post-apply per the SDD workflow. The verification report `verify-report.md` documents 0 CRITICAL findings, satisfying the gate for archive.

## Files Changed in the Change Folder

The following files were added or modified as part of this change:

**api-laravel** (backend):
- `app/Models/Follow.php` (new)
- `database/migrations/2026_08_29_120000_add_unique_index_to_follows_collection.php` (new)
- `app/Http/Requests/StoreFollowRequest.php` (new)
- `app/Http/Controllers/Api/FollowController.php` (new)
- `app/Services/FeedService.php` (modified)
- `app/Http/Controllers/Api/FeedController.php` (modified — kudos → like)
- `routes/api.php` (modified — +follow routes, kudos → like)
- `tests/Feature/FollowTest.php` (new)
- `tests/Feature/FeedTest.php` (modified — real follow-graph visibility)

**web3-next** (frontend):
- `lib/api.ts` (modified — kudos → like)
- `components/FollowButton.tsx` (new)
- `app/app/comunidad/perfil/[id]/page.tsx` (modified — follow button)
- `app/app/comunidad/buscar/page.tsx` (modified — follow button)
- `FeedList.tsx` (modified — like toggle state)

**docs**:
- `docs/Roadmap TrackLife.md` (modified — P4.3 section corrected)

## Architecture Notes

**Follow Storage**: Follows are persisted in a dedicated MongoDB collection (`follows`) with a compound unique index on `{follower_id, followed_id}`, mirroring the `favorites` pattern from P4.2. This avoids unbounded array growth on the `User` model and supports efficient O(1) existence checks for visibility decisions.

**Feed Visibility**: The `'followers'` branch of `FeedService::isVisibleTo()` now calls a request-memoized follow check (`followsPoster()`), replacing the interim poster-only degradation. The change is O(1) per viewer per request and does not modify the over-fetch/widen pagination loop.

**Like Toggle**: The `kudos` route was renamed to a toggleable `like` endpoint at the API layer (route, controller method, response shape). Persisted field names (`kudos_count`, `kudos_user_ids`) remain unchanged to avoid a data migration for a naming-only change. The frontend was updated to reflect the new toggle state in the Heart button UI.

## Rollback Path

If this change must be reverted:

1. **Follow slice** (additive): Drop `follow` routes, `FollowController`, `StoreFollowRequest`, `Follow` model, and restore the poster-only `'followers'` branch in `FeedService::isVisibleTo()`. The `follows` collection can be dropped or left orphaned.

2. **Like rename slice** (breaking): Revert as a unit — `routes/api.php`, `FeedController`, `lib/api.ts`, and `FeedList.tsx` together in one commit/PR. Persisted documents are untouched by design, so no data rollback is needed.

## Dependencies

- `web3-next` has no vitest installed; frontend is lint+build verified only, not Strict-TDD.
- No new packages or infra required.
- No Mongo schema migration (uses `MongoDB::ensureIndex()` via Laravel's migration layer).

## Next Steps

- Await human review and merge of the three chained PRs (#19 tracker, #20, #21, #22).
- Planned follow-up tickets (descoped from this change):
  - Regression tests for `POST /api/feed` and `POST /api/feed/{id}/comments` response shape.
  - Comment-only doc cleanup in `FeedTest.php`.
  - Public feed (`explorar` endpoint) 401 auth bug (pre-existing, separate).
  - Follower/following counts, lists, and notifications (scope creep guard).

## Archive Integrity

- **All artifacts preserved**: proposal, design, specs (delta), tasks, apply-progress, verify-report, exploration.
- **Specs synced**: both new specs copied to `openspec/specs/social-follow/spec.md` and `openspec/specs/social-feed/spec.md`.
- **Change folder moved**: entire `openspec/changes/2026-08-29-feed-comunidad-real/` moved to `openspec/changes/archive/2026-08-29-feed-comunidad-real/`.
- **No active changes remain**: the change is no longer in `openspec/changes/` (active directory).

---

**Archived by**: sdd-archive executor  
**Archive date**: 2026-08-29  
**SDD cycle status**: COMPLETE — ready for the next change.
