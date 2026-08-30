# Edge Security Specification

## Purpose

Reverse-proxy-level (Traefik) controls for the public launch: access control on
admin surfaces (dashboard, Portainer), baseline/CSP security headers on every
app and API response, and a staged-but-inactive HTTPS/HSTS configuration for
local development. No application code enforces these controls — Traefik is
the single point of enforcement.

## Requirements

### Requirement: Dashboard Requires Auth AND LAN Allowlist

The Traefik dashboard (`traefik.test`) MUST require both a valid basicauth
credential AND a source IP within the LAN allowlist (`192.168.20.0/24`,
`127.0.0.1`). Each control MUST be enforced independently — satisfying only
one MUST NOT grant access. The dashboard MUST NOT be reachable via a direct
host port (`8080`) bypassing Traefik.

#### Scenario: Allowlisted IP without credentials is rejected

- GIVEN a request from an allowlisted LAN IP
- WHEN it calls `http://traefik.test` with no credentials
- THEN the response status is 401

#### Scenario: Correct credentials from outside the allowlist are rejected

- GIVEN a request from a non-allowlisted IP with valid basicauth credentials
- WHEN it calls `http://traefik.test`
- THEN the response status is 403

#### Scenario: Both controls satisfied grants access

- GIVEN a request from an allowlisted IP with valid basicauth credentials
- WHEN it calls `http://traefik.test`
- THEN the dashboard is returned with status 200

#### Scenario: Direct host port is unreachable

- GIVEN Traefik is running
- WHEN a client connects to host port `8080`
- THEN the connection fails (no listener)

### Requirement: Portainer Restricted to LAN Allowlist

`portainer.test` MUST be reachable only from a source IP within the LAN
allowlist, using the same IPAllowList middleware as the dashboard. No
basicauth MUST be required at the Traefik layer (Portainer has its own login).

#### Scenario: Allowlisted IP reaches Portainer

- GIVEN a request from an allowlisted LAN IP
- WHEN it calls `http://portainer.test`
- THEN Portainer's login page is returned with status 200

#### Scenario: Non-allowlisted IP is rejected

- GIVEN a request from a non-allowlisted IP
- WHEN it calls `http://portainer.test`
- THEN the response status is 403

### Requirement: Baseline Security Headers on Every Response

Every HTTP response from `web1-astro`, `web3-next`, and `api-laravel` MUST
include `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`
denying `camera`, `microphone`, `geolocation`, and `payment`.

#### Scenario: Baseline headers present on a normal response

- GIVEN any of `web1.test`, `web3.test`, `api.test` is running
- WHEN a client requests any route
- THEN the response includes all four baseline headers with the specified values

### Requirement: Content-Security-Policy per Surface

`web1-astro` and `web3-next` responses MUST include an app CSP restricting
`script-src`/`style-src`/`font-src` to `'self'` (with `'unsafe-inline'`
permitted on `script-src` and `style-src` only) and MUST NOT allow any
external origin, **in production**. `api-laravel` responses MUST include an
API CSP of `default-src 'none'; frame-ancestors 'none'` in both dev and
production (JSON responses have no scripts/HMR to break). The app CSP MUST
NOT be enforced in local/dev, since the dev servers' HMR requires `'unsafe-eval'`,
which this CSP blocks — enforcing it in dev would break the development
workflow, not just harden production.

#### Scenario: Web app CSP is self-only in production

- GIVEN `web1.test` or `web3.test` is running with the production CSP label active
- WHEN a client requests a page
- THEN the CSP header restricts script/style/font to `'self'` (plus inline for script/style) with no external origins

#### Scenario: Web app CSP is absent in local/dev

- GIVEN `web1.test` or `web3.test` is running in the local/dev configuration
- WHEN a client requests a page
- THEN no `Content-Security-Policy` header restricting the app is present, so HMR/`eval` is not blocked

#### Scenario: API CSP is near-empty

- GIVEN `api.test` is running
- WHEN a client requests any endpoint
- THEN the CSP header is `default-src 'none'; frame-ancestors 'none'`

### Requirement: HSTS Only on websecure

Responses on the `websecure` (`:443`) entrypoint MUST include
`Strict-Transport-Security: max-age=15552000; includeSubDomains`. Responses on
the `web` (`:80`) entrypoint MUST NOT include an HSTS header.

#### Scenario: HSTS present on websecure

- GIVEN a request reaches the `websecure` entrypoint
- WHEN the response is returned
- THEN it includes `Strict-Transport-Security: max-age=15552000; includeSubDomains`

#### Scenario: HSTS absent on plain HTTP

- GIVEN a request reaches the `web` (`:80`) entrypoint
- WHEN the response is returned
- THEN no `Strict-Transport-Security` header is present

### Requirement: No Forced HTTPS Redirect or ACME in Local/Dev

The local/dev compose configuration MUST NOT redirect `web` (`:80`) requests
to HTTPS; the redirect MUST exist only in `docker-compose.prod.yml`, never
loaded locally. No router in the local configuration MUST request a
certificate resolver, so ACME MUST NOT fire locally.

#### Scenario: Plain HTTP served without redirect

- GIVEN the local compose stack is running (`docker-compose.prod.yml` not loaded)
- WHEN a client requests `http://web1.test`
- THEN the response status is 200 with no `Location` redirect to HTTPS

#### Scenario: No ACME attempt on local startup

- GIVEN the local compose stack starts up
- WHEN Traefik logs are inspected
- THEN no certificate request/ACME attempt is logged

### Requirement: CORS and API CSP Chained, Not Replaced

`api-laravel` responses MUST carry both the existing CORS headers and the API
CSP header simultaneously. The CSP middleware MUST be chained after the CORS
middleware, not substituted for it.

#### Scenario: Preflight still returns CORS headers alongside CSP

- GIVEN `api.test` has both `api-cors` and `sec-csp-api` middlewares attached
- WHEN a client sends an `OPTIONS` preflight request
- THEN the response includes the correct `Access-Control-*` headers
- AND the response includes `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`
