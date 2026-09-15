# Client Session Auth Specification

## Purpose

How web3-next's browser layer authenticates: the httpOnly session cookie is
the sole credential, no auth token is client-JS-readable, and all client API
traffic reaches `api-laravel` only through a same-origin, closed-by-construction
server proxy.

## Requirements

### Requirement: httpOnly Cookie Is the Sole Client Credential

No client-JS-readable auth token MUST exist in web3-next — not in
`localStorage`, `sessionStorage`, nor as a client-constructible `Authorization`
header. The httpOnly session cookie MUST be the only credential the browser
holds.

#### Scenario: No token in storage after login

- GIVEN a user completes login in web3-next
- WHEN `localStorage` and `sessionStorage` are inspected in DevTools
- THEN neither contains an auth token or bearer credential

#### Scenario: No client-constructible Authorization header

- GIVEN a user is authenticated
- WHEN any client-side network request is inspected in DevTools
- THEN no request carries a client-constructed `Authorization` header

### Requirement: Proxy Forwards Authenticated Requests Server-Side

The proxy Route Handler (`app/api/proxy/[...path]/route.ts`) MUST read the
session cookie server-side via `next/headers`, attach the real `Bearer` token
to the forwarded request, and return Laravel's response status and body
verbatim to the client.

#### Scenario: Authenticated request is forwarded with the real token

- GIVEN a valid session cookie is present on the request
- WHEN the client calls `/api/proxy/{path}`
- THEN the proxy forwards the request to `api-laravel` with a `Bearer` token attached server-side
- AND the returned status and body match Laravel's response exactly

### Requirement: Proxy Closed by Construction

The proxy MUST only reach `api-laravel`'s fixed base URL (`API_INTERNAL_URL` +
fixed API prefix); no caller-supplied host MUST be accepted. A path segment
that is empty, `.`, `..`, or contains a scheme, `//`, or a backslash MUST be
rejected with an error, not forwarded.

#### Scenario: Path traversal segment is rejected

- GIVEN a client calls `/api/proxy/..%2Fadmin` (segment containing `..`)
- WHEN the proxy validates the path
- THEN it returns an error status and does not forward the request

#### Scenario: Absolute-URL or scheme-prefixed segment is rejected

- GIVEN a client calls `/api/proxy/http://evil.test/x`
- WHEN the proxy validates the path
- THEN it returns an error status and does not forward the request

#### Scenario: Well-formed path reaches only api-laravel

- GIVEN a client calls `/api/proxy/users/me`
- WHEN the proxy resolves the upstream URL
- THEN the URL targets `API_INTERNAL_URL` and no other host

### Requirement: Inbound Authorization Header Is Dropped

The proxy MUST NOT relay a browser-supplied `Authorization` header to
`api-laravel`, even if the browser sends one.

#### Scenario: Client-sent Authorization header is discarded

- GIVEN a client request to `/api/proxy/{path}` includes an `Authorization` header
- WHEN the proxy forwards the request to `api-laravel`
- THEN the forwarded `Authorization` header is the server-attached `Bearer` token only, not the client-supplied value

### Requirement: 401 From Laravel Redirects to Login

WHEN any client page using the shared API layer receives a 401 response
(missing, expired, or invalid session) from `api-laravel` via the proxy, the
client MUST be redirected to `/login`.

#### Scenario: Expired session redirects to login

- GIVEN a client page holds an expired or invalid session
- WHEN it makes a request through the shared API layer and receives a 401
- THEN the user is redirected to `/login`

### Requirement: AuthContext Token Is a Non-Secret Sentinel

The `AuthContext` `token` field MUST be a non-secret truthy sentinel after
login, not a real credential value. It MUST NOT be transmitted anywhere.
Existing `!!token`-style gating MUST continue to function unmodified.

#### Scenario: Sentinel is truthy post-login

- GIVEN a user has successfully logged in
- WHEN `AuthContext.token` is read
- THEN it is a truthy non-secret value and `!!token`-gated logic behaves as authenticated

#### Scenario: Sentinel is falsy post-logout

- GIVEN a user has logged out
- WHEN `AuthContext.token` is read
- THEN it is falsy and `!!token`-gated logic behaves as unauthenticated

### Requirement: Login, Reload, and Logout Work End-to-End

Login, session persistence across a page reload (via the cookie alone, with
no reliance on `localStorage`), and logout MUST all work through the proxy
path.

#### Scenario: Session persists across reload without localStorage

- GIVEN a user has logged in and `localStorage` holds no auth token
- WHEN the page is reloaded
- THEN the user remains authenticated via the session cookie alone

#### Scenario: Logout clears the session

- GIVEN an authenticated user
- WHEN the user logs out
- THEN subsequent requests through the proxy are unauthenticated and `AuthContext.token` is falsy
