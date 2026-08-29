# Config Change Protocol

> **2026-08-28 update — the model below is superseded.** `PLAN-PANEL-BUILD-EXCLUSION-PRODUCTION-READINESS.md`'s spike branch is now merged: `main` carries the full config-panel system directly (every production page — `/`, `/about`, `/abstract`, `/contact`, `/posts/*` — imports and renders it), with `next.config.js`'s webpack-alias mechanism (`scripts/generate-panel-stubs.js` / `scripts/panel-stub-manifest.json`) guaranteeing it's provably absent from `next build`/`next export` output, verified mechanically by `npm run verify:release`'s panel-identifier leak scan — the same guarantee §0.1 below describes, just achieved without a second tree. **The whole reason `dynamics_detached` and `main` diverged (panel code had to be manually stripped to ship) no longer applies.** Concretely:
>
> - **Tune directly on `main`.** `next dev` there now shows the real panel — no more "the panel only exists on `dynamics_detached`."
> - **§2's five stages collapse to three: Tune → Verify → Promote.** "Capture" (copy a payload) and "Apply" (hand-edit a `DEFAULT_*` constant on a different branch) aren't needed once the panel edits the same file that ships — see §2's own updated note.
> - **`dynamics_detached` and `config/misc` (§3) are superseded, not deleted.** Kept for reference through an observation period; not the place to start new work. See §0's own updated table.
>
> Sections below are left as originally written (accurate for the model they describe) with superseded-notices layered in at the relevant points, rather than rewritten wholesale — the reasoning in §0.1/§4/§5 (why the build-time exclusion works, what the deterministic/visual gates check) is still exactly correct and still applies, just on one branch now instead of two.

**Scope:** the recurring, expected-to-be-daily workflow of tuning a component's config-panel values in local development and promoting the result to production. This is the "Standard" release classification from `P1-404-INCIDENT-RCA-AND-RELEASE-PROTOCOL.md` §F, fully specified — route-affecting changes (new/removed pages) still follow that document's heavier Phase 1/Phase 2 path, not this one.

**Builds on, does not duplicate:** `AGENTS.md` (lives on the authoring branch — see §0) already specifies the config-panel scope model, the `component-config-update/v1` payload format, and the exact procedure for applying a payload to source ("Applying a copied config update"), plus the mandatory Visual Verification Gate and Required Verification checklist for scope changes. This document does not restate those — it picks up exactly where AGENTS.md leaves off: once a payload is applied and verified functionally correct, **how does it get from a local branch into production, safely, every day, without becoming ceremony?**

---

## 0. Repo branching model (was not previously documented — confirmed by direct search)

Asked directly and checked before answering: `AGENTS.md` has zero git-branching guidance (every "branch" occurrence in it means a code/logic branch, not a git ref). No `CONTRIBUTING.md` or workflow doc exists on any branch. The empirical `feature/<name>` branches in this repo (`feature/space`, `feature/helix`, `feature/spacev4-grid`, etc.) are **stale** — their most recent commits range from 2025-11-01 to 2026-02-17, well before current active work — they're historical experiments, not a live convention anyone is following today. This section is the first time this has been written down.

**Current state, verified directly (not assumed):**

> **Superseded 2026-08-28** — see the update note at the top of this document. `main` now carries the panel directly; the two-branch split this section documents is no longer the live model. Left as-is below for historical accuracy (this *was* true, and explains why `config/misc`/the promotion mechanics in §§2-3 existed at all) — read it as "how we used to do this," not current instructions.

