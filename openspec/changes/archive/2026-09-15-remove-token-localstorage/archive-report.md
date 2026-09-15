# Archive Report: Remove auth token from localStorage

**Change**: `2026-08-31-remove-token-localstorage`  
**Archived**: 2026-09-15  
**Status**: COMPLETE

## Closure Summary

The change has been fully planned, implemented, verified, and archived. All 25 implementation tasks completed and passing. Security objective achieved: auth token removed from JS-readable storage, all client API traffic now same-origin through a closed-by-construction server proxy.

## Verification Status

| Metric | Result |
|--------|--------|
| Tasks | 25/25 complete |
| Tests | 30/30 passing |
| Build | PASSED |
| Lint | PASSED (0 errors) |
| Verification verdict | PASS (0 blockers, 0 critical findings) |
| Verify gate | Allow |

## Specifications Synced

### Domain: client-session-auth

**Action**: Created  
**Spec**: `openspec/specs/client-session-auth/spec.md`  
**Requirements**: 8 requirements, 15 scenarios  
**Compliance**: 15/15 scenarios verified compliant

Delta spec was a full specification (main spec did not exist). Synced directly to source of truth. This specification documents the new authentication architecture: httpOnly cookie as the sole client credential, same-origin proxy, 401 redirect handling, and non-secret sentinel in AuthContext.

## Delivery Summary

**Chain**: 5 PRs (#26–#30), merged to master 2026-09-02

1. **PR #26** — Test infrastructure (vitest + RTL)
2. **PR #27** — Proxy route with security hardening
3. **PR #28** — `lib/api.ts` retarget + 401 redirect
4. **PR #29** — `lib/auth.tsx` bootstrap rewrite
5. **PR #30** — Login/register response body strip + config

**Proposal success criteria**: All 7 verified met

- ✅ No `localStorage` auth-token references in web3-next app code
- ✅ No client-constructible Authorization header; DevTools shows only httpOnly cookie
- ✅ All client API traffic same-origin to `/api/proxy/...`
- ✅ Login, reload (session persists via cookie), logout work end-to-end
- ✅ Proxy rejects traversal/absolute-URL segments; fixed to api-laravel only
- ✅ Expired session on client page redirects to `/login` (401 handling)
- ✅ `npm run lint` and `npm run build` pass in web3-next

## Archive Contents

- **proposal.md** — Intent, scope, approach, risks, rollback plan
- **design.md** — Technical design across 7 sections
- **spec/** — `client-session-auth/spec.md` (8 requirements, 15 scenarios)
- **tasks.md** — 25/25 tasks complete (6 phases)
- **verify-report.md** — Full verification report (verdict: PASS)
- **apply-progress.md** — Implementation progress across 5 PRs
- **exploration.md** — Initial exploration findings
- **archive-report.md** — This file

## SDD Cycle Complete

The change has successfully transitioned from proposal through design, implementation (5-PR chain), verification, and final archive. The authentication architecture is now documented in the source of truth (`openspec/specs/client-session-auth/spec.md`) and ready for future reference and maintenance.

### Next Steps

No follow-up work required. The only deferred item is CORS tightening in `api-laravel/config/cors.php`, which is out of scope and documented as a separate follow-up in the proposal.
