# Panel build-exclusion — production readiness plan

Planning only — no further implementation in this pass beyond what's already landed (see §3). Deliverable of this plan is a concrete, sequenced path to **100% readiness**: the config panel present and usable everywhere it's needed, verifiably absent from what ships, and the *architecture* that guarantees that going forward — not just this one branch in a passing state.

⸻

## 0. Objective, restated precisely

Today, tuning a config value requires working on `dynamics_detached` (the only branch with the panel) and manually re-applying the resulting payload onto `main`'s production-shaped tree (`CONFIG-CHANGE-PROTOCOL.md` §§2-3) — because `main` has never contained panel code at all; it was manually stripped out of a curated export. The `spike/panel-build-exclusion-poc` branch proves a different model: panel code can live **in the same tree that ships**, with a build-time mechanism (`next.config.js` webpack aliasing real `*.panel.ts` files to no-op `*.panel.stub.ts` twins in production mode) guaranteeing it never reaches the compiled output. `scripts/verify-release.js` already mechanically checks this (greps the exported HTML/JS for panel identifiers).

**The deliverable is not "get this branch green."** It's: finish proving the mechanism holds for every production route, then retire the *manual-strip, cross-branch* model in favor of it — so future config tuning never needs `dynamics_detached` → `config/misc` reapplication again.

⸻

## 1. What the spike/PoC already proved

- `scripts/generate-panel-stubs.js` — content-based (real import scanning, not filename-pattern guessing) detection of every file that needs a stub twin. Already run once; produced `scripts/panel-stub-manifest.json` covering ~50 files across `components/`, `experiences/`, and page-adjacent `*.panel.ts` recipes.
- `components/Panel/` (the shared engine, 46 files) + `components/Panel.stub/` (4 no-op twins) — the one wholesale alias `next.config.js` needs for the engine itself, per the generator's own doc comment.
- `pages/contact.tsx` — fully done: byte-identical to `dynamics_detached`'s current tip, panel imports wired in, confirmed via direct diff.
- `pages/posts/[slug].tsx` — fully done, **with a real mismatch caught and corrected along the way**: `dynamics_detached`'s own `pages/posts/[slug].tsx` is stale (pre-promotion, still `SynthLayout`-based); the correct source is `dynamics_detached:pages/posts-lab/[slug].tsx`. Worth restating in §4 as a concrete lesson, not just a one-off catch.
- `pages/about.tsx`, `pages/abstract.tsx` — **not yet done**. Still the old, manually-stripped versions (zero panel imports). This is the largest remaining known gap.

**Confirmed via investigation (this session), not assumed:** there is no repeatable curation script behind the original 4-route export — `release/production-site-export` was a hand-curated single orphan commit (`P1-404-INCIDENT-RCA-AND-RELEASE-PROTOCOL.md`). "Rebuild from scratch" would re-derive the same dependency closure by hand a second time, for no architectural difference — assessed and explicitly rejected in favor of finishing the current branch (see chat history this session for the full comparison). Not re-litigated here.

⸻

## 2. Target architecture (the actual "correct architecture" decision)

