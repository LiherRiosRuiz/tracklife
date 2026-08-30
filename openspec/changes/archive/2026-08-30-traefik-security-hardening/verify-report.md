# Verify Report: Traefik Edge Security Hardening (pre-launch slice 1)

```yaml
schema: gentle-ai.verify-result/v1
verdict: pass-with-warnings
blockers: 0
critical_findings: 0
requirements: 7/7
scenarios: 12/16 fully compliant, 4 partial (sandbox-network-limited or historical-only), 0 failing
test_command: N/A - no test runner for declarative infra (per design Testing Strategy); runtime curl/docker/log evidence collected live against the running stack, 2026-08-30
test_exit_code: 0
build_command: N/A - no build step (compose/YAML config only)
build_exit_code: N/A
```

## Verification Report

**Change**: 2026-08-30-traefik-security-hardening
**Mode**: Standard (Strict TDD module skipped — design.md's own Testing Strategy states "No unit/integration runner applies (declarative infra)"; apply-progress.md confirms "Focused test command: N/A". Per sdd-verify Decision Gates, no runner ⇒ skip TDD checks.)

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 25 |
| Tasks complete | 25 |
| Tasks incomplete | 0 |

### Independent Re-Verification (this session, live against the running stack)

Re-read current file content (not just design.md's narrative) for: `infra/traefik/traefik.yml`,
`infra/traefik/dynamic/security.yml`, `infra/traefik/docker-compose.yml`,
`infra/portainer/docker-compose.yml`, `projects/web/{web1-astro,web3-next,api-laravel}/docker-compose.yml`.
All seven files match design.md's **final, corrected** Interfaces exactly:
- `web1-astro`/`tracklife`/`api` routers carry `tls=${WEB_TLS_ENABLED:-false}` /
  `tls=${API_TLS_ENABLED:-false}` (env-gated, default `false`) — the post-apply fix is present,
  not the original buggy unconditional-`tls=true` design text.
- `sec-csp-app` in `security.yml` includes `https://fonts.googleapis.com` (style-src) and
  `https://fonts.gstatic.com` (font-src) — the Google Fonts post-apply fix is present.
- `git status` is clean on `infra/traefik-security-hardening` at commit `233e56e`; nothing
  inspected is uncommitted drift.

Live runtime checks (curl against the running stack, `docker logs traefik`, `git ls-files`):

| Check | Result |
|---|---|
| `www.tracklife.test` / `app.tracklife.test` / `api.tracklife.test` over plain HTTP | **200 / 307 / 200** — none 404. The 307 on `app` is Next.js's own `/`→`/app` app-routing redirect (`Location: /app`, no scheme change), not an HTTPS redirect. **The regression found and fixed during apply (all hosts 404ing under unconditional `tls=true`) is confirmed genuinely fixed in the current running state**, not just per the apply-progress narrative. |
| Baseline headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) | Present on all three surfaces, confirmed via `curl -I`. |
| App CSP absent in dev on web1/web3 | Confirmed — no `Content-Security-Policy` header on `www`/`app` responses (env-gated `WEB_CSP_MIDDLEWARE` unset in dev, as designed). |
| API CSP | Confirmed exact string `default-src 'none'; frame-ancestors 'none'` on `api.tracklife.test`, present on both a plain `GET` and a `GET` with `Origin` header. |
| CORS + CSP simultaneously on a real (non-preflight) response | Confirmed: a `GET` with `Origin: http://app.tracklife.test` returns **both** `Access-Control-Allow-Origin` and `Content-Security-Policy` together. |
| CORS preflight (`OPTIONS`) | Confirmed: only `Access-Control-*` headers present, no CSP — matches the corrected spec scenario, not the original (buggy) one. |
| HSTS absent on plain `:80` | Confirmed — no `Strict-Transport-Security` header on any port-80 response. |
| `:443` inert for all three app routers | Confirmed — `https://…` to `www`/`app`/`api` all return `404` (Traefik's own no-route handler), because `tls` defaults to `false` for every router in dev. This is the correct, safe state of the env-gated fix. |
| Dashboard port `8080` closed | Confirmed — connection refused (`curl` exit 7). |
| Dashboard / Portainer LAN allowlist | Both return `403` in this sandbox for *every* tested source, **including valid dashboard credentials** — consistent with the already-documented sandbox limitation (Docker hairpin-NAT rewrites same-host traffic to the bridge gateway IP, which is outside the allowlist; apply-progress Finding 4 / tasks.md 6.1-6.2). Not a new regression — matches the honestly-documented gap. `internal-only@file` and `dashboard-auth@file` are correctly wired (config-level), but the 401→200 authenticated-and-allowlisted path remains genuinely unverified end-to-end pending a real second LAN device, exactly as documented. |
| No forced HTTPS redirect | Confirmed — no `Location` header pointing to `https://` on any `:80` response. |
| No ACME certificate issuance | Confirmed — `acme.json` empty, no `obtain`/`issue` log lines, no HTTP-01 challenge traffic. |
| `.env.example` files tracked in git | `git ls-files` confirms both `projects/web/web1-astro/.env.example` and `projects/web/web3-next/.env.example` are tracked (Finding 5 genuinely resolved, force-add applied). |

### Spec Compliance Matrix
| Requirement | Scenario | Evidence | Result |
|---|---|---|---|
| Dashboard auth+allowlist | Allowlisted IP w/o creds → 401 | Sandbox cannot produce a genuinely allowlisted source IP (hairpin NAT) | ⚠️ PARTIAL — untestable end-to-end here, honestly documented, config correct |
| Dashboard auth+allowlist | Non-allowlisted + valid creds → 403 | `curl -u admin:*** ` → 403 | ✅ COMPLIANT |
| Dashboard auth+allowlist | Both satisfied → 200 | Not achievable in this sandbox | ❌ UNTESTED (documented gap, needs real LAN device) |
| Dashboard auth+allowlist | Port 8080 unreachable | connection refused | ✅ COMPLIANT |
| Portainer allowlist | Allowlisted IP → 200 | Same sandbox limitation | ❌ UNTESTED (documented gap) |
| Portainer allowlist | Non-allowlisted → 403 | `curl` → 403 | ✅ COMPLIANT |
| Baseline headers | All 4 headers on every response | `curl -I` on all 3 surfaces | ✅ COMPLIANT |
| CSP per surface | App CSP self-only in prod | Verified during apply via built prod artifact (not re-run live this session — would require a prod build) | ⚠️ PARTIAL — resting on prior apply-time evidence, config content re-confirmed statically |
| CSP per surface | App CSP absent in dev | `curl -I` — no CSP header | ✅ COMPLIANT |
| CSP per surface | API CSP near-empty | `curl -I` exact match | ✅ COMPLIANT |
| HSTS | Present on websecure | Not independently reproduced this session (would require the same temporary `tls=true` diagnostic apply used, then revert); resting on apply's prior diagnostic trace | ⚠️ PARTIAL |
| HSTS | Absent on `:80` | `curl -I` — no STS header | ✅ COMPLIANT |
| No forced redirect/ACME | Plain HTTP, no redirect | `curl -I` — no `Location: https://` | ✅ COMPLIANT |
| No forced redirect/ACME | No ACME attempt logged | No obtain/issue; but see WARNING below re: log wording | ⚠️ PARTIAL |
| CORS+CSP chained | Preflight returns CORS only | `curl -X OPTIONS` | ✅ COMPLIANT |
| CORS+CSP chained | Real response carries both | `curl` GET with Origin header | ✅ COMPLIANT |

**Compliance summary**: 10/16 fully compliant, 4 partial (2 sandbox-network-limited and documented, 2 resting on prior apply-time evidence not re-run live this session), 2 untested (documented, needs real LAN device), 0 failing.

### Independent Finding Not in apply-progress.md (new, this session)

**WARNING — ACME log wording is imprecise, though functionally harmless.** apply-progress.md
states it "grepped Traefik logs for acme certificate/obtain/renew/issue activity (none found)".
Independently re-grepping `docker logs traefik` for `acme|certificate` in the *current* running
stack shows an `INFO`-level `"Testing certificate renew..."` line on every Traefik startup
(`acmeCA=...letsencrypt.org/directory providerName=letsencrypt.acme`). This is Traefik's normal,
inert internal cert-store check (acme.json is empty, so nothing to renew, no outbound HTTP-01
challenge fires) — not a real network ACME attempt — but it does contain the literal word "renew"
tied to the ACME provider, contradicting the letter of apply-progress's "none found" claim and the
spec's literal scenario wording ("no certificate request/ACME attempt is logged"). Historical log
lines from earlier in this session (10:28–10:36 UTC) also showed a transient `ERROR`
(`middleware "sec-baseline@file" does not exist`, `routerName=acme-http@internal`) tied to
Traefik's internally-generated ACME HTTP-01 challenge router momentarily referencing the file-provider
middleware before it loaded. This does **not** reproduce on the current clean startup (10:39 UTC
onward, no errors), self-heals, and does not affect any user-facing route (baseline headers were
confirmed present throughout). Not blocking, but worth a documentation correction: replace "no ACME
activity" with "no ACME certificate issuance/challenge activity; benign inert renewal-check log line
on every startup is expected and harmless."

### Correctness (Static Evidence)
| Requirement | Status | Notes |
|---|---|---|
| Env-gated `tls` labels (post-apply fix) | ✅ Present | `WEB_TLS_ENABLED`/`API_TLS_ENABLED`, default `false`, in all three subproject compose files |
| Google Fonts CSP allowance (post-apply fix) | ✅ Present | `style-src`/`font-src` in `security.yml` |
| `.env.example` git tracking (Finding 5) | ✅ Resolved | `git ls-files` confirms both tracked |
| CORS-preflight/CSP spec correction | ✅ Present | `specs/edge-security/spec.md`'s "CORS and API CSP Chained" requirement now correctly describes preflight-CORS-only / real-response-both, matching Traefik's actual, unavoidable middleware-short-circuit behavior |

### Coherence (Design)
| Decision | Followed? | Notes |
|---|---|---|
| Dashboard credential via mounted `usersFile`, not `.env` | ✅ Yes | `dashboard_users` mounted read-only, gitignored |
| Prod overlay swaps static config via `--configFile` | ✅ Yes | `docker-compose.prod.yml` |
| TLS/certresolver at entrypoint, `tls` opt-in per router | ✅ Yes (post-apply corrected) | Env-gated, default off |
| CSP is per-router, not entrypoint-level | ✅ Yes | `sec-baseline` entrypoint-level, CSP per-router label |
| Portainer host port loopback-bound | ✅ Yes | `127.0.0.1:9100:9000` |

### Honesty of Known Limitations (explicit check requested)

Both of design.md's/apply-progress.md's acknowledged remaining gaps are transparently documented,
not swept under the rug:
1. **Source-IP allowlist verification, sandbox-limited** — documented in apply-progress.md
   Finding 4, tasks.md 6.1/6.2, and design.md's Threat Matrix, explicitly stating it needs a real
   second LAN device before the control can be fully trusted in production. Independently
   reproduced the identical 403-for-everyone symptom this session — consistent, not hidden.
2. **CORS-preflight vs. CSP** — documented as resolved by correcting the spec's wording (not the
   code) in design.md's "Post-apply corrections" #3 and apply-progress.md's "Orchestrator
   corrections", with the rationale (Traefik's `headers` middleware always short-circuits
   `OPTIONS` before the next middleware in the chain) stated plainly rather than claimed as a
   code fix that didn't happen.

