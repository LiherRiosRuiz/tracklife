# Proposal: Traefik Edge Security Hardening (pre-launch slice 1)

Subprojects targeted: **infra** (`infra/traefik`) primarily, plus Traefik *label-only* edits in
`api-laravel`, `web3-next`, `web1-astro` compose files. No application code changes.
`web2-nuxt` files are **not** touched (it inherits entrypoint headers at runtime only).

## Intent

The machine is about to be publicly exposed. Today the edge has: an **unauthenticated Traefik
dashboard** on host port `8080` (`api.insecure: true`), **zero security headers at any layer**,
and **no HTTPS listener at all** (`web:80` only, no `certificatesResolvers`). The domain is not
purchased, so real certificates cannot be issued. This change closes the two exploitable gaps now
(dashboard, headers) and ships HTTPS **staged and inactive** so activation is a value change, not
a redesign. It does **not** make HTTPS live.

## Scope

### In Scope
- Close the dashboard: `api.insecure: false`, drop the `8080:8080` host mapping, keep the
  `traefik.test` router behind basicauth + LAN IP allowlist (Decision 1).
- Gate Portainer the same way: `portainer.test` router gets the same `internal-only` LAN
  IPAllowList middleware as the dashboard (Decision 1b — user confirmed Portainer must not be
  reachable from the public internet; it's a Docker-management panel, compromising it means
  compromising the host).
- Three security-header middlewares (baseline / app-CSP / api-CSP) + an HSTS middleware bound to
  `websecure` only (Decisions 2, 3).
- `websecure` `:443` entrypoint + ACME `certificatesResolvers` (Let's Encrypt **staging** CA,
  `acme.json` gitignored, mode 600). No router requests a cert in dev, so ACME never fires.
- A `docker-compose.prod.yml` overlay carrying the HTTP→HTTPS redirect and cert resolver, never
  loaded locally (Decision 4). `${DOMAIN:-tracklife.test}` parameterization in compose labels.
- Correct `docs/Deploy TrackLife.md`: HTTPS is config-ready, **not** active.

### Out of Scope
- Anything from the exploration's "Explicitly out of scope" list: backend `authorize()` hardening,
  `web3-next` localStorage token removal, SEO/UX fixes, legal pages, Mongo encryption, CI scanning.
- Buying the domain, DNS records, static-vs-dynamic IP resolution, real cert issuance, HSTS preload
  submission (go-live-time actions, not this change).
- **CSP nonce plumbing for Next.js** (requires app middleware, not infra — stays out of THIS
  change to keep it infra-only per Decision 3). Given the user confirmed a real public launch from
  day one (not a soft launch), this is elevated to the **immediate next change** right after this
  one, not an indefinitely-deferred item — `'unsafe-inline'` on script/style is an acceptable
  interim for launch day, not for staying in place long-term at real-user scale.

## Capabilities

### New Capabilities
- `edge-security`: reverse-proxy-level HTTP response security headers, admin-surface access
  control, and TLS entrypoint/certificate configuration.

### Modified Capabilities
- None.

## Approach