**Collapse the authoring/production branch split.** Once every production route carries its own panel (this plan's Phase 1-4), there is no longer a reason for `dynamics_detached` and `main` to be different trees at all — the entire reason they diverged (panel code has to be manually stripped to ship) goes away. Concretely:

- `main` becomes the **only** branch anyone needs for either authoring (`next dev`, panel live) or shipping (`next build`/`export`, panel excluded by construction) — the exact "one build pipeline, no drift" property `CONFIG-CHANGE-PROTOCOL.md` §0.1 already names as the current architecture's one good property, now achieved *without* needing a second tree.
- `config/misc` (the standing reapplication-landing branch) and the whole Tune→Capture→**Apply**→Verify→Promote model in `CONFIG-CHANGE-PROTOCOL.md` §2 step 3 collapses to **Tune→Verify→Promote** — "Capture"/"Apply" (copy a payload, hand-edit a `DEFAULT_*` constant on a different branch) stop being necessary once the panel edits the same file that ships.
- `dynamics_detached` — once this plan lands, has no unique content left that `main` doesn't also carry for these 5 routes. Decision needed on its fate (§6.1) — not deleted as part of this plan regardless of the answer (deletion is a separate, explicit, later decision).

This is the section of the plan that actually answers "the correct architecture," not just "make this branch pass" — everything in §4 is in service of making this collapse safe to do.

⸻

## 3. Current state inventory (verified this session, not assumed)

| Route | Page file status | Support files (panel.ts/stub/config) |
|---|---|---|
| `/` (re-exports `/abstract`) | Depends on `/abstract` | n/a |
| `/about` | ❌ old stripped version | ✅ present, confirmed identical to `dynamics_detached` |
| `/abstract` | ❌ old stripped version | ✅ present, confirmed identical to `dynamics_detached` |
| `/contact` | ✅ done | ✅ done |
| `/posts/[slug]` | ✅ done (from `posts-lab`, not `posts`) | ✅ done |

Also present, untracked, unverified against a build: the full `components/Panel/` engine + stub twin, and ~50 shared component `.panel.ts`/`.stub.ts` pairs. `next.config.js`, `scripts/verify-release.js`, `release-manifest.json`, `package.json` are all modified in the working tree but **`npm run verify:release` has not been run since these changes landed** — this plan's Phase 4 is the first time the full gate runs against the current state.

Also landed this session, unrelated to the panel work but relevant to running any of the below safely: `package.json`'s new `predev` hook (`scripts/kill-stale-dev-servers.js`) — reaps `next dev` processes for this repo older than 6h, directory- and age-scoped so it never touches a concurrent session. Already tested (dry-run against real processes, correctly identified 2 genuinely stale ones and left 3 recent ones alone). Not yet executed for real.

⸻

## 4. Work plan to 100% readiness

### Phase 1 — Finish the file restoration
Copy `pages/about.tsx` and `pages/abstract.tsx` from `dynamics_detached`'s current tip (same method already proven for `contact.tsx`/`posts/[slug].tsx`). **Known friction:** the auto-mode classifier has blocked every `Bash`-based overwrite of these two specific files so far (it doesn't have branch awareness — it's protecting this session's earlier *conversation-level* edits to these files, made on `dynamics_detached`, as if they were uncommitted local work on *this* branch, which they aren't). Needs either an explicit operator-run `!cp` per file (established working pattern) or a permission-rule adjustment before this phase can proceed unattended.

### Phase 2 — Dependency closure verification
`about.tsx`/`abstract.tsx` are large (1,655 / 3,879 lines) and panel-integrated throughout — near-certain to import additional files not yet present on this branch (the ~50 already-copied support files were scanned against the *old* stripped pages, not these new ones). Method: `npx tsc --noEmit` after Phase 1, treat every "module not found" as a signal to pull that exact file from `dynamics_detached` via the same `git show` method, repeat until clean. This is the step most likely to surface the "posts/[slug] vs posts-lab/[slug]" class of mismatch again (a file that exists on both branches but means something different) — verify each pulled file's own content makes sense for a *production* route (no dev-mode-only tooling, no lab/experiment leakage) before accepting it, not just "it makes the import error go away."

### Phase 3 — Stub/alias wiring verification
- Re-run `node scripts/generate-panel-stubs.js` after Phase 2 — the manifest was generated against the old page files; anything Phase 2 pulled in needs its own stub entry.
- Confirm every manifest entry has a real, importable `.stub.ts` twin (not just listed) and that `next.config.js`'s alias map is generated from (or kept in sync with) the manifest, not hand-maintained separately — check the current diff on `next.config.js` for which of these it actually does.
- Confirm the two `KNOWN_MIXED_FILES` cases the generator's own doc comment calls out (`SharedDesignConfigProvider.tsx`, `useAbstractDesignConfigBindings.ts`) still hold given Phase 2's additions — these are hand-maintained exceptions, not auto-detected, so they're the one place new files could silently need the same treatment without the generator ever flagging it.

### Phase 4 — The deterministic gate
`npm run verify:release` — full build → `tsc --noEmit` → `vitest run` → route-manifest diff (`release-manifest.json`) → panel-identifier leak scan → internal-link crawl. **This is the actual proof**, not Phases 1-3's own success — those only establish "it compiles," not "it's clean." First real run against the current working tree happens here. Any failure sends the relevant file back through Phase 2/3, not a one-off patch.

### Phase 5 — Visual verification gate
Per `CONFIG-CHANGE-PROTOCOL.md` §5 (this document's own governing standard, not invented fresh here): screenshot every one of the 5 routes at scroll position 0, fresh load — both in `next dev` (panel visible, confirm it actually opens and edits something real for each of the 4 pages that have one) and against a local `next build && next export` preview (panel absent, page still renders/looks correct). Deterministic-only verification (Phase 4) does not substitute for this — it checks structure, not appearance, same distinction the protocol itself draws.

### Phase 6 — Documentation: retire the old model in writing, not just in practice
`CONFIG-CHANGE-PROTOCOL.md` currently documents the Tune→Capture→Apply→Verify→Promote model as *the* standing process. Once Phases 1-5 pass, that document is now describing a superseded workflow — update it (not a new parallel doc) to reflect §2's collapse: `main` is authoring and production both; `config/misc`'s reapplication role goes away; §0's branch table gets a "superseded, see §X" note on `dynamics_detached`'s row rather than silently going stale. Leaving the old doc unedited is how the *next* person (or agent) re-discovers this exact confusion from scratch.

### Phase 7 — Branch/merge strategy to land on `main`
- Commit the working tree in a small number of thematic commits (not one giant one) — e.g. "add panel build-exclusion engine + stub generator," "restore panel wiring to about/abstract/contact/posts routes," "add predev stale-server reaper" — each independently revertable, matching this repo's own established "one committable change per commit" convention.
- Per `CONFIG-CHANGE-PROTOCOL.md` §7, there is no CI gate or branch protection on `main` yet — merging today means a direct push after Phase 4/5 both pass locally, same mechanics as the original posts-lab promotion. Flagging, not deciding: this is exactly the kind of change §7 itself says should eventually require a PR once CI exists — worth a deliberate call on whether to wait for that or proceed directly, given this touches every production route at once (§6.2).

### Phase 8 — Downstream cleanup (decisions, not automatic actions)
Once merged: what happens to `dynamics_detached` and `config/misc`? Addressed as explicit decisions in §6, not silently actioned — both are one-way-ish (deleting a branch, or leaving it to rot and confuse the next person) and this plan's own scope is "get to 100% ready," not "clean up every branch in the repo."

⸻

## 5. Risks and mitigations

| Risk | Mitigation |
|---|---|
| `about.tsx`/`abstract.tsx`'s dependency closure is large/unknown until Phase 2 actually runs | Budget Phase 2 as iterative, not a single pass — the `tsc`-driven loop is designed to terminate on its own, but the *number* of iterations isn't known yet |
| A pulled file looks like the right one but is stale/wrong version (posts/posts-lab class of bug) | Phase 2's own instruction to sanity-check content, not just "import resolves now" |
| Auto-mode classifier keeps blocking file operations on these two specific pages | Flagged directly in Phase 1 — needs either operator-run commands or a permission adjustment, not a workaround |
| Verify:release passes locally but Netlify's actual build environment differs | Out of scope for "local 100% readiness" per the objective in §0, but worth a real (not simulated) Netlify preview/deploy-preview check before Phase 7's push, if the infrastructure in `CONFIG-CHANGE-PROTOCOL.md` §7.2 (Netlify deploy previews) exists by then — otherwise a manual post-push production check per §8 of that document |
| This plan's own scope creeps into "also fix unrelated things noticed along the way" | Explicitly out of scope: anything not required to make the 5 production routes pass Phase 4/5 gets logged as a follow-up, not folded in |

⸻

## 6. Decisions needed

1. **`dynamics_detached`'s fate after this lands.** Recommendation: don't delete it immediately — mark it superseded in `CONFIG-CHANGE-PROTOCOL.md` (Phase 6) and revisit deletion after a real observation period (e.g., a couple of weeks of `main`-only config tuning going smoothly), rather than deleting the moment this plan's gates pass.
2. **Merge mechanics for Phase 7** — direct push (matching how the posts-lab promotion happened) vs. holding for a PR/CI gate that doesn't exist yet. Recommendation: direct push, same as precedent, given no CI exists to gate a PR against anyway — but flag this explicitly rather than assume, since this change's blast radius (every production route at once) is larger than a normal config-value promotion.
3. **`config/misc`'s fate.** Recommendation: same as `dynamics_detached` — mark superseded, don't delete yet.

⸻

## 7. Rollback plan

Everything through Phase 6 happens on `spike/panel-build-exclusion-poc`, not `main` — zero production risk until Phase 7's push. If Phase 7 ships something wrong, the fix is the same "cheap, plain `git revert`" model `CONFIG-CHANGE-PROTOCOL.md` §8 already establishes for config promotions generally — no route/redirect surface changes here, so this isn't the heavier Route-Affecting rollback path.

⸻

## 8. Exit criteria — what "100% ready" concretely means

- [ ] All 5 production routes (`/`, `/about`, `/abstract`, `/contact`, `/posts/*`) import and render their own config panel correctly under `next dev`.
- [ ] `npm run verify:release` passes clean against the full working tree (not just the 2 already-done pages).
- [ ] A local `next build && next export` genuinely contains zero panel-identifier leakage across all 5 routes (Phase 4's own gate, re-stated because this is the actual point).
- [ ] Phase 5's visual gate completed for every route, both panel-visible (dev) and panel-absent (production preview) states.
- [ ] `CONFIG-CHANGE-PROTOCOL.md` updated to describe the new, collapsed model as current, not aspirational.
- [ ] Work committed in reviewable, thematic commits and merged to `main`.
- [ ] §6's three decisions made explicitly (not defaulted-into) before or at Phase 7.