- **`dynamics_detached`** — the live authoring branch. Confirmed active as of 2026-08-27 (274 commits ahead of its common ancestor with `dynamics`); carries the full config-panel system, `AGENTS.md`, and all current plan docs (`PLAN-POSTS-LAB-*.md`, etc.). This is where new feature work and all config-panel tuning happen. **Superseded**: `main` now also carries the panel — this is no longer the only place to tune. Kept, not deleted, through an observation period (per `PLAN-PANEL-BUILD-EXCLUSION-PRODUCTION-READINESS.md` §6.1).
- **`dynamics`** — stale, last commit 2026-07-12, 1 commit ahead of the same common ancestor. Superseded by `dynamics_detached`. Treat as dead unless someone actively revives it — don't branch new work from it.
- **`main`** — the production deploy lineage. Confirmed this session as what Netlify actually builds from (a push here is what put the posts-lab promotion live on `abstract.voyage`). **No longer panel-stripped** — carries the full config-panel system directly, build-time-excluded from what actually ships (see the update note at the top of this document). This is now the one branch for both authoring and production.
- **`config/misc`** — created off `main` (§3), the landing branch for day-to-day config-panel promotions under the old model. **Superseded**: with tuning happening directly on `main`, there's no separate "apply a payload here" step left to land. Kept, not deleted, same reasoning as `dynamics_detached` above.
- Every other branch in the repo (`feature/*`, `ka`, `pre`, `scroll`, `seo-backup`, `main-back`, `agent`, `immersive-integration`, `revert_tmp`) — not evaluated as part of this protocol; assume stale/abandoned unless checked individually before building on one. Worth a separate housekeeping pass (delete or explicitly archive) so `git branch -a` stops being a 20-branch guessing game — not done here since deleting branches wasn't asked for and is a one-way-ish action worth confirming first.

**Common misconception, worth stating explicitly since it's not obvious from §0.1 alone (superseded context — see note above; kept for history):** `NODE_ENV !== 'production'` only controls whether panel *code* renders — it cannot make panel code appear in a branch that never had it. This used to mean `config/misc`/`main` had zero panel-related files at all, so no `NODE_ENV` trick could ever surface one there. That's exactly the gap the webpack-alias build-exclusion mechanism (top-of-document note) closes: `main` now has the real files, and the *build*, not a runtime check, decides whether they ship.

**Historical guidance, superseded — kept for context on why the split existed:**

- **New features and config-panel tuning → branch from `dynamics_detached`.** This is where the panel exists at all (§ below), where `AGENTS.md`'s procedures apply, and where the current plan-doc/verification conventions already live.
- **Anything being promoted toward production → branch from `main`**, per §3's `config/misc` model for config, or `P1-404-INCIDENT-RCA-AND-RELEASE-PROTOCOL.md` §C's Route-Affecting path for anything that adds/removes/restructures pages. Never branch a promotion from `dynamics_detached` directly — it has no shared history with `main` at all (confirmed the hard way during the posts-lab promotion), so anything built there has to be re-applied onto `main` as a fresh, targeted diff rather than merged.

---

## 0.1 The architecture invariant this whole protocol rests on

**The panel is not a runtime feature flag. It is a compile-time fact about how the bundle was built.**

`useAuthoringToolsVisibility` (and every other panel-gating check in this codebase) reads `process.env.NODE_ENV !== 'production'`. Next.js inlines this at build time:

- `next dev` → `NODE_ENV=development` → panel present.
- `next build` (which is what `next export`, every Netlify build, and every local production-mode check all run) → `NODE_ENV=production` → panel categorically absent — not hidden, not disabled, **not present in the compiled output at all.**

This is verified mechanically, not asserted: `scripts/verify-release.js` step 5 greps every exported `.html`/`.js` file for `PanelShell`, `ConfigScopeBinding`, `useAuthoringToolsVisibility`, and related identifiers, and fails the gate if any are found. This is the same check the original production export's own commit message cited ("the compiled output has zero references to any panel identifier") — it's now automated and reusable, not a one-time manual claim.

**Consequence for this protocol:** there is no such thing today as a hosted environment (Netlify preview, staging, production) where the panel is reachable. The only place config tuning happens is a developer's own `next dev` process. This is a deliberate, good property — it means one build pipeline, no drift between "what staging runs" and "what production runs," and no flag that could be accidentally left on in a real, audience-facing environment. Do not work around it with a query param or cookie-based override without a separate, explicit decision — see §9 for why, and what a considered version of that tradeoff would look like if it's ever wanted.

---

## 1. Roles

Named so the process reads correctly as the team grows; today, one person plus an AI agent typically plays all three:

- **Author** — tunes values live in the panel, produces the `component-config-update/v1` payload.
- **Applier** — applies the payload to source per AGENTS.md's fixed 4-step procedure. Can be the same person/agent as Author.
- **Verifier** — runs the deterministic gate (§4) and the visual gate (§5) before promotion. Should be a distinct pass even when it's the same person, not skipped because "I just wrote it."

