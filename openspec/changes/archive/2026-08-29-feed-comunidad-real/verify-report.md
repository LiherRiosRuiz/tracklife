# Verify Report: Real Community Feed — Follow Graph + Like Toggle (P4.3) — PR2 / FINAL

```yaml
schema: gentle-ai.verify-result/v1
verdict: pass
blockers: 0
critical_findings: 0
requirements: 6/6 (social-feed: Create Feed Post, Read Feed Scoped by Visibility, Followers-Visibility Uses the Real Follow Graph, Toggleable Like, Per-Viewer Like State on Every Feed Read, Authentication Required)
scenarios: 12/12 (social-feed spec, PR2 in-scope subset) — 2 scenarios (store/comment likes_count+liked presence, kudos_count global absence) verified by source inspection + full-suite pass, not by a dedicated regression assertion — see WARNING-1
test_command: docker exec api-laravel composer test
test_exit_code: 0
test_output_hash: sha256:e20cf6034bb0b60aa83ed82365bdd72ace313231bcc79042363edf7222d96f9f
build_command: cd projects/web/web3-next && npm run lint && npm run build
build_exit_code: 0
build_output_hash: sha256:dc992d5c5569986a237ede568a80c23cc406cd5004ca888e96b34f20f78f69d1
```

## Scope

PR2 (final slice): Phase 4 (like-toggle rename, backend), Phase 5 (like-toggle
rename, frontend), Phase 6 (Roadmap doc). Branch
`feat/feed-comunidad-real-03-like-rename`, committed as a single atomic commit
`87abe06` per the design's indivisibility requirement (5 backend + 3 frontend
files + doc, never split). Phase 1-3 (Follow backend + Follow UI) were
verified in prior PRs (PR1a, PR1b) and are re-confirmed here only at the
task/success-criteria level as part of the whole-change holistic check.

## Independent Re-Execution (not trusted from apply-progress alone)

| Command | Result |
|---|---|
| `docker exec api-laravel composer test` | 217 passed, 0 failed, 755 assertions, 7.39s |
| `npm run lint` (web3-next) | 0 errors, 5 pre-existing `@next/next/no-img-element` warnings (unrelated files, untouched by this change) |
| `npm run build` (web3-next) | Compiled successfully (Turbopack), TypeScript check passed, all 47 routes generated, exit 0 |
| `./vendor/bin/pint --test` scoped to the 4 touched PHP files | 0 style issues |

All match apply-progress.md's reported numbers exactly — independently reproduced, not just trusted.

## `kudos` Grep Audit

```
rg -in kudos projects/web/api-laravel --glob '!vendor/*'
rg -in kudos projects/web/web3-next --glob '!node_modules/*' --glob '!.next/*'
```

- `web3-next`: **zero** matches. Confirmed clean.
- `api-laravel`: all matches are the two persisted Mongo field names,
  `kudos_count` / `kudos_user_ids`, in exactly the places Decision 2 requires
  them to remain: `SocialPost` model (`$fillable`, `$casts`), `FeedService`
  (`createPost()`'s defaults, `formatPost()`'s internal read of the
  still-named column), `FeedController::like()` (mutates the persisted
  fields), and test fixtures that construct `SocialPost::create([...])`
  directly against the DB. **No** `kudos` route, controller method, JSON
  response key, or frontend reference remains anywhere.

## Per-Viewer Like State on Every Feed Read (spec requirement check)

`FeedService::formatPost()` (single implementation, called uniformly by
`index`/`store`/`like`/`comment` via `formatPosts()`/`formatPost()`) always
emits `likes_count` and `liked`, and never emits `kudos_count` — read
directly from `app/Services/FeedService.php:55-74`. Confirmed at runtime for:

- `GET /api/feed`: `test_feed_index_reflects_each_viewers_own_liked_state` — liker sees `liked:true`, non-liker sees `liked:false`, both see equal `likes_count`.
- `POST /api/feed/{id}/like`: `test_like_toggles_back_and_forth` — asserts `liked`/`likes_count` at both the top level and inside `post` on both calls.
- `POST /api/feed` (store) and `POST /api/feed/{id}/comments`: **not independently asserted** for `likes_count`/`liked` presence or `kudos_count` absence by a dedicated test — see WARNING-1 below. Source inspection confirms the same `formatPost()` code path is used, so this is a coverage gap, not a known defect.

## Design Deviations — Judged