Apply security at the **Traefik edge**, not per framework. A `providers.file` dynamic config
directory (`infra/traefik/dynamic/`) holds the middlewares; the baseline set is attached at the
`web`/`websecure` entrypoint level so every router inherits it with zero per-service labels. CSP
is *not* entrypoint-level, because a policy strict enough to matter would break Portainer's UI.

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Traefik dashboard | **Gate, don't remove.** `api.insecure: false`, delete the `8080:8080` port mapping, keep `Host(traefik.test)` router with `dashboard-auth` (basicauth, hashed credential from env) + `internal-only` (IPAllowList `192.168.20.0/24`, `127.0.0.1`) | The user's `traefik.test` debugging workflow survives (now with a login); removing it entirely deletes the only routing-introspection tool on a self-hosted box. Dropping the host port removes the bypass path — the dashboard is then reachable only *through* Traefik, where middlewares apply. Two independent controls (credential + network) because basicauth alone over plain HTTP leaks the credential |
| 1b | Portainer | Same `internal-only` IPAllowList applied to the `portainer.test` router. No basicauth added (Portainer already has its own login) | User confirmed Portainer must stay LAN-only even once the domain is live — it can exec into any container (including `api-laravel`, with a path to Mongo) and spawn new ones with host access. A public Portainer login, alone, is not an acceptable barrier for that level of power on a machine about to hold real user health data |
| 2 | Header set | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`. **App CSP**: `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' <api-origin>`. **API CSP**: `default-src 'none'; frame-ancestors 'none'`. **HSTS**: `max-age=15552000` (180 días), `includeSubDomains`, no `preload` yet, `websecure` only. `X-XSS-Protection` deliberately **omitted** | User confirmed this is a real public launch from day one, not a soft launch — HSTS max-age bumped from the soft-launch default (300s) to 180 days with `includeSubDomains` accordingly. `preload` is intentionally still withheld: it requires submitting the domain to the browser preload list, which only makes sense once HTTPS has been live and stable in production for a while — that's a go-live-time action (see Dependencies), not something to flip on before the domain even exists. `'unsafe-inline'` on script/style remains for THIS change (removing it needs CSP nonce plumbing, which is app code, not infra — see Decision 3 and the note below on why that's the immediate next change instead of being folded in here). The policy still blocks external script origins, framing, `<base>` injection, plugins, and arbitrary `connect-src` egress — real defense, not a no-op. `X-XSS-Protection` is obsolete and introduces its own XSS vector |
| 3 | Application layer | **Traefik middleware is the single primary layer**; no Laravel middleware, no `next.config.ts` `headers()`, no Astro meta tags | One definition covers all three subprojects plus Portainer, applies uniformly to error pages and non-HTML responses, and survives framework upgrades. Framework-level headers would mean three implementations drifting apart, and `web1-astro` (static) has no server to set them. Accepted gap: a container reached directly, bypassing Traefik, gets no headers |
| 4 | HTTPS staging | Base config always defines `websecure` + ACME resolver but **no redirect and no router `certresolver`**. The redirect (`entrypoints.web.http.redirections.entryPoint.to=websecure`) and cert resolver live in `docker-compose.prod.yml`, loaded only in production | Cleaner than an env-conditional redirect: Traefik's **static YAML does not interpolate env vars**, so `DOMAIN`-driven branching inside `traefik.yml` is not possible — compose `command:` flags and labels *are* interpolated. An unused `:443` listener and an idle ACME resolver are inert (ACME only runs when a router asks for a cert), so local `*.test` HTTP is provably unaffected |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `infra/traefik/traefik.yml` | Modified | `insecure: false`; `websecure:443`; `certificatesResolvers`; `providers.file`; entrypoint-level baseline middleware |
| `infra/traefik/dynamic/security.yml` | New | `sec-baseline`, `sec-csp-app`, `sec-csp-api`, `sec-hsts`, `dashboard-auth`, `internal-only` |
| `infra/portainer/docker-compose.yml` (or wherever Portainer's router labels live) | Modified | `+internal-only` middleware on the `portainer.test` router (Decision 1b) |
| `infra/traefik/docker-compose.yml` | Modified | Remove `8080:8080`; dashboard middlewares; mount `dynamic/` + `acme.json` |
| `infra/traefik/docker-compose.prod.yml` | New | HTTP→HTTPS redirect + cert resolver overlay |
| `infra/traefik/.env.example`, `.gitignore` | New/Modified | `DOMAIN`, `ACME_EMAIL`, `TRAEFIK_DASHBOARD_AUTH`; ignore `acme.json` |
| `projects/web/web3-next/docker-compose.yml` | Modified | `+sec-csp-app` label, `${DOMAIN}` host rule |
| `projects/web/web1-astro/docker-compose.yml` | Modified | `+sec-csp-app` label, `${DOMAIN}` host rule |
| `projects/web/api-laravel/docker-compose.yml` | Modified | `middlewares=api-cors,sec-csp-api`; `${DOMAIN}` host rule and CORS origin list |
| `docs/Deploy TrackLife.md` | Modified | Honest current state; documented activation checklist |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| CSP breaks web3-next hydration or web1-astro rendering | Med | `'unsafe-inline'` on script/style by design; manual smoke of both apps + browser console CSP violations is a success criterion before merge |
| Entrypoint-level baseline headers break Portainer / web2-nuxt | Low | Baseline set contains no CSP; `frameDeny` + `nosniff` are safe for both. CSP is per-router, never global |
| Losing dashboard access (bad htpasswd hash, wrong LAN range) | Med | Compose `command:` fallback documented in the deploy doc; `8080` mapping restorable in one line during rollback |
| CORS middleware and new header middleware conflict on the API router | Low | Chained as `api-cors,sec-csp-api` — separate middlewares, disjoint header sets; verified with a preflight `OPTIONS` check |
| Someone later "activates" HTTPS by editing `traefik.yml` and hits ACME rate limits | Med | Staging CA is the default; switching to production CA is an explicit documented step |
| `acme.json` committed or world-readable | Low | Gitignored and `chmod 600` as an explicit task; Traefik refuses to start otherwise |
| Change looks done but HTTPS is not live | High | Stated in Intent, Scope, docs, and Success Criteria — this ships config, not a working certificate |

## Rollback Plan

Fully revertible by config; no data, no schema, no build artifacts.

1. **Full revert**: `git revert` the change and `make down && make up`. Every file above is
   declarative config; there is no migration to undo. `acme.json` is untracked and can be deleted.
2. **Partial — dashboard lockout**: restore `- "8080:8080"` and `insecure: true` in
   `infra/traefik/docker-compose.yml` / `traefik.yml`, restart Traefik only. Independent of headers.
3. **Partial — CSP breakage**: remove the `sec-csp-app` label from the affected router and restart
   that one service; baseline headers and the dashboard fix stay in place.
4. **Partial — HTTPS**: nothing to roll back — the prod overlay is never loaded locally; deleting
   `docker-compose.prod.yml` is sufficient.

## Dependencies

- **Domain purchase** — blocks real certificate issuance. Not part of this change.
- **Static-vs-dynamic IP** — unconfirmed; a dynamic IP additionally requires DDNS before DNS can
  point here. Go-live dependency, not a dependency of this change.
- `htpasswd` (apache2-utils) or an equivalent bcrypt generator for the dashboard credential.
- No new images, no new packages, no Mongo change.

## Success Criteria

- [ ] `curl -I http://192.168.20.123:8080` fails to connect; `http://traefik.test` returns `401`
      without credentials and the dashboard with them; requests from outside the allowlisted range
      get `403`.
- [ ] `http://portainer.test` from an allowlisted LAN address still works unchanged; simulated
      access from outside the range gets `403`.
- [ ] `curl -I` against web1, web3 and the API shows `X-Content-Type-Options`, `X-Frame-Options`,
      `Referrer-Policy`, `Permissions-Policy`; the two web apps show the app CSP and the API shows
      the `default-src 'none'` CSP.
- [ ] `web3-next` dashboard and `web1-astro` landing load with **zero** CSP violations in the
      browser console; login and at least one authenticated API call still work.
- [ ] An API preflight `OPTIONS` still returns the existing CORS headers.
- [ ] `make down && make up` succeeds and all `*.test` hosts still serve over plain HTTP —
      no redirect to HTTPS, no ACME attempt in the Traefik logs.
- [ ] `traefik.yml` contains a `websecure` entrypoint and a cert resolver; `acme.json` is
      gitignored; `.env.example` documents `DOMAIN` / `ACME_EMAIL` / `TRAEFIK_DASHBOARD_AUTH`.
- [ ] `docs/Deploy TrackLife.md` states HTTPS is staged-not-active and lists the activation steps.

## Proposal question round — resolved

Answered directly by the user (2026-08-30):

1. **Dashboard usage** — confirmed yes, used from the LAN only. Gate, don't remove (Decision 1).
2. **Portainer exposure** — user initially wanted it public, then agreed to gate it after the
   orchestrator flagged the risk (Portainer can exec into containers and spawn new ones with host
   access — a public login alone is not an acceptable barrier for that). Gated identically to the
   dashboard (Decision 1b).
3. **Third-party origins** — none for now. CSP stays `'self'`-only for scripts/styles/fonts.
4. **Public audience at go-live** — real public launch from day one, not a soft launch. HSTS
   bumped to 180 days + `includeSubDomains` (Decision 2). CSP nonce work (removing
   `'unsafe-inline'`) is elevated to the immediate next change rather than an indefinite deferral.
5. **Credential storage** — defaults to `.env` (unresolved by explicit answer, but consistent with
   this project's existing secret-handling convention; revisit at design time if this needs to
   change).
