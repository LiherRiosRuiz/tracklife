# Social Feed Specification

## Purpose

Authenticated users create feed posts, read a privacy-scoped feed, and give
recognition via a toggleable like, using the real `social-follow`
relationship for followers-only visibility. Post creation and
privacy-scoped reads pre-date this change; this is their first formal
spec, plus the followers-visibility fix and the kudos-to-like rename.

**Spec note — persisted field names unchanged**: the API-facing action and
response rename `kudos` to `like` (route, controller method, response
shape) only. Persisted `SocialPost` fields `kudos_count` and
`kudos_user_ids` MUST NOT be renamed — naming-only change at the API
layer, not the data layer.

## Requirements

### Requirement: Create Feed Post

The system MUST allow an authenticated user to create a feed post via
`POST /api/feed` with content and a visibility type (at minimum `public`
and `followers`).

#### Scenario: Post created

- GIVEN an authenticated user
- WHEN they POST `/api/feed` with valid content and a visibility type
- THEN the response status is 201
- AND a `SocialPost` record exists with the requester as author

### Requirement: Read Feed Scoped by Visibility

The system MUST expose `GET /api/feed`, returning only posts visible to
the requesting user per each post's visibility type: `public` posts are
visible to any authenticated user; the poster's own posts are always
visible to the poster regardless of visibility type.

#### Scenario: Public post visible to any authenticated user

- GIVEN user A created a `public` post
- WHEN user B (unrelated to A) calls GET `/api/feed`
- THEN A's post is included in B's results

#### Scenario: Author always sees their own post

- GIVEN user A created a `followers`-visibility post
- WHEN A calls GET `/api/feed`
- THEN A's own post is included in A's results

### Requirement: Followers-Visibility Uses the Real Follow Graph

The system MUST show a `followers`-visibility post to a user who actually
follows the poster (per the `social-follow` capability), and MUST NOT show
it to a user who does not follow the poster. This replaces the interim
behavior where `followers`-visibility posts were shown only to the poster.

(Previously: `FeedService::isVisibleTo()` degraded `followers`-visibility
to poster-only, per an explicit TODO — no follow relationship existed.)

#### Scenario: Actual follower sees a followers-only post

- GIVEN user B follows user A
- AND user A creates a `followers`-visibility post
- WHEN user B calls GET `/api/feed`
- THEN A's post is included in B's results

#### Scenario: Non-follower does not see a followers-only post

- GIVEN user C does not follow user A
- AND user A creates a `followers`-visibility post
- WHEN user C calls GET `/api/feed`
- THEN A's post is NOT included in C's results

#### Scenario: Followed-but-not-following user does not see the post

- GIVEN user A follows user D, but user D does not follow user A
- AND user D creates a `followers`-visibility post
- WHEN user A calls GET `/api/feed`
- THEN D's post is NOT included in A's results

### Requirement: Toggleable Like

The system MUST expose `POST /api/feed/{id}/like` as a toggle: an
authenticated user's first call adds their like, a second call removes it.
The response MUST be `200` with `{liked: bool, likes_count: int}` on every
call — the caller never needs to distinguish an add from a remove.

#### Scenario: First call likes the post

- GIVEN an authenticated user has not liked post P
- WHEN they call `POST /api/feed/{P}/like`
- THEN the response is 200 with `{liked: true, likes_count: N+1}`

#### Scenario: Second call unlikes the post

- GIVEN the same user already liked post P
- WHEN they call `POST /api/feed/{P}/like` again
- THEN the response is 200 with `{liked: false, likes_count: N}`
- AND `likes_count` returns to its value prior to the like

#### Scenario: Public like count may decrease

- GIVEN post P has `likes_count = 3` after three distinct users liked it
- WHEN one of those users unlikes P
- THEN `likes_count` in subsequent GET `/api/feed` responses is 2
- AND this decrease is expected toggle behavior, not data loss

### Requirement: Per-Viewer Like State on Every Feed Read

Every serialized post returned by `GET /api/feed`, `POST /api/feed`, and
`POST /api/feed/{id}/comments` MUST carry `likes_count` (total distinct
likers) and `liked` (whether the requesting viewer has liked it). The
legacy `kudos_count` field MUST NOT appear in any response — this is a
breaking rename of the serialized shape, not just of the toggle route, and
MUST ship in the same unit as the toggle rename (no deprecated alias).

#### Scenario: Feed read reflects the viewer's own like state

- GIVEN user A liked post P, and user B has not liked post P
- WHEN A calls `GET /api/feed`
- THEN P's entry has `liked: true`
- WHEN B calls `GET /api/feed`
- THEN P's entry has `liked: false`
- AND both entries show the same `likes_count`

#### Scenario: Legacy field name absent

- GIVEN any feed post read via `GET /api/feed`, `POST /api/feed`, or
  `POST /api/feed/{id}/comments`
- THEN the serialized post MUST include `likes_count` and MUST NOT
  include a `kudos_count` key

### Requirement: Authentication Required

All feed routes (`GET /api/feed`, `POST /api/feed`,
`POST /api/feed/{id}/like`) MUST require `auth:sanctum`.

#### Scenario: Unauthenticated request rejected

- GIVEN no authenticated session/token is presented
- WHEN a request is made to any feed route
- THEN the response status is 401
