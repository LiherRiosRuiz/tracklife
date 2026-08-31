# Tasks: Remove auth token from localStorage (web3-next)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~600-700 (new test runner + 4 new test files ~400 lines + proxy route ~90 + lib diffs ~110 + config) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 → PR 5 (sequential, each depends on the prior) |
| Delivery strategy | auto-forecast (not one of ask-on-risk/auto-chain/single-pr/exception-ok — unresolved) |
| Chain strategy | pending — recommend stacked-to-main (each unit is independently safe to merge), needs user confirmation |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Vitest+RTL install, config, zero-test green run | PR 1 | `npm test` (0 tests) | N/A — tooling only, no behavior change | Delete `vitest.config.mts`/`vitest.setup.ts`, revert `package.json` |
| 2 | Proxy route + RED/GREEN tests (design §2, §6) | PR 2 | `npm test -- proxy-route` | Manual `curl` against `/api/proxy/users/me` on running stack | Delete `app/api/proxy/` + its test; unused until PR 3 |
| 3 | `lib/api.ts` retarget + 401 redirect (design §3, §5) | PR 3 | `npm test -- lib/api` | Browser DevTools Network tab, real login flow | Revert `lib/api.ts`; direct browser→Laravel calls restored |
| 4 | `lib/auth.tsx` bootstrap rewrite (design §4) | PR 4 | `npm test -- lib/auth` | Manual login/reload/logout in browser | Revert `lib/auth.tsx` + `lib/auth-constants.ts` |
| 5 | Login/register body strip + config.yaml (design §4 delta, §7) | PR 5 | `npm test -- auth-routes` | `curl -i /api/auth/login`, inspect body | Revert 2 route files + `openspec/config.yaml` |

## Phase 1: Test Infrastructure (D4 prerequisite)

- [x] 1.1 `npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths` in web3-next; record resolved versions; peer-dep conflicts are a blocker to report, not bypass (design §1).
- [x] 1.2 Add `test`/`test:watch` scripts to `package.json`.
- [x] 1.3 Create `vitest.config.mts` (jsdom env, tsconfig-paths, setup file, `__tests__/**/*.test.{ts,tsx}` include) per design §1.
- [x] 1.4 Create `vitest.setup.ts` (RTL `cleanup` on `afterEach`) per design §1.
- [x] 1.5 Verify `npm test` runs clean with zero tests before writing any RED test.

## Phase 2: Proxy Route — RED first

- [ ] 2.1 RED `__tests__/app/api/proxy-route.test.ts`: cases R1-R8 (empty/traversal/`.`/encoded-slash/encoded-backslash/scheme-authority/double-slash/segment-flood → 400, `fetch` never called) per design §6 threat matrix. Confirm all fail (no route yet).
- [ ] 2.2 RED same file: cases G1-G8 (query+cookie forwarding, no-cookie public passthrough, inbound `Authorization` dropped, DELETE-with-body forwarded, upstream status/body verbatim, `Set-Cookie` not relayed, upstream timeout→504, no `PATCH` export).
- [ ] 2.3 GREEN: create `app/api/proxy/[...path]/route.ts` per design §2 (`safeUpstreamPath` allow-list, headers built not copied, 10s timeout, response headers allow-listed, `GET`/`POST`/`PUT`/`DELETE` only).
- [ ] 2.4 Run `npm test` — all R1-R8, G1-G8 green.

## Phase 3: `lib/api.ts` Retarget — RED first

- [ ] 3.1 RED `__tests__/lib/api.test.ts`: A1 (all calls hit `/api/proxy/...`), A2 (no `Authorization` header ever), A3 (401 → `location.assign("/login")`), A4 (`api.me` 401 does not navigate), A5 (already on `/login` does not navigate), A6 (two concurrent 401s navigate once) per design §3, §5.
- [ ] 3.2 GREEN: modify `lib/api.ts` per design §3 diff — `PROXY_BASE`, exported `SESSION_SENTINEL`, `toProxyUrl`, drop `Authorization` construction, add `skipAuthRedirect` + `handleUnauthorized` (design §5), `api.me` passes `skipAuthRedirect: true`.
- [ ] 3.3 Run `npm test` — A1-A6 green; confirm all 45 `api.*` signatures unchanged.

## Phase 4: `lib/auth.tsx` Bootstrap Rewrite — RED first

- [ ] 4.1 RED `__tests__/lib/auth.test.tsx`: B1 (valid session on mount), B2 (401 on mount), B3 (network error on mount, no infinite spinner), B4 (`login()` clears `localStorage` token), B5 (`logout()` clears context + other keys), B6 (`Storage.prototype.setItem` spy never called with `tracklife_token`) per design §4.
- [ ] 4.2 GREEN: modify `lib/auth.tsx` — delete `TOKEN_KEY`, rewrite mount effect to call `api.me(SESSION_SENTINEL)` unconditionally with a `cancelled` guard, rewrite `persist(newUser)` using `SESSION_SENTINEL`, drop `localStorage.removeItem(TOKEN_KEY)` in `logout`.
- [ ] 4.3 Modify `lib/auth-constants.ts`: remove stale dual-write comment.
- [ ] 4.4 Run `npm test` — B1-B6 green.

## Phase 5: Login/Register Response Strip (scope delta) — RED first

- [ ] 5.1 RED `__tests__/app/api/auth-routes.test.ts`: C1 (login 200, body has no `token` key, cookie still set), C2 (register 201, same) per design §4 scope delta.
- [ ] 5.2 GREEN: modify `app/api/auth/login/route.ts` and `app/api/auth/register/route.ts` — destructure `token` out, return `safe` body only.
- [ ] 5.3 Run `npm test` — C1-C2 green; confirm `auth.tsx` never read `data.token` (no regression).

## Phase 6: Config + Final Verification

- [ ] 6.1 Modify `openspec/config.yaml` `testing.web3-next`: `ready: true`, `runner`, `existing_tests`, `lint`, `build`, `notes` per design §7.
- [ ] 6.2 Modify `openspec/config.yaml` `context:` line — drop "no test runner installed" note.
- [ ] 6.3 Modify `openspec/config.yaml` `rules.apply.guidelines` — replace vitest-not-installed flag with TDD-ready line.
- [ ] 6.4 Modify `openspec/config.yaml` `rules.apply.test_command` and `rules.verify.test_command` — replace with `web3-next: npm test`.
- [ ] 6.5 Run `npm test`, `npm run lint`, `npm run build` in web3-next — all pass.
- [ ] 6.6 Manual check against proposal success criteria: `rg "localStorage" projects/web/web3-next` zero auth-token hits; DevTools shows no bearer token; login/reload/logout E2E; expired session → `/login`.