---

## 2. The five stages

> **Superseded 2026-08-28 — collapses to three: Tune → Verify → Promote.** "Capture" (hit COPY, produce a payload) and "Apply" (hand-edit a `DEFAULT_*` constant on a *different* branch, per AGENTS.md's own fixed steps) existed solely to bridge the panel-carrying branch and the panel-stripped one. With the panel present directly on `main`, tuning a value *is* editing the file that ships — there's nothing to copy to a second location. Steps 4-5 below (Verify, Promote) are unchanged and still the real gate. Left below for the historical "why," not as current instructions — see this document's own top-of-file note.

**Tune → Capture → Apply → Verify → Promote.**

1. **Tune.** On the authoring environment (currently: whichever branch carries the full panel system — `dynamics`/`dynamics_detached` at time of writing), run `next dev` per AGENTS.md's "Local dev server" section (private port, private `CLAUDE_NEXT_DIST_DIR` — never touch the operator's own port-3000 instance). Adjust the target scope's controls until satisfied.

2. **Capture.** Hit "COPY" (or "COPY ALL") in the panel. This produces the `# component-config-update/v1` payload — `target_file`, `target_symbol`, `target_type`, `update_strategy`, `complete_scope`, and the `config:` block. This payload is the **source of truth for what changed** — don't hand-transcribe values from the screen instead of using it; the payload is what makes the next three stages mechanical rather than error-prone.

3. **Apply.** On **`config/misc`** (§3) — or a dedicated branch for anything that's graduated off it — follow AGENTS.md's four fixed steps literally: read the header fields, locate `export const <target_symbol> = { ... } satisfies <target_type>`, replace that object wholesale with the payload's `config:` block for `replace_scope`/`complete_scope: true` (the only combination currently emitted), and check `scope:` for a page-name suffix to know whether the change is page-local or shared (§6).

4. **Verify.** Run the deterministic gate (§4) and the visual gate (§5). Both are required; neither substitutes for the other.

