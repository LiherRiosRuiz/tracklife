# Apply Progress: Remove auth token from localStorage (web3-next)

## Batch 1 (this batch)

**Scope**: Phase 1 only — Vitest + Testing Library install and config in web3-next.
Tooling only, zero behavior change to existing application code.
**Chain**: PR 1 of 5 (feature-branch-chain per tasks.md forecast — PR1 targets the
feature/tracker branch `feat/remove-token-localstorage`).
**Mode**: Standard (no production code/behavior under test in this batch — Phase 1 is
pure tooling install/config, which is why tasks.md scopes it outside the RED-first
phases 2-5; strict TDD Cycle Evidence begins in Phase 2).

## Phase 1: Test Infrastructure (D4 prerequisite)

- [x] 1.1 `npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths`
- [x] 1.2 Added `test` / `test:watch` scripts to `package.json`
- [x] 1.3 Created `vitest.config.mts`
- [x] 1.4 Created `vitest.setup.ts`
- [x] 1.5 Verified `npm test` runs clean with zero test files

### Resolved dependency versions (actual, not design ranges)

The design flagged these as unverified compatibility *ranges*. Real `npm install` output:

| Package | Design range | **Resolved (actual)** |
|---|---|---|
| vitest | `^3` | **`4.1.11`** |
| @vitejs/plugin-react | `^5` | **`6.1.1`** |
| jsdom | `^26` | **`30.0.1`** |
| @testing-library/react | `^16` | **`16.3.3`** |
| @testing-library/dom | `^10` | **`10.4.1`** |
| vite-tsconfig-paths | `^5` | **`6.1.1`** |

`npm install` (unpinned, no version constraints given) resolved to the current latest
majors on the public registry as of 2026-08-31 — one major ahead of every range the
design assumed (vitest 3→4, @vitejs/plugin-react 5→6, jsdom 26→30, vite-tsconfig-paths
5→6). `@testing-library/react`/`dom` landed inside the design's stated range.

**Peer-dependency check**: `npm install` completed with **zero peer-dependency errors**
and **no** `--legacy-peer-deps`/`--force` was used. `npm ls <pkg> --depth=0` for all six
new packages resolves cleanly with no `UNMET PEER DEPENDENCY` warnings. This is
**not** a blocker per the design's gate condition (peer-dep conflict), but the major
version drift is recorded below as a deviation because it changed real runtime
behavior of the config (see below).

Production dependency `sharp` (`^0.35.2` in `dependencies`) remained at
`0.35.2` post-install — confirmed via `npm ls sharp --depth=0` — so the "changed 2
packages" in the npm summary was internal dedup/peer resolution only, not an
unintended production dependency bump.

## Deviations from Design (with rationale)

1. **`passWithNoTests: true` added to `vitest.config.mts` `test` block** — not present
   in the design's snippet. Without it, `vitest run` with the design's
   `include: ["__tests__/**/*.test.{ts,tsx}"]` and zero existing test files exits with
   code 1 and the message "No test files found, exiting with code 1" — a hard failure,
   not the "clean 'no tests found' report" the apply-phase gate explicitly requires.
   This is Vitest's default behavior (empty match set = exit 1) regardless of the
   3→4 version jump; the design's config snippet did not account for the "zero tests
   yet" state Phase 1 is deliberately left in. Added the one-line option with an
   inline comment explaining it's temporary until Phase 2 lands real tests. No other
   change to the design's config shape.
2. **Major version drift (vitest 3→4, @vitejs/plugin-react 5→6, jsdom 26→30,
   vite-tsconfig-paths 5→6)** — accepted, not worked around. The install command run
   was the exact one specified in tasks.md 1.1 (no version pins), which is expected
   to pull current majors from the registry per the design's own acknowledged
   uncertainty ("I could not reach the npm registry from this phase"). Verified the
   `test.environment` config key (used by `vitest.config.mts`) still exists and
   resolves in vitest 4.1.11's shipped `config.d.ts`/`config.cjs` before relying on
   it. `npm test` was run end-to-end against the actual installed versions (not
   assumed) and produced the clean, gated result below.
3. No other deviations. `vitest.setup.ts` matches the design's snippet verbatim.
   `package.json` scripts match verbatim.

## Work Unit Evidence (Unit 1 — Vitest+RTL install, config, zero-test green run)

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npm test` → `vitest run` → `No test files found, exiting with code 0` (after `passWithNoTests: true` fix). Exit code confirmed `0` via `echo $?`. Before the fix: exit code `1` with the same message minus "code 0" — captured as the reason for the deviation above. |
| Runtime harness command/scenario and exact result | N/A — tooling only, no behavior change, per tasks.md's own Unit 1 row ("N/A — tooling only, no behavior change"). Sanity-checked anyway: `npm run lint` still reports the same pre-existing 5 `no-img-element` warnings, 0 errors (unchanged from before this batch) — confirms zero regression to existing app code. |
| Rollback boundary | Delete `vitest.config.mts` and `vitest.setup.ts`; revert `package.json` (scripts block) and `package-lock.json`. No application code touched — `git status --short` for this batch shows only `package.json` (M), `package-lock.json` (M), `vitest.config.mts` (??), `vitest.setup.ts` (??). |

## Files Changed

| File | Action | What Was Done |
|---|---|---|
| `projects/web/web3-next/package.json` | Modified | Added `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `vite-tsconfig-paths` to `devDependencies`; added `test` (`vitest run`) and `test:watch` (`vitest`) scripts |
| `projects/web/web3-next/package-lock.json` | Modified | Lockfile update from `npm install` (1848 insertions) |
| `projects/web/web3-next/vitest.config.mts` | Created | jsdom environment, `tsconfigPaths()` + `react()` plugins, setup file, `__tests__/**/*.test.{ts,tsx}` include, `passWithNoTests: true` (deviation, see above) |
| `projects/web/web3-next/vitest.setup.ts` | Created | RTL `cleanup` registered on `afterEach` (verbatim per design §1) |

## Issues Found

None blocking. Recorded for awareness of the next batch (Phase 2):

- `npm test` prints an informational (non-fatal) notice: `The plugin
  "vite-tsconfig-paths" is detected. Vite now supports tsconfig paths resolution
  natively via the resolve.tsconfigPaths option...` — cosmetic only, does not affect
  test results or exit code. Kept `vite-tsconfig-paths` as the design specified rather
  than switching to the native Vite option, since the design explicitly chose the
  plugin and this batch is tooling-only (no design changes without a design update).
- 5 high-severity `npm audit` advisories reported by the install (pre-existing
  transitive dev-tooling risk surface, not introduced by version selection specific
  to this batch — not investigated further as out of Phase 1 scope; flagged for the
  user/maintainer to triage separately if desired).

## Remaining Tasks

- [ ] Phase 2: Proxy route — RED first (`__tests__/app/api/proxy-route.test.ts`, `app/api/proxy/[...path]/route.ts`)
- [ ] Phase 3: `lib/api.ts` retarget — RED first
- [ ] Phase 4: `lib/auth.tsx` bootstrap rewrite — RED first
- [ ] Phase 5: Login/register response strip — RED first
- [ ] Phase 6: Config + final verification

## Status

5/5 tasks complete in Phase 1 (Phase 1 fully complete).
5/25 total tasks complete across the full change (Phases 2-6 remaining, 20 tasks).
Ready for next batch (Phase 2).