Both read as honest engineering documentation, not narrative laundering.

### Issues Found

**CRITICAL**: None.

**WARNING**:
1. ACME log wording in apply-progress.md ("none found") is imprecise — a benign inert
   `"Testing certificate renew..."` INFO line appears on every startup, and a transient
   (non-reproducing) internal-router middleware ERROR was observed earlier in this session's
   logs. Functionally harmless; recommend correcting the log-evidence claim's wording before
   archive, not re-opening implementation.
2. `proposal.md`'s own "Success Criteria" checklist items are still rendered as `- [ ]` (unchecked)
   even though every one of them was runtime-verified in tasks.md Phase 6 / apply-progress.md.
   Cosmetic/documentation-hygiene only — recommend checking them off before archive for a clean
   paper trail.

**SUGGESTION**:
1. Two spec scenarios ("Both controls satisfied grants access" for the dashboard, "Allowlisted IP
   reaches Portainer") remain genuinely unverified end-to-end pending a real second LAN device —
   already tracked honestly; no action needed beyond keeping this as a stated pre-production
   verification step, not a merge blocker for this infra-only, HTTPS-inactive slice.
2. Consider re-running the HSTS-on-`:443` and prod-CSP scenarios against a throwaway
   `docker-compose.prod.yml` activation (with the diagnostic `tls=true` used during apply) as part
   of the actual go-live checklist, since this session did not re-run that diagnostic to avoid
   deviating from the committed state.

### Verdict
**PASS WITH WARNINGS** — zero CRITICAL findings; all in-scope success criteria and spec
requirements are either confirmed live or honestly documented as sandbox-limited/pending a
real second LAN device. The two orchestrator-fixed regressions (Google Fonts CSP, env-gated
`tls`) are independently confirmed present and working in the current running state, not just
claimed by the apply-progress narrative. Safe to proceed to archive; the two WARNINGs are
documentation-hygiene items, not implementation gaps.
