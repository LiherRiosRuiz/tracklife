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

- [ ] 1.1 Create `infra/traefik/secrets/dashboard_users` via `htpasswd -nbB admin '<password>'` (or `docker run --rm httpd:alpine htpasswd ...`), `chmod 600`. MUST exist before 1.5.
- [ ] 1.2 Create `infra/traefik/dynamic/security.yml` with all six middlewares (`sec-baseline`, `sec-csp-app`, `sec-csp-api`, `sec-hsts`, `dashboard-auth`, `internal-only`) per design Interfaces. MUST exist and be valid before restarting Traefik (entrypoint-level `sec-baseline@file` fails all requests otherwise).
- [ ] 1.3 Create `infra/traefik/acme.json`: `touch`, `chmod 600`. MUST exist before 1.5.
- [ ] 1.4 Modify `infra/traefik/traefik.yml`: `api.insecure: false`; add `websecure:443` entrypoint; `web`/`websecure` entrypoint middlewares (`sec-baseline@file`, plus `sec-hsts@file` on `websecure`); `providers.file` (`/etc/traefik/dynamic`, watch); inert staging `certificatesResolvers.letsencrypt`.
- [ ] 1.5 Modify `infra/traefik/docker-compose.yml`: drop `8080:8080`, add `443:443`; mount `./dynamic:/etc/traefik/dynamic:ro`, `./acme.json:/acme.json`, `./secrets/dashboard_users:/etc/traefik/dashboard_users:ro`; dashboard router `middlewares=internal-only@file,dashboard-auth@file`. Depends on 1.1-1.3.
- [ ] 1.6 Modify `.gitignore`: append `infra/traefik/acme.json`, `infra/traefik/secrets/`, `infra/traefik/traefik.prod.yml`.
- [ ] 1.7 Create `infra/traefik/.env.example`: `DOMAIN`, `ACME_EMAIL`, comment documenting credential generation (no env var — see design Decision).
- [ ] 1.8 Restart Traefik (`docker compose up -d traefik` or `make down && make up`) and confirm it starts clean (no crash from missing/invalid `dynamic/security.yml`).

## Phase 2: Portainer Gating (infra/portainer)

- [ ] 2.1 Modify `infra/portainer/docker-compose.yml`: add `traefik.http.routers.portainer.middlewares=internal-only@file`.
- [ ] 2.2 Modify `infra/portainer/docker-compose.yml`: rebind port `"9100:9000"` → `"127.0.0.1:9100:9000"` so the allowlist cannot be bypassed via the published port.

## Phase 3: Subproject Router Labels + Env

- [ ] 3.1 Modify `projects/web/web1-astro/docker-compose.yml`: `Host(\`www.${DOMAIN:-tracklife.test}\`)` rule, `entrypoints=web,websecure`, add `middlewares=${WEB_CSP_MIDDLEWARE:-}`.
- [ ] 3.2 Modify `projects/web/web1-astro/.env.example`: add `WEB_CSP_MIDDLEWARE=` (empty; comment: set to `sec-csp-app@file` in prod only).
- [ ] 3.3 Modify `projects/web/web3-next/docker-compose.yml`: `Host(\`app.${DOMAIN:-tracklife.test}\`) || Host(\`${DOMAIN:-tracklife.test}\`)` rule, `entrypoints=web,websecure`, add `middlewares=${WEB_CSP_MIDDLEWARE:-}`.
- [ ] 3.4 Modify `projects/web/web3-next/.env.example`: add `WEB_CSP_MIDDLEWARE=` (same convention as 3.2).
- [ ] 3.5 Modify `projects/web/api-laravel/docker-compose.yml`: `Host(\`api.${DOMAIN:-tracklife.test}\`)` rule, `entrypoints=web,websecure`; update `api-cors` `accesscontrolalloworiginlist` to the `${DOMAIN}` http/https variants; set `middlewares=api-cors,sec-csp-api@file` (CORS first, never replaced).

## Phase 4: Prod Overlay (infra/traefik)

- [ ] 4.1 Create `infra/traefik/traefik.prod.yml.example`: copy of `traefik.yml` with `web` entrypoint redirect to `websecure` (permanent, https), `websecure.tls.certResolver: letsencrypt`, `ACME_EMAIL` placeholder comment.
- [ ] 4.2 Create `infra/traefik/docker-compose.prod.yml`: mount `./traefik.prod.yml:/traefik.prod.yml:ro`, `command: ["--configFile=/traefik.prod.yml"]`. Never loaded locally.

## Phase 5: Docs Correction

- [ ] 5.1 Modify `docs/Deploy TrackLife.md`: insert `## Edge autoalojado (Traefik) — estado real` after "Arquitectura pública" — state `*.test` is HTTP-only today; `websecure:443`/ACME are config-ready but inactive (staging CA, no router/entrypoint requests a cert); dashboard/Portainer are LAN-only; include the activation checklist (domain → DNS/DDNS → copy `traefik.prod.yml.example` + `ACME_EMAIL` → add real API origin to `sec-csp-app` `connect-src` → switch `caServer` to production → `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d` → verify cert → only then consider HSTS `preload`).

## Phase 6: Manual Runtime Verification (maps to proposal Success Criteria + design Testing Strategy)

- [ ] 6.1 Dashboard closed: `curl -I http://192.168.20.123:8080` fails to connect; `curl -I http://traefik.test` → 401 without creds, 200 with valid creds.
- [ ] 6.2 Allowlist filters: request from a non-`192.168.20.0/24` source → 403 on `traefik.test` and `portainer.test`. Before trusting any 403, temporarily enable `accessLog` and confirm `ClientHost` for a real LAN request shows a `192.168.20.x` address (rewritten-IP threat case).
- [ ] 6.3 Headers present: `curl -I` on web1/web3/api shows all 4 baseline headers; CSP absent on web1/web3 in dev, `default-src 'none'; frame-ancestors 'none'` on api in both dev and prod.
- [ ] 6.4 CORS preserved: `curl -X OPTIONS -H 'Origin: …' -H 'Access-Control-Request-Method: POST'` against `api.test` still returns `Access-Control-*` headers alongside the CSP header.
- [ ] 6.5 HTTPS still inert: `make down && make up`; grep Traefik logs for `acme` (none); no `Location` redirect on any `*.test` host.
- [ ] 6.6 Bypass check: `docker ps` — only Traefik publishes a LAN-reachable port (Portainer's `9100` bound to `127.0.0.1` only).
- [ ] 6.7 Browser CSP check against a production build: build web1-astro/web3-next for production, temporarily set `WEB_CSP_MIDDLEWARE=sec-csp-app@file`, load both apps, confirm zero CSP console violations and that login + one authenticated API call still work; revert the env var after the check.
