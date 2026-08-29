# Social Follow Specification

## Purpose

Authenticated users can follow and unfollow other users. The relationship is
open (no approval step) and is the sole input the feed uses to decide
followers-only content visibility. Persisted as a dedicated `Follow`
collection `{follower_id, followed_id}` with a compound unique index.

## Requirements

### Requirement: Follow a User

The system MUST allow an authenticated user to follow another user via
`POST /api/users/{userId}/follow`, creating a `Follow` record with
`follower_id` = the requester's id and `followed_id` = `{userId}`. The
follow MUST take effect immediately with no approval or pending state.

#### Scenario: New follow created

- GIVEN authenticated user A has not followed user B
- WHEN A calls `POST /api/users/{B}/follow`
- THEN the response status is 201
- AND a `Follow` record exists with `follower_id = A`, `followed_id = B`

#### Scenario: Duplicate follow is idempotent

- GIVEN A already follows B
- WHEN A calls `POST /api/users/{B}/follow` again
- THEN the response status is 200
- AND no duplicate `Follow` record is created

### Requirement: Reject Self-Follow

The system MUST reject a request where the requester attempts to follow
their own account, via the Form Request validation layer, before any
`Follow` record is written.

#### Scenario: Self-follow rejected

- GIVEN authenticated user A
- WHEN A calls `POST /api/users/{A}/follow`
- THEN the response status is 422
- AND no `Follow` record is created

### Requirement: Unfollow a User

The system MUST allow an authenticated user to unfollow another user via
`DELETE /api/users/{userId}/follow`, removing the matching `Follow` record
if it exists. The operation MUST be idempotent — unfollowing a user not
currently followed MUST NOT error.

#### Scenario: Existing follow removed

- GIVEN A follows B
- WHEN A calls `DELETE /api/users/{B}/follow`
- THEN the response status is 200
- AND no `Follow` record with `{follower_id: A, followed_id: B}` remains

#### Scenario: Unfollowing a non-followed user is idempotent

- GIVEN A does not follow B
- WHEN A calls `DELETE /api/users/{B}/follow`
- THEN the response status is 200 and no error is raised

### Requirement: Compound Uniqueness

The system MUST enforce a compound unique index on
`{follower_id, followed_id}` so a given follower-followed pair can exist
at most once, and MUST support an efficient existence check for a single
pair (used by the feed's followers-visibility check) without scanning.

#### Scenario: Unique index prevents duplicate storage

- GIVEN a `Follow` record `{follower_id: A, followed_id: B}` already exists
- WHEN a second insert with the same pair is attempted at the storage layer
- THEN the unique index rejects the duplicate insert

### Requirement: List Own Following IDs

The system MUST expose `GET /api/follows`, returning the authenticated
caller's own list of followed user ids as `{following_ids: string[]}`. It
MUST NOT expose another user's follow list, follower counts, or reverse
(who-follows-me) lookups. This exists so client UI can render correct
follow/unfollow button state without a per-row lookup.

#### Scenario: Caller receives only their own following list

- GIVEN authenticated user A follows users B and C
- WHEN A calls `GET /api/follows`
- THEN the response is 200 with `{following_ids: [B, C]}` (order-independent)
- AND no data about who follows A, or about other users' follow lists, is included

### Requirement: Authentication Required

All follow/unfollow routes (including `GET /api/follows`) MUST require
`auth:sanctum` and MUST scope the `follower_id` to the authenticated
requester — a caller MUST NOT be able to create or delete a `Follow`
record on another user's behalf.

#### Scenario: Unauthenticated request rejected

- GIVEN no authenticated session/token is presented
- WHEN a request is made to `POST` or `DELETE /api/users/{userId}/follow`
- THEN the response status is 401
