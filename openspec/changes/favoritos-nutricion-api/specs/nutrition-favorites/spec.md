# Nutrition Favorites Specification

## Purpose

Authenticated users can add, remove, and list favorite foods and recipes,
persisted server-side per account via `Favorite` model + `auth:sanctum` API,
replacing the browser-only `localStorage` implementation.

## Requirements

### Requirement: Add a Favorite

The system MUST allow an authenticated user to add a favorite via
`POST /api/favorites` with `{type, ref}` in the body, using findOrCreate
semantics scoped to the requesting user.

#### Scenario: New favorite created

- GIVEN an authenticated user has no favorite matching `{type: "food", ref: "Banana"}`
- WHEN they POST `/api/favorites` with `{type: "food", ref: "Banana"}`
- THEN the response status is 201
- AND a `Favorite` record exists with `user_id` = the requester's id, `type` = "food", `ref` = "Banana"

#### Scenario: Re-adding an existing favorite is idempotent

- GIVEN the same user already has that favorite
- WHEN they POST the same `{type, ref}` again
- THEN the response status is 200
- AND no duplicate record is created

#### Scenario: Same ref favorited independently by two users

- GIVEN user A already favorited `{type: "food", ref: "Banana"}`
- WHEN user B POSTs the same `{type: "food", ref: "Banana"}`
- THEN the response status is 201 (new for user B)
- AND two separate `Favorite` records exist, one per user

### Requirement: Remove a Favorite

The system MUST allow an authenticated user to remove a favorite via
`DELETE /api/favorites` with `{type, ref}` in the body, always returning 200
with a confirmation message regardless of whether the record existed.

#### Scenario: Existing favorite removed

- GIVEN the user has favorite `{type: "food", ref: "Banana"}`
- WHEN they DELETE `/api/favorites` with `{type: "food", ref: "Banana"}`
- THEN the response status is 200 with body `{"message": "Favorito eliminado"}`
- AND no matching `{user_id, type, ref}` record remains

#### Scenario: Removing an absent favorite is idempotent

- GIVEN the user has no favorite matching `{type: "recipe", ref: "unknown-id"}`
- WHEN they DELETE `/api/favorites` with that `{type, ref}`
- THEN the response status is 200 with body `{"message": "Favorito eliminado"}` and no error is raised

### Requirement: List Favorites

The system MUST expose `GET /api/favorites`, returning only the requesting
user's favorites so the frontend can render current favorite state without
leaking `user_id` in the response payload.

#### Scenario: List returns only own favorites

- GIVEN user A has `{food, "Banana"}` and `{recipe, "r1"}`; user B has `{food, "Rice"}`
- WHEN user A calls GET `/api/favorites`
- THEN the response status is 200
- AND the body contains exactly user A's two favorites, none of user B's
- AND each favorite entry exposes `type` and `ref` only (no `user_id` field)

### Requirement: Authentication and User Isolation

All favorites routes MUST require `auth:sanctum` and MUST scope every
read/write to `$request->user()->_id`. A favorite created by one user MUST be
invisible to and unaffected by another user's requests.

#### Scenario: Unauthenticated request rejected

- GIVEN no authenticated session/token is presented
- WHEN a request is made to `GET`, `POST`, or `DELETE /api/favorites`
- THEN the response status is 401

#### Scenario: User B cannot delete User A's favorite

- GIVEN user A has favorite `{type: "food", ref: "Banana"}`
- WHEN user B sends DELETE `/api/favorites` with `{type: "food", ref: "Banana"}`
- THEN the response status is 200 with body `{"message": "Favorito eliminado"}` (per idempotent-delete contract)
- AND user A's favorite record still exists, untouched

### Requirement: One-Time Client-Side Migration

On first load of the favorites page after this change ships, the frontend
MUST read existing `tracklife_favorites` entries from `localStorage`, POST
each to `/api/favorites`, then clear the `tracklife_favorites` key. Migration
MUST be best-effort: a failure on one entry MUST NOT block migration of the
remaining entries, and MUST NOT surface an unhandled error to the user.

#### Scenario: Full migration success

- GIVEN `tracklife_favorites` holds 3 valid entries and the API is reachable
- WHEN the favorites page loads for the first time after the change ships
- THEN all 3 entries are POSTed to `/api/favorites`
- AND the `tracklife_favorites` key is cleared afterward

#### Scenario: Partial migration failure is best-effort

- GIVEN `tracklife_favorites` holds 3 entries and one POST fails (e.g. network error)
- WHEN migration runs
- THEN the other 2 entries are still POSTed
- AND the `tracklife_favorites` key is still cleared once the attempt completes
- AND no unhandled error is surfaced to the user

#### Scenario: Migration runs only once

- GIVEN migration already completed (`tracklife_favorites` key absent)
- WHEN the favorites page loads again
- THEN no migration POST requests are made
