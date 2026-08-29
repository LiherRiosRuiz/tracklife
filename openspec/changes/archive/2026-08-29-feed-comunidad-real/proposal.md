# Proposal: Real Community Feed — Follow Graph + Like Toggle (P4.3)

Subprojects targeted: **api-laravel** and **web3-next**. `web2-nuxt` is explicitly untouched.

## Intent

Exploration corrected the premise: `GET/POST /api/feed`, kudos and comments are
already real (Mongo `SocialPost`), and `FeedList.tsx` is already wired to the API.
The genuine gap is that **no follow relationship exists anywhere in the codebase**,
so `FeedService::isVisibleTo()` degrades `followers`-visibility posts to
poster-only (its own documented TODO at `FeedService.php:161-171`). Users who set
a content type to `followers` today are effectively publishing to nobody. Second
gap: recognition is a one-way `kudos` counter — a user who taps the `Heart` icon
can never undo it. Success: followers-only content reaches actual followers, and
the Heart button behaves like the like toggle its UI already promises.

## Scope

### In Scope
- `api-laravel`: `Follow` model + controller + Form Request + routes + `FollowTest.php`. Open follow — no approval step (see Decision 7).
- `api-laravel`: wire the real follow check into the existing `'followers'` branch of `FeedService::isVisibleTo()`; update `FeedTest.php` cases that assert the interim poster-only behavior.
- `api-laravel`: rename `kudos` route/method to a toggleable `like` (`FeedController`, `routes/api.php`, `FeedTest.php`). User-facing naming is "like" everywhere; "kudos" is retired from the UI (persisted field names unchanged, Decision 2).
- `web3-next`: update `lib/api.ts` and `FeedList.tsx` to the `like` endpoint with toggle state.
- `web3-next`: minimal follow/unfollow button on the existing user-profile page (`comunidad/perfil/[id]`) and user-search results (`comunidad/buscar`) — without this the follow graph is unreachable from the UI (Decision 8).
- `docs/Roadmap TrackLife.md`: correct the stale P4.3 section (it claims feed/kudos are mock; they are not).

### Out of Scope
- The `explorar/page.tsx` unauthenticated 401 bug (Decision 3) — pre-existing, follow-up ticket.
- Follower/following counts, follower lists, follow notifications, blocking/muting.
- Mongo aggregation `$lookup` for feed privacy — keep PHP-side filtering per `FeedService`'s documented rationale.
- Migrating existing `kudos_count` / `kudos_user_ids` field names in stored documents (see Decision 2).

## Capabilities

### New Capabilities
- `social-follow`: authenticated users follow and unfollow other users; the relationship is the input to followers-only content visibility.
- `social-feed`: feed post creation, privacy-scoped reads, and a toggleable like on a post.

### Modified Capabilities
- None (no existing spec covers feed or follow; `nutrition-favorites` is unaffected).

## Approach

Exploration Approach A.1 + B.3. Dedicated Mongo `Follow` collection
`{ follower_id, followed_id }` with a compound unique index, mirroring the proven
`Favorite` pattern from P4.2 (`FollowTest.php` mirrors `FavoriteTest.php`). The
`'followers'` branch of `isVisibleTo()` calls a single O(1) indexed existence
check — no aggregation, no change to `paginateVisiblePosts`'s over-fetch loop.