5. **Promote.** Merge/push to `main`. Netlify deploys from `main` (confirmed directly this session — see the P1 incident doc's remediation record). No separate "promotion" step exists beyond a normal git push once the branch is merged.

---

## 3. Branch: `config/misc` — one standing branch, not one-per-change

> **Superseded 2026-08-28, later the same day** — see this document's own top-of-file note. With tuning happening directly on `main`, there's no separate promotion-landing branch needed for the common case; a config change is just a normal commit on `main` after §4/§5's gates pass. `config/misc` itself is kept, not deleted, per `PLAN-PANEL-BUILD-EXCLUSION-PRODUCTION-READINESS.md` §6.3. The "graduate to a dedicated branch for Category 2/global changes" idea below still applies verbatim — that was never specific to the old model.

**Decided 2026-08-28, superseding an earlier per-scope-derived-branch proposal:** given how frequently config-panel values are expected to change, a fresh branch per tweak is overhead the workflow doesn't need. Instead: **`config/misc`**, cut from `main`, is the single, reusable landing branch for miscellaneous config-panel promotions. Created this session (`git branch config/misc main`, pushed to `origin`).

**How it stays useful without turning into a dumping ground:**

- **One commit per applied payload, always** — even though changes share a branch, they must not share a commit. Each commit's body includes the full `# component-config-update/v1` payload it applied, same evidence requirement as before, just attached to a commit instead of a throwaway branch. This is what keeps `git log config/misc` a readable, revertable history instead of an undifferentiated blob — `git revert <sha>` must be able to undo exactly one config change, never a bundle.
- **Verify before every promotion, not once per commit.** Run `npm run verify:release` + the visual gate (§5) against the branch's current state before pushing to `main` — covers everything accumulated on `config/misc` since the last promotion, not just the newest commit.
- **Reset after every promotion.** Once `config/misc` is merged/pushed into `main`, bring it back to `main`'s new tip (`git checkout config/misc && git reset --hard main && git push --force-with-lease origin config/misc`) rather than letting it keep diverging indefinitely. This is the one place a force-push is the *correct* tool, not a shortcut — `config/misc` is a rolling staging branch with disposable history by design, unlike `main`, which never gets force-pushed. Do this reset as part of the promotion, not as separate cleanup someone might skip.
- **A change that turns out to be Category 2 / global (§6), or that started drifting into a real feature rather than a value tweak, graduates off `config/misc` onto its own named branch** (the earlier `config/<scope>/<slug>` scheme, still valid for exactly this case) rather than staying on the shared branch — `config/misc` is for changes narrow enough that bundling them costs nothing; anything with real review weight earns its own branch and, once CI exists (§7), its own PR.

**Source:** always `main`, never `dynamics_detached` — same reasoning as before: `main` is the deploy lineage with a production-shaped tree; the authoring branch carries unrelated long-running work. See §0 for the full picture.

---

## 4. The deterministic gate

`npm run verify:release` (build → `tsc --noEmit` → `vitest run` → route-manifest diff → panel-identifier leak scan → internal-link crawl), same script used for the posts-lab promotion.

**For a config-only change, the route-manifest diff must show zero route changes.** This is the automatic classifier: if applying a config payload somehow changes the exported route list, that is not a config change anymore — stop, and re-classify the work under the heavier Route-Affecting path in the P1 protocol doc's §F rather than continuing down this lane.

The panel-identifier leak scan matters here specifically because config-panel work is, definitionally, the place most likely to accidentally reintroduce a panel import (e.g. copy-pasting a snippet that still has `useAuthoringToolsVisibility` in it). It is not a formality for this workflow — it's the single check most likely to actually catch something.

---

## 5. The visual gate

Config changes are, by definition, visual/UX changes. The deterministic gate above verifies *structure* (routes exist, nothing leaked, types check) — it cannot and does not verify *does this look right*. That's AGENTS.md's existing "Visual verification gate" section, and it applies in full here, not as an optional extra:

- Screenshot every affected breakpoint at scroll position 0, fresh load — not mid-interaction.
- Actually look at the screenshot and describe what it shows before claiming correctness.
- Compound-state and reciprocal-effect checks if the change touches a shared/global scope (§6) that renders alongside other elements.

Do not consider a config change "verified" on `tsc`/`vitest`/`verify:release` passing alone — that combination checks correctness, not appearance, and appearance is the entire point of a config-panel change.

---

## 6. Scope classification drives rigor

Reusing AGENTS.md's existing category model rather than inventing a parallel one:

- **Category 1 (schema shared, value page-local)** — each consuming page holds its own independent state. A payload with a page-name suffix on `scope:` (e.g. `layout:Abstract`) is this category. Blast radius is exactly one page. Verifying that one page's render is sufficient; this is the fast, low-ceremony path — author can self-merge once the deterministic + visual gates are both green.
- **Category 2 (schema shared, value genuinely global)** — the live value is one object in `SharedDesignConfigProvider`, consumed by every page that binds it. A payload with no page suffix on `scope:` is this category. **Every consuming page must be checked, not just the one the author happened to be looking at** — AGENTS.md's own incident history (the `colorSourceLg` case, 2026-08-24) is the reference example of what goes wrong when this is skipped. This is the slow path: require a second look before merge (even in a one-person team, treat this as a "come back to it after a break" self-review, not a same-glance approval), and the promotion PR description must list every page checked, not just assert "checked all pages."

If it's unclear which category a change falls into, resolve it before merging, not after — AGENTS.md's own guidance is explicit: trace actual consumption (`grep` for `useSharedDesignConfig()`), never infer category from file location or which registry resolves the scope ID.

---

## 7. CI/CD maturity — closing the gap between "the gate exists" and "the gate is enforced"

Today, `verify:release` and the visual gate are both **available** but not **enforced** — nothing stops a config branch from being merged without either running. That's tolerable at the current volume; it will not hold up under "daily activity." In priority order:

1. **GitHub Actions workflow on `main`-targeted PRs, running `npm run verify:release` as a required status check.** This is the single highest-leverage addition — it turns §4 from a step someone has to remember into a step that blocks the merge button. (There is currently no `.github/workflows` directory in this repo at all — this is net-new infrastructure, not a config change to an existing pipeline.)
2. **Netlify Deploy Previews per PR.** Currently absent (no `.netlify/state.json` in this checkout links this repo to a Netlify site, and there's no evidence of PR-based preview deploys). This is what closes the gap in §5 without requiring `next start` on someone's laptop — a reviewer (or a stakeholder who isn't the author) can see the actual rendered change on a real URL before it's promoted. High value specifically for Category 2 changes, where "every consuming page" is easier to check against a live preview than local screenshots of each route.
3. **Branch protection on `main`.** Currently none — this session pushed directly to `main` with no PR and no review, which was the right call under P1 time pressure with explicit user sign-off at each step, but is not a pattern to keep for daily config work. Once (1) exists, require it to pass before merge; require at least a self-review pass (PR opened, diff read, checkboxes below completed) even for a solo-mergeable Category 1 change.
4. **PR template for config changes**, making the "required evidence" concrete and fast to fill in rather than something to reconstruct after the fact:
   - Payload (`# component-config-update/v1` block) pasted in full.
   - `npm run verify:release` output (or CI run link, once (1) exists).
   - Scope classification (Category 1 / Category 2) and, if Category 2, the list of pages checked.
   - Screenshot(s) per §5.
5. **Auto-delete branch on merge** (a one-line repo setting) — housekeeping for §3's short-lived-branch expectation at daily volume.

None of the above blocks starting the workflow today — §§1-6 work with the tooling that exists right now. This section is the path from "works" to "scales," ordered by what unblocks the most risk reduction per unit of setup effort.

---

## 8. Promotion mechanics and rollback

**Promotion:** merge the `config/...` branch into `main` (PR once §7.1/§7.3 exist; direct fast-forward push today, matching the mechanics already confirmed this session — `main` has no shared history with the panel-carrying authoring branch, so the branch is applied as a fresh, targeted diff, not a cross-history merge). Netlify auto-deploys from `main` on push.

**Post-deploy verification:** targeted, not the full route-level smoke suite from the P1 protocol — a config-only change has a narrow, known blast radius (§6). Re-check the specific affected page(s) live on production; for Category 2, re-check every consuming page, same list as the PR's own evidence.

**Rollback:** materially cheaper than a route-affecting incident, because no URLs move and no redirect/sitemap surface changes. A bad config value is a plain `git revert` of the promotion commit, run back through the same deterministic + visual gates, and pushed — treat it as a normal, small promotion, not an emergency procedure. If the bad value is Category 2 (global), prioritize the revert over investigating root cause first — the same "contain, then diagnose" ordering as `P1-404-INCIDENT-RCA-AND-RELEASE-PROTOCOL.md` §C, just at much smaller scale.

---

## 9. Explicitly out of scope (for now)

**A runtime-toggleable panel in a hosted environment** (e.g. a `NEXT_PUBLIC_ENABLE_AUTHORING_TOOLS` flag, or a password-gated preview deploy with the panel live) would let a non-technical stakeholder tune values without a local dev server, and would make Category 2 review easier (check every page on one shared preview URL instead of N local screenshots). It would also reintroduce exactly the risk §0 currently eliminates by construction — a flag that could be left on, a build artifact that isn't provably panel-free, a second thing to audit. Worth revisiting once/if stakeholder-driven tuning (not just author-driven) becomes a real, frequent need — not something to add speculatively. If it's ever pursued, it should be a deliberate addition to §0 with its own threat model, not a quiet exception carved into the existing NODE_ENV gate.

**Batching multiple config changes into one deploy window** — if daily volume grows enough that one-deploy-per-tweak becomes deploy-storm noise, consider a merge queue or a fixed daily promotion window. Not needed at current volume; noted here so it's a deliberate decision later, not a default that creeps in unnoticed.

---

## 10. Relationship to the other process documents

- `AGENTS.md` (authoring branch only) — the config-panel scope model, payload format, apply procedure, and visual/required verification rules this document builds on. Read it first if any of §§2-6 above are unclear on the mechanics, not just the process.
- `P1-404-INCIDENT-RCA-AND-RELEASE-PROTOCOL.md` (this repo) — the heavier Route-Affecting release path, the release classifications this document's "Standard" lane is one instance of, and the AI/automation model (§G there) this document's CI recommendations (§7 here) are built on the same principles as: deterministic checks authoritative for pass/fail, AI/human judgment advisory on top, never the reverse.
