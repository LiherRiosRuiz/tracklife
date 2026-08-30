# Tasks: Traefik Edge Security Hardening (pre-launch slice 1)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~220-280 (declarative config, no app code) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR — atomic edge change, sequencing matters more than splitting |
| Delivery strategy | auto-forecast |
| Chain strategy | pending (not applicable — no split triggered) |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Full edge hardening: dashboard gate, headers, Portainer gate, router labels, prod overlay, docs | PR 1 (single) | N/A — declarative infra, no test runner | Manual `curl`/browser checklist in Phase 6 against running `make up` stack | `git revert` the commit; restore `8080:8080` + `insecure: true` for dashboard-only lockout; delete `docker-compose.prod.yml`/`traefik.prod.yml.example` for HTTPS-only revert |

## Phase 1: Traefik Base Hardening (infra/traefik)

- [x] 1.1 Create `infra/traefik/secrets/dashboard_users` via `htpasswd -nbB admin '<password>'` (or `docker run --rm httpd:alpine htpasswd ...`), `chmod 600`. MUST exist before 1.5.
- [x] 1.2 Create `infra/traefik/dynamic/security.yml` with all six middlewares (`sec-baseline`, `sec-csp-app`, `sec-csp-api`, `sec-hsts`, `dashboard-auth`, `internal-only`) per design Interfaces. MUST exist and be valid before restarting Traefik (entrypoint-level `sec-baseline@file` fails all requests otherwise).
- [x] 1.3 Create `infra/traefik/acme.json`: `touch`, `chmod 600`. MUST exist before 1.5.
- [x] 1.4 Modify `infra/traefik/traefik.yml`: `api.insecure: false`; add `websecure:443` entrypoint; `web`/`websecure` entrypoint middlewares (`sec-baseline@file`, plus `sec-hsts@file` on `websecure`); `providers.file` (`/etc/traefik/dynamic`, watch); inert staging `certificatesResolvers.letsencrypt`.
- [x] 1.5 Modify `infra/traefik/docker-compose.yml`: drop `8080:8080`, add `443:443`; mount `./dynamic:/etc/traefik/dynamic:ro`, `./acme.json:/acme.json`, `./secrets/dashboard_users:/etc/traefik/dashboard_users:ro`; dashboard router `middlewares=internal-only@file,dashboard-auth@file`. Depends on 1.1-1.3.
- [x] 1.6 Modify `.gitignore`: append `infra/traefik/acme.json`, `infra/traefik/secrets/`, `infra/traefik/traefik.prod.yml`.
- [x] 1.7 Create `infra/traefik/.env.example`: `DOMAIN`, `ACME_EMAIL`, comment documenting credential generation (no env var — see design Decision).
- [x] 1.8 Restart Traefik (`docker compose up -d traefik` or `make down && make up`) and confirm it starts clean (no crash from missing/invalid `dynamic/security.yml`).

## Phase 2: Portainer Gating (infra/portainer)

- [x] 2.1 Modify `infra/portainer/docker-compose.yml`: add `traefik.http.routers.portainer.middlewares=internal-only@file`.
- [x] 2.2 Modify `infra/portainer/docker-compose.yml`: rebind port `"9100:9000"` → `"127.0.0.1:9100:9000"` so the allowlist cannot be bypassed via the published port.

## Phase 3: Subproject Router Labels + Env

- [x] 3.1 Modify `projects/web/web1-astro/docker-compose.yml`: `Host(\`www.${DOMAIN:-tracklife.test}\`)` rule, `entrypoints=web,websecure`, add `middlewares=${WEB_CSP_MIDDLEWARE:-}`.
- [x] 3.2 Modify `projects/web/web1-astro/.env.example`: add `WEB_CSP_MIDDLEWARE=` (empty; comment: set to `sec-csp-app@file` in prod only).
- [x] 3.3 Modify `projects/web/web3-next/docker-compose.yml`: `Host(\`app.${DOMAIN:-tracklife.test}\`) || Host(\`${DOMAIN:-tracklife.test}\`)` rule, `entrypoints=web,websecure`, add `middlewares=${WEB_CSP_MIDDLEWARE:-}`.
- [x] 3.4 Modify `projects/web/web3-next/.env.example`: add `WEB_CSP_MIDDLEWARE=` (same convention as 3.2).
- [x] 3.5 Modify `projects/web/api-laravel/docker-compose.yml`: `Host(\`api.${DOMAIN:-tracklife.test}\`)` rule, `entrypoints=web,websecure`; update `api-cors` `accesscontrolalloworiginlist` to the `${DOMAIN}` http/https variants; set `middlewares=api-cors,sec-csp-api@file` (CORS first, never replaced).

## Phase 4: Prod Overlay (infra/traefik)

- [x] 4.1 Create `infra/traefik/traefik.prod.yml.example`: copy of `traefik.yml` with `web` entrypoint redirect to `websecure` (permanent, https), `websecure.tls.certResolver: letsencrypt`, `ACME_EMAIL` placeholder comment.
- [x] 4.2 Create `infra/traefik/docker-compose.prod.yml`: mount `./traefik.prod.yml:/traefik.prod.yml:ro`, `command: ["--configFile=/traefik.prod.yml"]`. Never loaded locally.

