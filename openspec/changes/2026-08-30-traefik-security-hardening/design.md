# Design: Traefik Edge Security Hardening (pre-launch slice 1)

## Technical Approach

All controls live at the Traefik edge (proposal Decision 3). A new file provider directory
`infra/traefik/dynamic/` holds the six middlewares. `sec-baseline` is attached at the **entrypoint**
level in `traefik.yml` (as the proposal's Approach states), so no router needs a baseline label;
routers add only CSP. HSTS is attached to `websecure` only. Admin surfaces (`traefik.test`,
`portainer.test`) get `internal-only`; the dashboard also gets `dashboard-auth`.

Three Traefik facts constrain the design and drove the decisions below:
1. Traefik static config has **no env interpolation** (proposal Decision 4).
2. The **file provider has no env interpolation either** — so an env-driven basicauth hash cannot
   live in `security.yml`.
3. Static config sources are **mutually exclusive**: with a config file present, `command:` flags are
   ignored. The only supported mix is `--configFile=<path>`.

## Architecture Decisions

### Decision: Dashboard credential storage → mounted `usersFile`, not `.env`

**Choice**: `dashboard-auth` uses `basicAuth.usersFile: /etc/traefik/dashboard_users`, a gitignored
htpasswd file at `infra/traefik/secrets/dashboard_users` (mode 600), mounted read-only **outside**
the watched `dynamic/` directory so the file provider never tries to parse it.
**Alternatives considered**: (a) `${TRAEFIK_DASHBOARD_AUTH}` in `.env` consumed by a compose label on
the Traefik container; (b) the hash inline in `security.yml`.
**Rationale**: (b) is impossible (fact 2). (a) works mechanically but splits the six middlewares
across two files and puts a bcrypt hash — which is full of `$` — through Compose interpolation, where
`$` handling differs between compose-file literals (`$$` required) and `.env` values. That ambiguity
is exactly the proposal's "bad htpasswd hash → dashboard lockout" risk. `usersFile` is read verbatim
by Traefik, keeps all six middlewares in `security.yml`, and still keeps the secret out of git —
which is what the project's `.env` convention actually protects. **This overrides the proposal's
`.env` default; `TRAEFIK_DASHBOARD_AUTH` is therefore not an env var.**

### Decision: Prod overlay swaps the static config file via `--configFile`

**Choice**: `docker-compose.prod.yml` mounts `./traefik.prod.yml` and sets
`command: ["--configFile=/traefik.prod.yml"]`.
**Alternatives considered**: `command:` redirect flags alongside `traefik.yml`; overriding the same
bind-mount target.
**Rationale**: the proposal assumed compose `command:` flags would layer onto `traefik.yml`; they do
not (fact 3). Overriding an identical mount target relies on Compose merge-by-target semantics;
`--configFile` with a distinct target is unambiguous. Cost: ~20 duplicated static lines (drift risk).

### Decision: TLS/certresolver at the entrypoint, not per router

**Choice**: `traefik.prod.yml` sets `entryPoints.websecure.http.tls.certResolver: letsencrypt`. **No
router gets a `certresolver` label, in any file.** Routers are bound to `entrypoints=web,websecure`
in the base compose. Admin routers stay `entrypoints=web` (LAN-only, literal `*.test` hosts, no cert).
**Alternatives considered**: per-router `certresolver` labels in the prod overlay.
**Rationale**: the infra overlay cannot reach labels in `projects/web/*` compose files. Entrypoint-level
TLS covers every router with one line and keeps the base compose provably ACME-free.

## Data Flow

    LAN client ──80──> [web entrypoint: sec-baseline] ──> router
                                                          ├─ dashboard  → internal-only, dashboard-auth → api@internal
                                                          ├─ portainer  → internal-only → :9000
                                                          ├─ web1/web3  → sec-csp-app → :4321 / :3000
                                                          └─ api        → api-cors, sec-csp-api → :8000
    prod only: 80 ──301──> 443 [websecure: sec-baseline, sec-hsts, tls.certResolver]

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `infra/traefik/traefik.yml` | Modify | `insecure: false`, `websecure:443`, entrypoint middlewares, `providers.file`, inert staging resolver |
| `infra/traefik/dynamic/security.yml` | Create | The six middlewares |
| `infra/traefik/traefik.prod.yml.example` | Create | Static config + redirect + `tls.certResolver` + real `ACME_EMAIL` |
| `infra/traefik/docker-compose.yml` | Modify | Drop `8080:8080`, add `443:443`, new mounts, dashboard middlewares |
| `infra/traefik/docker-compose.prod.yml` | Create | `--configFile` swap only |
| `infra/traefik/.env.example` | Create | `DOMAIN`, `ACME_EMAIL` + credential instructions |
| `infra/portainer/docker-compose.yml` | Modify | `+internal-only@file`; bind host port to loopback only (`127.0.0.1:9100:9000`) so the Traefik allowlist can't be bypassed by hitting the published port directly |
| `projects/web/{web1-astro,web3-next,api-laravel}/docker-compose.yml` | Modify | `${DOMAIN}` rules, `entrypoints=web,websecure`; api-laravel gets `sec-csp-api` unconditionally, web1/web3 get `${WEB_CSP_MIDDLEWARE:-}` (empty in dev, set in prod `.env`) |
| `projects/web/{web1-astro,web3-next}/.env.example` | Modify | Add `WEB_CSP_MIDDLEWARE=` (empty default) |
| `.gitignore` | Modify | `acme.json`, `secrets/`, `traefik.prod.yml` |
| `docs/Deploy TrackLife.md` | Modify | New "self-hosted edge" section |

## Interfaces / Contracts

**`infra/traefik/traefik.yml`** (full new content):

```yaml
api:
  dashboard: true
  insecure: false

entryPoints:
  web:
    address: ":80"
    http:
      middlewares: ["sec-baseline@file"]
  websecure:
    address: ":443"
    http:
      middlewares: ["sec-baseline@file", "sec-hsts@file"]

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: traefik_net
  file:
    directory: /etc/traefik/dynamic
    watch: true

# Inert in dev: no router and no entrypoint requests a certificate, so ACME never runs.
certificatesResolvers:
  letsencrypt:
    acme:
      email: "change-me@example.invalid"
      storage: /acme.json
      caServer: "https://acme-staging-v02.api.letsencrypt.org/directory"
      httpChallenge:
        entryPoint: web

log:
  level: INFO
```

**`infra/traefik/dynamic/security.yml`** (full new file):

```yaml
http:
  middlewares:
    sec-baseline:
      headers:
        contentTypeNosniff: true          # X-Content-Type-Options: nosniff
        frameDeny: true                   # X-Frame-Options: DENY
        referrerPolicy: "strict-origin-when-cross-origin"
        permissionsPolicy: "camera=(), microphone=(), geolocation=(), payment=()"

    sec-csp-app:
      headers:
        contentSecurityPolicy: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' http://api.tracklife.test"

    sec-csp-api:
      headers:
        contentSecurityPolicy: "default-src 'none'; frame-ancestors 'none'"

    sec-hsts:
      headers:
        stsSeconds: 15552000
        stsIncludeSubdomains: true
        stsPreload: false

    dashboard-auth:
      basicAuth:
        usersFile: "/etc/traefik/dashboard_users"
        realm: "TrackLife admin"
        removeHeader: true

    internal-only:
      ipAllowList:
        sourceRange:
          - "192.168.20.0/24"
          - "127.0.0.1/32"
```

`connect-src` is a literal because the file provider cannot interpolate `${DOMAIN}`; the activation
checklist must add the real API origin here when the domain is bought.

**`infra/traefik/traefik.prod.yml.example`** — identical to `traefik.yml` except:

```yaml
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint: { to: websecure, scheme: https, permanent: true }
  websecure:
    address: ":443"
    http:
      middlewares: ["sec-baseline@file", "sec-hsts@file"]
      tls:
        certResolver: letsencrypt
certificatesResolvers:
  letsencrypt:
    acme:
      email: "REPLACE_WITH_ACME_EMAIL"   # value of ACME_EMAIL from .env
```

**Label changes** (chained middlewares are one ordered comma-separated label; file-provider
middlewares need the `@file` suffix, docker-provider ones do not):

```yaml
# infra/traefik/docker-compose.yml  (dashboard router — host stays literal traefik.test)
- "traefik.http.routers.dashboard.middlewares=internal-only@file,dashboard-auth@file"

# infra/portainer/docker-compose.yml
- "traefik.http.routers.portainer.middlewares=internal-only@file"
# ports: change "9100:9000" -> "127.0.0.1:9100:9000" (loopback-only host bind;
# otherwise the published port bypasses Traefik/internal-only entirely, exactly
# like the dashboard's old 8080 did)

# web1-astro (base compose — CSP intentionally NOT added here, see below)
- "traefik.http.routers.web1.rule=Host(`www.${DOMAIN:-tracklife.test}`)"
- "traefik.http.routers.web1.entrypoints=web,websecure"

# web3-next (base compose — CSP intentionally NOT added here, see below)
- "traefik.http.routers.tracklife.rule=Host(`app.${DOMAIN:-tracklife.test}`) || Host(`${DOMAIN:-tracklife.test}`)"
- "traefik.http.routers.tracklife.entrypoints=web,websecure"

# api-laravel — existing api-cors is KEPT and chained first, never replaced.
# API CSP stays active in dev too (JSON responses have no scripts/HMR to break).
- "traefik.http.routers.api.rule=Host(`api.${DOMAIN:-tracklife.test}`)"
- "traefik.http.routers.api.entrypoints=web,websecure"
- "traefik.http.middlewares.api-cors.headers.accesscontrolalloworiginlist=http://app.${DOMAIN:-tracklife.test},http://${DOMAIN:-tracklife.test},http://www.${DOMAIN:-tracklife.test},https://app.${DOMAIN:-tracklife.test},https://${DOMAIN:-tracklife.test},https://www.${DOMAIN:-tracklife.test}"
- "traefik.http.routers.api.middlewares=api-cors,sec-csp-api@file"
```

**App CSP is prod-only** (resolved Open Question above). Correction: `web1-astro` and `web3-next`
live in their **own** separate compose projects/directories, not under `infra/traefik`'s compose —
the same reason Decision 3 already gives for why TLS/`certresolver` couldn't be set via a shared
infra overlay. `docker-compose.prod.yml` therefore cannot reach their labels either. Unlike
Traefik's static/file config, **Compose labels DO support env interpolation**, so each subproject's
own `.env` (not Traefik's) gates the label — same mechanism already used for `${DOMAIN}`:

```yaml
# projects/web/web1-astro/docker-compose.yml and projects/web/web3-next/docker-compose.yml (base, unchanged path):
- "traefik.http.routers.web1.middlewares=${WEB_CSP_MIDDLEWARE:-}"        # web1-astro
- "traefik.http.routers.tracklife.middlewares=${WEB_CSP_MIDDLEWARE:-}"   # web3-next
```

```dotenv
# projects/web/{web1-astro,web3-next}/.env.example
# Leave unset/empty for local dev (npm run dev's HMR needs 'unsafe-eval', which the CSP blocks).
# Set to sec-csp-app@file in production, once verified against a production build.
WEB_CSP_MIDDLEWARE=
```

An empty Traefik router `middlewares` label is a no-op (equivalent to omitting it), so this is safe
in dev with the variable unset.

**`infra/traefik/docker-compose.yml`** — `ports` becomes `["80:80", "443:443"]` (the `8080:8080` line
is deleted); volumes add:

```yaml
      - ./dynamic:/etc/traefik/dynamic:ro
      - ./acme.json:/acme.json                              # touch + chmod 600 BEFORE first up
      - ./secrets/dashboard_users:/etc/traefik/dashboard_users:ro
```

**`infra/traefik/docker-compose.prod.yml`**:

```yaml
services:
  traefik:
    volumes:
      - ./traefik.prod.yml:/traefik.prod.yml:ro
    command: ["--configFile=/traefik.prod.yml"]
```

**`infra/traefik/.env.example`**:

```dotenv
# Public domain. Local default is tracklife.test; each compose file reads the .env
# next to itself, so DOMAIN must be set per project dir (or exported before `make up`).
DOMAIN=tracklife.test

# ACME account email. Traefik static YAML does NOT interpolate env vars, so this value
# is copied into traefik.prod.yml (from traefik.prod.yml.example) at deploy time.
ACME_EMAIL=you@example.com

# Dashboard credential is NOT an env var (see design Decision 1). Generate it as a file:
#   mkdir -p secrets
#   htpasswd -nbB admin 'STRONG_PASSWORD' > secrets/dashboard_users
#   chmod 600 secrets/dashboard_users
# Without apache2-utils:
#   docker run --rm httpd:alpine htpasswd -nbB admin 'STRONG_PASSWORD' > secrets/dashboard_users
```

**`.gitignore`** — append:

```gitignore
# Traefik runtime secrets / generated config
infra/traefik/acme.json
infra/traefik/secrets/
infra/traefik/traefik.prod.yml
```

**`docs/Deploy TrackLife.md`** — the doc only describes the Vercel/Railway path and makes no claim
about the self-hosted edge, so the correction is **additive**: insert a section
`## Edge autoalojado (Traefik) — estado real` after "Arquitectura pública" stating (in the doc's
Spanish) that `*.test` is served **solo por HTTP**; that `websecure:443` and the ACME resolver exist
but are **inactivos** (staging CA, no router or entrypoint requests a certificate, `acme.json` empty);
that dashboard and Portainer are LAN-only; and an activation checklist: buy domain → DNS/DDNS →
`cp traefik.prod.yml.example traefik.prod.yml` + paste `ACME_EMAIL` → add the real API origin to
`sec-csp-app` `connect-src` → switch `caServer` to production → `docker compose -f docker-compose.yml
-f docker-compose.prod.yml up -d` → verify certificate → only then consider HSTS `preload`.

## Testing Strategy

No unit/integration runner applies (declarative infra). Verification is a manual runtime checklist
mapped 1:1 to the proposal's Success Criteria.

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Runtime | Dashboard closed | `curl -I http://192.168.20.123:8080` connection-refused; `http://traefik.test` → 401, then 200 with creds |
| Runtime | Allowlist actually filters | Request from a non-`192.168.20.0/24` source → 403 for `traefik.test` and `portainer.test` |
| Runtime | Headers present | `curl -I` on web1/web3/api for the 4 baseline headers + the correct CSP per router |
| Runtime | CORS preserved | `curl -X OPTIONS -H 'Origin: …' -H 'Access-Control-Request-Method: POST'` still returns the CORS headers |
| Runtime | HTTPS still inert | `make down && make up`, then `grep -i acme` in Traefik logs → no issuance attempt; no 301 to https |
| Browser | CSP does not break the apps | Load web3 and web1, zero CSP violations in console (see risk below — run against production builds) |

## Threat Matrix

The reference matrix covers shell/VCS/PR boundaries; this change has none of them.

| Boundary | Applicability |
|---|---|
| Documentation-like paths | N/A — no file classification or execution |
| Git repository selection | N/A — no VCS automation |
| Commit state | N/A |
| Push state | N/A |
| PR commands | N/A |

HTTP-routing adversarial cases, which **are** applicable, are covered by these design responses:

| Routing case | Design response | Verification (must run before merge) |
|---|---|---|
| Source IP rewritten before Traefik sees it | `ipAllowList` trusts `RemoteAddr`. Docker's userland proxy and the repo's WSL2 `netsh portproxy` path (`infra/scripts/portproxy.sh`) can both replace the client IP with a gateway/host address — the allowlist would then allow everyone or nobody | Temporarily enable `accessLog` and confirm `ClientHost` for a real LAN request is a `192.168.20.x` address **before** trusting the 403 result |
| Traefik bypass via published container ports | `8080` is removed; Portainer's `9100` is rebound to `127.0.0.1:9100:9000` (loopback-only, resolved above) | `docker ps` — no service other than Traefik may publish a LAN-reachable port |
| CORS preflight vs. chained CSP | `api-cors` runs first and may answer `OPTIONS` itself, so `sec-csp-api` never sees the preflight; disjoint header sets, no conflict | Preflight `curl` in the table above |
| Missing/invalid dynamic file | Entrypoint-level `sec-baseline@file` fails **all** requests, not one router | Create `dynamic/security.yml` before restarting Traefik; smoke every host after |

## Migration / Rollout

No data migration. Order matters at apply time: create `dynamic/security.yml`, `acme.json` (mode 600)
and `secrets/dashboard_users` **before** restarting Traefik — entrypoint-level `sec-baseline@file`
means a missing or unparseable `security.yml` fails every request, not just one router. Rollback is
the proposal's four-step plan unchanged.

## Open Questions — resolved by orchestrator (2026-08-30)

- [x] **Portainer's `9100:9000` host port defeats Decision 1b.** Resolved: bind it to loopback only,
      `127.0.0.1:9100:9000` in `infra/portainer/docker-compose.yml`. This is not a new tradeoff — it's
      the literal implementation of the user's already-stated decision ("Portainer must not be
      reachable from outside the LAN"); without it, `internal-only@file` is cosmetic. Added to File
      Changes and Interfaces below.
- [x] **CSP vs. dev servers.** Resolved: `sec-csp-app` is attached to the app routers **only in
      `docker-compose.prod.yml`** (an added label there), not in the base compose — same staging
      pattern already used for the HTTPS redirect and `certResolver`. Local dev over `*.test` keeps
      working exactly as today (no CSP, so no HMR/`eval` breakage); the CSP only activates alongside
      HTTPS at go-live, when it's verified against production builds anyway per the Testing Strategy.
      `sec-baseline` (which breaks nothing) stays entrypoint-level and active everywhere, dev included.
- [x] **`DOMAIN` per project directory's `.env`.** Resolved: accepted as-is — consistent with the
      existing per-service `.env`/`.env.example` convention already used across this repo (each
      subproject already keeps its own `.env`; `DOMAIN` follows the same pattern, no shell export
      needed).