| # | Decision | Rationale |
|---|----------|-----------|
| 1 Follow storage | Dedicated `Follow` collection, not embedded `following_ids` on `User` | Unbounded array growth, no efficient reverse query, array-mutation races; dedicated small collection is the existing house convention (`Favorite`, `SocialPost`) |
| 2 kudos → like | Rename route+method to `like` with toggle semantics; keep persisted field names `kudos_count` / `kudos_user_ids` | One recognition concept, matches the Heart icon and roadmap naming; keeping field names avoids a data migration for a naming-only change |
| 3 Like idempotency | `POST /api/feed/{id}/like` toggles: 200 with `{liked: bool, likes_count: int}` | UI has one button; caller never needs to distinguish add from remove |
| 4 Self-follow | Rejected (422); duplicate follow is idempotent (200) | Domain invariant; mirrors P4.2 idempotency choice |
| 5 `explorar` 401 bug | Descoped, documented, follow-up ticket | Adjacent but separate slice; keeps this diff reviewable |
| 6 Roadmap doc | Corrected in this change regardless of 1-2 | Stale doc already caused a false "feed is mock" premise once |
| 7 Follow approval | Open follow, no approval step, no `status` field on `Follow` | User decision: kept simple, matches Twitter-style default; an approval flow would add a pending-request state and inbox UI out of proportion to this change |
| 8 Follow discovery UI | Minimal follow/unfollow button on user-profile and user-search pages, in scope for this change | User decision: without it the follow graph is API-only and no real user can build one — feature would ship technically complete but practically unusable |
| 9 Like count visibility | Public like count may decrease on unlike; no separate "kudos received" vs "current like" split | User decision: standard toggle-button behavior, accepted as-is |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `api-laravel/app/Models/Follow.php` | New | `{follower_id, followed_id}`, compound unique index |
| `api-laravel/app/Http/Controllers/Api/FollowController.php` | New | store/destroy (follow/unfollow) |
| `api-laravel/app/Http/Requests/StoreFollowRequest.php` | New | Validate target user, reject self-follow |
| `api-laravel/app/Services/FeedService.php` | Modified | `'followers'` branch calls the real follow check; remove the TODO |
| `api-laravel/app/Http/Controllers/Api/FeedController.php` | Modified | `kudos()` → `like()` with toggle |
| `api-laravel/routes/api.php` | Modified | `+follow/unfollow`; `kudos` → `like` |
| `api-laravel/tests/Feature/FollowTest.php` | New | Mirrors `FavoriteTest` |
| `api-laravel/tests/Feature/FeedTest.php` | Modified | Real follow-graph visibility; like toggle supersedes kudos-only cases |
| `web3-next/lib/api.ts` | Modified | `kudos` → `like`, toggle response type |
| `web3-next/components/FeedList.tsx` | Modified | Like toggle state on the Heart button |
| `web3-next/app/app/comunidad/perfil/[id]/page.tsx` | Modified | Follow/unfollow button, follow state |
| `web3-next/app/app/comunidad/buscar/page.tsx` | Modified | Follow/unfollow button on each search result |
| `docs/Roadmap TrackLife.md` | Modified | P4.3 section corrected (feed is not mock) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `kudos` route removal breaks a live frontend if shipped split | High | Ship backend + frontend + tests in ONE sequenced slice; never merge the route rename without the `lib/api.ts` change (see Rollback) |
| Persisted `kudos_*` field names diverge from the `like` API name | Med | Deliberate (Decision 2); document in the design so it is not later "fixed" by accident |
| `web3-next` has no vitest installed — frontend TDD not feasible | High | Explicitly flagged, not silently skipped. Frontend slice ships lint+build verified only; backend is Strict-TDD (PHPUnit + `MongoTestCleanup`) |
| Existing `FeedTest` cases assert interim poster-only behavior | Med | Those assertions are superseded on purpose; the delta spec must state the behavior change so it is not read as a regression |
| Follow graph invites scope creep (counts, lists, notifications) | Med | Explicitly out of scope above |
| Un-liking makes `kudos_count` decrease — appears as data loss in UI | Low | Expected toggle semantics; covered by a test asserting count returns to its prior value |

## Rollback Plan

Two independent revert paths:

1. **Follow slice** — additive. Drop the `follow` routes, `FollowController`, `StoreFollowRequest`, and `Follow` model, and restore the poster-only `'followers'` branch in `FeedService::isVisibleTo()`. The `follows` collection is additive and can be left orphaned or dropped; no other collection is migrated.
2. **Like rename slice** — breaking, so revert as a unit. Reverting requires the `routes/api.php`, `FeedController`, `lib/api.ts`, and `FeedList.tsx` diffs to be reverted **together** in one commit/PR; reverting only the backend leaves the deployed frontend calling a dead `/like` route (or vice versa). Persisted documents are untouched by design (Decision 2), so no data rollback is needed. If rollback urgency is a concern, an accepted alternative is to keep `kudos` as a deprecated alias route for one release — call this out at design time.

## Dependencies

- `web3-next` TDD gap: vitest + @testing-library/react must be installed before strict TDD applies to any frontend slice. Flagged, not resolved here (same prerequisite as P4.2).
- No new packages, no infra or Mongo schema migration required.

## Success Criteria

- [ ] `POST/DELETE` follow routes work under `auth:sanctum`, scoped to the authenticated user; self-follow rejected; duplicate follow idempotent.
- [ ] A `followers`-visibility post is visible to an actual follower and invisible to a non-follower and to a followed-but-not-following user.
- [ ] `POST /api/feed/{id}/like` toggles both ways; count returns to its prior value after unlike.
- [ ] `composer test` green — `FollowTest` new, `FeedTest` updated, no other suite regressed.
- [ ] `FeedList.tsx` reflects liked state and calls `like`; no reference to `kudos` remains in `web3-next`; `npm run lint` and `npm run build` pass.
- [ ] `docs/Roadmap TrackLife.md` P4.3 no longer describes the feed as mock.

## Proposal question round — resolved

Answered directly by the user (2026-08-29); baked into Decisions 7-9 and Scope above:

1. **Follow semantics** — open follow, no approval (Decision 7).
2. **Un-like visibility** — public decreasing count accepted (Decision 9).
3. **Naming** — "like" everywhere, "kudos" retired from UI (Decision 2, confirmed).
4. **`explorar` public feed** — still descoped (Decision 5), not raised again by the user; remains a follow-up ticket.
5. **Follow discovery** — minimal follow button on profile + search now in scope (Decision 8).
