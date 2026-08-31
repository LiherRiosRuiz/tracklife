# Exploration: Traefik/infra security hardening (pre-launch, slice 1 of N)

Status: complete (findings below are the Traefik/infra-relevant subset of a
broader pre-launch audit covering ~30 requirements across security, legal,
SEO, and UX; the full audit is summarized in this file's "Context" section
for traceability, but only the infra/Traefik items are in scope for THIS
change — backend hardening, frontend SEO/UX fixes, and legal/content items
are separate follow-up changes).

## Context: full pre-launch audit summary (2026-08-29/30)

User decision: self-host everything on this machine (own hardware, publicly
exposed to the internet), not Vercel/Railway/Atlas. Domain: **not purchased
yet** — this blocks real Let's Encrypt certificate issuance (ACME needs a
resolvable domain to validate ownership). Static-vs-dynamic IP: not yet
confirmed by the user. Analytics: self-hostable tool or none — not yet
picked, separate follow-up. Coolify (coollabsio/coolify) was evaluated and
explicitly rejected in favor of hardening the existing hand-rolled
Traefik/Docker Compose setup directly — smaller attack surface, less
migration risk, and the project's scale (a handful of services, one
developer) doesn't need a PaaS control plane. A different tool,
`h4ckf0r0day/obscura`, was requested for use as a web-search replacement and
was declined (untrusted single-maintainer repo with a name signaling
exploit-authoring intent, no functional need over existing WebSearch).

Full audit findings (backend/infra half, by an `sdd-explore` sub-agent, cross-
verified by the orchestrator via direct `git log`/`git show` where the
sub-agent lacked a Bash tool):

- API keys never hardcoded in source — satisfied.
- No secret ever committed to git history — **confirmed via direct git
  history scan by the orchestrator** (the sub-agent's tool-limited claim that
  `.env.production.example` files "don't exist" was itself wrong — they do
  exist in the tree, contain only placeholder values, and were correctly
  gitignored `.env` the whole time).
- MongoDB not publicly exposed (port mapping commented out, internal
  `backend_net` only), uses credential auth — satisfied.
- No encryption at rest or in transit for MongoDB — not satisfied, blocked
  on the domain/TLS-cert prerequisite for a real fix (self-signed can be
  used internally but doesn't solve public-facing TLS).
- Row-level security / IDOR — audited all 21 controllers, no gaps found.
- Mass assignment protection (`$fillable` everywhere, no `$request->all()`
  into models) — satisfied.
- Password hashing (Laravel `hashed` cast, bcrypt) — satisfied.
- Query parametrization (no `$where`/raw eval in Mongo queries) — satisfied.
- Rate limiting (`throttle:60,1` api-wide, `throttle:5,1` on auth,
  `trustProxies` configured for Docker ranges) — satisfied.
- Auth enforcement — all non-`auth:sanctum` routes are intentional public
  reads (health check, register/login, public catalog/challenge reads).
- FormRequest `authorize()` — all 22 return `true` (ownership is enforced at
  controller/query level instead, works today but is single-layered) —
  backend follow-up, not infra.
- **Auth token dual-written to `localStorage` alongside the httpOnly
  session cookie** — undermines the cookie's XSS protection; flagged as the
  single highest-priority fix in the whole audit, but it's a `web3-next`
  frontend/auth change, not infra — separate follow-up.
- **Security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy) are absent at every layer** — Laravel middleware,
  `next.config.ts`, `astro.config.mjs`, and Traefik labels/`traefik.yml` all
  have zero security headers configured. **In scope for this change.**
- **HTTPS is not enforced anywhere** — `infra/traefik/traefik.yml` only
  defines a `web` entrypoint on `:80`; no `websecure`/`:443` entrypoint, no
  `certificatesResolvers` (no ACME/Let's Encrypt config exists at all).
  **In scope for this change**, but real certificate issuance is blocked on
  the domain purchase — this change prepares the config to be
  domain-parameterized so activation is a one-value change once the domain
  exists, and documents the interim state honestly rather than faking HTTPS.
- **Traefik's own dashboard is exposed with no authentication** —
  `infra/traefik/traefik.yml` has `api.insecure: true`, and
  `infra/traefik/docker-compose.yml` binds port `8080` to the host. This
  was found incidentally (not one of the user's original 30 items) but is a
  live, unauthenticated admin surface on a machine about to be
  internet-facing. **In scope for this change**, high priority.
- No automated dependency/secret scanning (no CI, no Dependabot, no
  gitleaks) — process gap, separate follow-up (not infra config).

## Scope for THIS change (slice 1)

1. Add Traefik security headers via a shared middleware (CSP, HSTS,
   X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
   Permissions-Policy), applied to all routers.
2. Remove the Traefik dashboard's public/unauthenticated exposure — disable
   `api.insecure`, and either remove the dashboard entirely or gate it
   behind Traefik's own `basicauth` middleware bound to `traefik_net` only
   (design phase decides which).
3. Add the `websecure` (`:443`) entrypoint and an ACME `certificatesResolvers`
   block, parameterized by a `DOMAIN` env var that does not need to be set
   correctly today — ships inactive/staged. Add HTTP→HTTPS redirect on the
   `web` entrypoint, but make it conditional/documented so local dev
   (`*.test` domains, no real cert) isn't broken by a redirect to a
   nonexistent HTTPS listener before a domain exists.
4. Document the current real state honestly in `docs/Deploy TrackLife.md`
   (which already has stale content per this audit) — HTTPS is
   config-ready but not active pending domain purchase; do not claim it's
   "done."

## Explicitly out of scope for this change (separate follow-ups)

- Backend: FormRequest `authorize()` hardening, consolidating the 2
  inline-`validate()` endpoints into FormRequests.
- `web3-next`: removing the `localStorage` token dual-write (P5.1,
  highest-priority item overall, but frontend/auth, not infra).
- `web3-next`/`web1-astro`: per-page metadata, custom 404 pages, sitemap
  route for web3-next, `alt=""` fix, the 5 silent-catch error-handling
  spots, `next/image` adoption.
- MongoDB encryption at rest/in-transit — genuinely blocked on having a
  real domain/cert story land first; revisit after this change.
- Legal/content pages (privacy, terms, contact address), analytics tool
  selection and wiring, cookie banner — blocked on user-supplied business
  info not yet provided.

## Risks

- Real HTTPS cannot be turned on end-to-end until the domain is purchased
  and DNS points at this machine (and dynamic-vs-static IP is resolved —
  still unconfirmed). This change prepares the config, it does not activate
  a working public HTTPS endpoint.
- Removing/gating the Traefik dashboard could affect the user's current
  local workflow if they rely on it via `traefik.test:8080` for debugging —
  confirm before removing vs. gating.
- Security headers (especially CSP) can break things if configured too
  strictly for the app's actual asset/script origins — needs testing against
  all 3 subprojects (web1-astro, web3-next dashboard app, api-laravel JSON
  responses don't need CSP but do benefit from the other headers).

## Ready for Proposal

Yes.