| # | Deviation | Judgment |
|---|---|---|
| 1 | `store()` passes `$request->user()` as both poster and viewer to `formatPost()` (design only named the third/viewer arg explicitly) | **Reasonable.** Functionally correct (a post's creator has never liked their own just-created post, so `liked` is trivially `false` either way) and avoids a redundant `User::find()`. Low risk. |
| 2 | Heart-icon "filled" styling (`fill="currentColor"` + `text-danger`/`text-fg-muted` swap) is an interpretation of "Heart filled when `post.liked`", not literal design code | **Reasonable.** Presentational only, consistent with existing `lucide-react`/Tailwind conventions in the file, does not affect the API contract or any test. |
| 3 | Renamed 4 test method names and 2 inline comments beyond the design's literal line-number references, to leave zero `kudos` outside persisted field names | **Reasonable, and arguably required.** Stricter application of the proposal's own stated intent ("kudos is retired from the UI/API surface... the kudos-to-like rename"). Verified independently via the grep audit above — zero stray `kudos` references remain. |

## Issues

**WARNING-1** — Missing dedicated regression tests for `POST /api/feed` (store) and `POST /api/feed/{id}/comments` response shape. The spec's "Per-Viewer Like State on Every Feed Read" requirement explicitly names all three routes (`GET /api/feed`, `POST /api/feed`, `POST /api/feed/{id}/comments`) and its "Legacy field name absent" scenario requires `kudos_count` be verifiably absent from every one of them. No test in `FeedTest.php` asserts `likes_count`/`liked` presence or `kudos_count` absence on the `store`/`comment` responses specifically (only `post.type` and `post.comments` are asserted for those two). Source inspection confirms all three routes share the identical `formatPost()` implementation, so this is not a known functional defect — but per the verify skill's rule ("a spec scenario is compliant only when a covering test passed at runtime"), this scenario is only source-verified, not test-verified, for 2 of its 3 named routes. **Recommendation**: add `assertJsonPath('post.likes_count', 0)` / `assertJsonMissing` style assertions to `test_feed_post_store_accepts_known_type` and `test_user_can_comment_own_post_regardless_of_privacy` in a follow-up. Not blocking archive — low risk given the shared code path and full-suite green.

**WARNING-2** — Two pre-existing stale comments in `FeedTest.php` (`test_feed_index_hides_other_users_followers_only_post` L87-89, `test_feed_index_returns_full_page_when_invisible_posts_occupy_naive_fetch_window` L204-206) still say "there is no follow-graph in this codebase" / "no follow graph yet". These predate PR1a/PR2 and were not updated when Phase 2 (`FeedService::isVisibleTo()`) landed — only `DashboardTest.php`'s equivalent comments were updated per task 2.3. The assertions themselves remain correct (neither test's viewer actually follows the poster, so behavior is unchanged either way), so this is a documentation-accuracy issue, not a functional or regression risk. Not blocking; recommend a comment-only follow-up.

**SUGGESTION-1** — `apply-progress.md`'s final status line states "25/25 tasks in `tasks.md` complete." Counting the actual checkboxes in `tasks.md` gives **29/29** (Phase 1: 12, Phase 2: 4, Phase 3: 5, Phase 4: 3, Phase 5: 4, Phase 6: 1 = 29), all marked `[x]`. This is an arithmetic reporting error in the narrative text, not a completion problem — every task is genuinely checked and independently confirmed done. No action needed beyond noting it.

## Whole-Change Holistic Check (all 3 PRs)

`tasks.md`: **29/29 tasks checked** (`rg -c '^\s*- \[x\]' tasks.md` → 29; `'^\s*- \[ \]'` → 0 matches / empty). No unchecked task in Phase 1-6.

### Proposal Success Criteria — final status

| Criterion | Status |
|---|---|
| `POST/DELETE` follow routes work under `auth:sanctum`, scoped to the authenticated user; self-follow rejected; duplicate follow idempotent | **Met** (`FollowTest.php`, verified PR1a; routes confirmed present in `routes/api.php`) |
| A `followers`-visibility post is visible to an actual follower and invisible to a non-follower and to a followed-but-not-following user | **Met** (`FeedTest.php` follow-graph cases; PR1a's documented, reasoned scenario-direction correction stands) |
| `POST /api/feed/{id}/like` toggles both ways; count returns to its prior value after unlike | **Met** — `test_like_toggles_back_and_forth`, independently re-run green |
| `composer test` green — `FollowTest` new, `FeedTest` updated, no other suite regressed | **Met** — 217/217 passed, 755 assertions, independently re-run |
| `FeedList.tsx` reflects liked state and calls `like`; no reference to `kudos` remains in `web3-next`; `npm run lint` and `npm run build` pass | **Met** — grep-confirmed zero `kudos` in `web3-next`; lint/build independently re-run green |
| `docs/Roadmap TrackLife.md` P4.3 no longer describes the feed as mock | **Met** — P4.3 rewritten to a `[x] COMPLETADO` result block |

All 6 success criteria are met. The change delivers what the proposal promised: a real follow graph backing `followers` visibility, a toggleable like replacing the one-way kudos counter, minimal follow UI making the graph reachable, and a corrected roadmap doc.

## Final Verdict

**PASS WITH WARNINGS** — 0 CRITICAL, 2 WARNING, 1 SUGGESTION. No blockers to archive. The two WARNINGs are test-coverage/documentation completeness gaps with no evidence of a functional defect (both cross-checked against source and the full green suite); recommended as low-priority follow-up work, not a reason to reopen this change.