## Phase 5: Docs Correction

- [x] 5.1 Modify `docs/Deploy TrackLife.md`: insert `## Edge autoalojado (Traefik) — estado real` after "Arquitectura pública" — state `*.test` is HTTP-only today; `websecure:443`/ACME are config-ready but inactive (staging CA, no router/entrypoint requests a cert); dashboard/Portainer are LAN-only; include the activation checklist (domain → DNS/DDNS → copy `traefik.prod.yml.example` + `ACME_EMAIL` → add real API origin to `sec-csp-app` `connect-src` → switch `caServer` to production → `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d` → verify cert → only then consider HSTS `preload`).

## Phase 6: Manual Runtime Verification (maps to proposal Success Criteria + design Testing Strategy)

- [x] 6.1 Dashboard closed: `curl -I http://192.168.20.123:8080` fails to connect; `curl -I http://traefik.test` → 401 without creds, 200 with valid creds. **Partial** — port-8080-closed confirmed (connection refused everywhere, including the sandbox's own loopback); the 401/200 flow could not be exercised end-to-end because the sandbox has no source IP inside `192.168.20.0/24` (see 6.2 note) — every reachable test source is treated as non-allowlisted and short-circuits to 403 before basicauth is evaluated.
- [x] 6.2 Allowlist filters: request from a non-`192.168.20.0/24` source → 403 on `traefik.test` and `portainer.test` — confirmed for both hosts, both via the published port and via direct container-to-container access. Enabled `accessLog` temporarily (reverted after) and confirmed via `conntrack` + access-log `ClientHost`: traffic hitting the **published host port from the same Docker host** (loopback curl, or another local container) is hairpin-NATed by Docker to the bridge gateway IP (`172.18.0.1`), never the real source — this is standard Docker hairpin-NAT behavior for same-host traffic, confirmed by a second test showing **direct container-to-container traffic preserves the real source IP** (`ClientHost` correctly showed the calling container's actual address, not the gateway). This sandbox has no second physical host on a `192.168.20.x`-equivalent LAN to test genuine external traffic end-to-end; based on the confirmed non-masquerading behavior for non-hairpin paths, the design should work correctly for real external LAN clients on the production host, but this must be confirmed with a real second device on `192.168.20.0/24` before fully trusting the control in production. Also found: Traefik's access log does not record `ipAllowList`-rejected (403) requests at all, in any of the tested paths — an observability gap worth knowing about for security auditing, out of scope to fix here.
- [x] 6.3 Headers present: confirmed via `curl -I` on web1/web3/api — all 4 baseline headers present on all three; CSP absent on web1/web3 in dev; `default-src 'none'; frame-ancestors 'none'` present on api.
- [x] 6.4 CORS preserved: confirmed via `curl -X OPTIONS` preflight against `api.test` — all `Access-Control-*` headers present. **Deviation/finding**: the CSP header (`sec-csp-api@file`) is NOT present on the preflight response — Traefik's `headers` middleware short-circuits and answers `OPTIONS` preflights directly from `api-cors` without invoking the next middleware in the chain, so `sec-csp-api` never runs for that response. This exactly matches the design's own Threat Matrix note ("api-cors runs first and may answer OPTIONS itself, so sec-csp-api never sees the preflight"), but contradicts the literal spec scenario "Preflight still returns CORS headers alongside CSP" which asserts both are present simultaneously. Implemented exactly per design's mandated order (`api-cors,sec-csp-api@file`, "CORS first, never replaced"); flagging the spec/design conflict rather than reordering unprompted.
- [x] 6.5 HTTPS still inert: ran a real `make down && make up` full-stack cycle — grepped Traefik logs for acme obtain/issue/renew *activity* (none found; a benign `INFO "Testing certificate renew..."` line always appears at boot as part of Traefik's own resolver bookkeeping — it makes no network call and issues nothing, since no router or entrypoint requests a cert resolver locally); no `Location` redirect to HTTPS on any `*.test` host on port 80.
- [x] 6.6 Bypass check: confirmed via `docker ps` — only Traefik publishes LAN-reachable ports (`80`, `443`); Portainer's `9100` is bound `127.0.0.1:9100:9000` (reachable on loopback, connection refused from the host's real LAN-facing IP).
- [x] 6.7 Browser CSP check against a production build: built web1-astro for production (`astro build`, static output) and served the real `dist/` output through a throwaway nginx container behind Traefik with `sec-csp-app@file` attached — confirmed the CSP header value matches the design's string exactly. **Concrete finding**: static/source inspection of the built HTML found `Layout.astro` loads Google Fonts via external `<link>` tags (`https://fonts.googleapis.com`, `https://fonts.gstatic.com`); the current CSP's `style-src`/`font-src` are `'self'`-only (per Proposal Decision 2, no third-party origins), so **this external stylesheet/font load would be blocked by CSP in production** — a real violation, not a hypothetical one. web3-next's source has no external script/style origins (grep-verified). Could not perform an actual browser-console check or the login/authenticated-API-call flow (no browser tool available in this environment); recommend the orchestrator/user do a manual browser pass before go-live, and either self-host the Google Fonts files or explicitly allow the two font origins if keeping the CDN.
