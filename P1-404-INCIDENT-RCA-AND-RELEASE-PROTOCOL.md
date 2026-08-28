# P1 Post-Release Incident: Site-Wide 404s — RCA & Release Protocol

**Site:** abstract.voyage (Next.js static export, deployed via Netlify)
**Incident branch:** `release/production-site-export` (commit `7283aa1`)
**Assessment date:** 2026-08-28
**Status of findings:** Evidence gathered directly from the repo (git history, build config, working tree) and from live HTTP checks against `https://abstract.voyage`. Every claim below is labeled **Confirmed**, **Probable**, or **Requires Validation** — see §B for the evidence table before acting on anything marked below Confirmed.

---

> **2026-08-28 update, post-stakeholder input:** The 4-route scope (`/`, `/about`, `/abstract`, `/contact`) is **confirmed intentional** — this is not an accident to reverse. Separately, `/posts/*` is being **replaced**, not restored: the in-development reading-view work at `/posts-lab/*` (present on `dynamics_detached`, not yet in this release) is graduating to become the new `/posts/*`, retiring the old Synth-layout reading view for good. The stakeholder has also **rejected rollback** for this incident and elected to **fix-forward** — see the new §C for the revised remediation plan, the fix-forward validity discussion, and the posts-lab promotion checklist, and the new §K for the resulting "way of working" recommendations. §A/§B below are left as originally written (they're still accurate as of the original investigation) with amendments layered in rather than rewritten, so the evidence trail stays intact.
>
> **2026-08-28, second update — Phase 2 implemented and verified locally.** The stakeholder also rejected manual verification as the primary reliability mechanism for this promotion and asked for an automated, repeatable gate instead. Both are now done, in this working tree, on this branch: `/posts/[slug]` is rebuilt on the promoted posts-lab UI (panel system stripped, same treatment already applied to `/about`/`/abstract`/`/contact`), and a deterministic pre-promotion gate (`scripts/verify-release.js` / `npm run verify:release`, backed by `release-manifest.json`) runs the full build, type-check, unit tests, a route-manifest diff, a panel-identifier leak check, and an internal-link-integrity crawl. **Local run result: PASSED** — 15/15 manifest routes match exactly, zero panel-identifier leakage, zero broken internal links across the whole export, all 5 unit tests green. Full detail in the new §C "Phase 2 — Implementation Record" and §H "Implemented" callouts below. **This has not been deployed** — see the go/no-go note at the end of §C.

## A. Executive Summary

**What happened.** `release/production-site-export` is a single-commit orphan branch whose `pages/` directory intentionally contains only four routes: `/`, `/about`, `/abstract`, `/contact` (the commit message describes this as a deliberate, dependency-pruned "standalone production build" of just those three experiences). The site builds as a fully static export (`next build && next export`, Netlify `publish = "out"`), which has **full-replace semantics** — Netlify's deployed file set is exactly what `next export` emits, nothing more. When this build went live, every previously published route outside that four-route set stopped existing on the server. There is no redirect/rewrite layer anywhere in the repo (checked on both this branch and `main`) to catch the difference.

**Amendment — this is worse than an orphaned-URL problem.** The live `/abstract` page's own Journal/Post Dock section (confirmed shipped in this release — the commit message explicitly lists "blog + lab content used by /abstract's journal section") renders a card for each of the 11 posts in `posts/*.md` (also shipped in this release), and each card's link is computed by `helpers/articleHref.ts::getArticleHref()`, which in production resolves to `/posts/${slug}` — a route this release doesn't ship. **Confirmed via code inspection** (data flow traced end-to-end: `posts/*.md` → `getPostSummaries()` → `toSliderSlides()` → `getArticleHref()` → `loadAbstractPostDockItems.server.ts` → `AbstractPostDock`, all present in this release's file list). This means the current production homepage is actively generating and displaying 11 dead internal links to visitors right now — not just failing to redirect old bookmarks, but shipping broken navigation in its own primary UI. None of the 11 posts have an `externalUrl`/`forceExternalNavigation` frontmatter override that would bypass this. This is the single highest-priority item in the revised fix plan (§C).

**Production impact — Confirmed by direct live check on 2026-08-28:**

| URL | Status |
|---|---|
| `/` | 200 (serves new pruned homepage) |
| `/about` | 200 |
| `/lab/sota` | **404** |
| `/posts/welcome` | **404** |
| `/color` | **404** |
| `/sitemap.xml` | **404** (the sitemap itself is gone) |

Historical evidence (old `sitemap.xml` + a stale local `next export` artifact, both gitignored/untracked, dated 2026-07-10) shows the previously-live surface also included `/connect`, `/spline`, `/synth`, `/visuals`, `/experience/synth/**`, `/feed.xml`, `/llms.txt`, `/robots.txt`, and 11 blog posts under `/posts/*`. These were not individually re-checked live but share the identical failure mechanism as the four confirmed URLs above — **Probable**, not yet individually re-verified.

**Likely root cause (Probable, pending stakeholder confirmation — see §B/§C):** A page set that was built for a narrow, deliberate purpose was deployed to the primary production domain that previously served a much larger site, with no route-surface diff, no redirect layer, and no pre/post-deploy URL verification step in the path to production.

**Immediate corrective action:** Contain via Netlify deploy rollback to the last known-good deploy (reversible, no code changes required) while a stakeholder decision is made on the permanent fix — restore the missing routes, or confirm the reduction is intentional and ship proper 301 redirects + a regenerated sitemap for the retired URLs. See §C.

**Why this escaped existing controls:** There are no existing controls to escape. This repo has no CI pipeline (no `.github/workflows`), no pre-deploy route/URL validation, no redirects configuration, no post-deploy smoke test, and no synthetic monitoring. Verification recorded in the commit message (`tsc --noEmit`, `next build`, "zero references to any panel identifier") was scoped to type-safety and code hygiene of the panel-removal refactor — it never checked URL-surface parity against the site that was actually live. That mismatch between what was verified and what actually broke is the core process gap. See §D.

**Highest-priority improvements:** (1) a mandatory pre-deploy URL-inventory diff against the last known-good production sitemap, (2) a `netlify.toml [[redirects]]` layer for any route being retired, (3) a post-deploy automated smoke check against a fixed list of high-value URLs before a release is called done, (4) basic synthetic uptime monitoring on the same list. All four are cheap, deterministic, and would have caught this specific incident before or immediately after it reached production. See §H and §I.

---

## B. 404 Incident Diagnosis

**Observed failure:** Previously-indexed production URLs return HTTP 404 instead of their prior content.

**Likely technical cause:** Full-replace static export deploy dropped all routes not present in the new `pages/` directory, with no redirect layer to compensate. **Probable**, upgraded from hypothesis to high-confidence by the evidence below, but not 100% "Confirmed" until the stakeholder question in §C is answered (see caveat at the end of this section).

**Supporting evidence (Confirmed):**

1. `pages/` on `HEAD` (`release/production-site-export`) contains exactly: `_app.tsx`, `_document.tsx`, `about.tsx`, `abstract.tsx`, `contact.tsx`, `index.tsx`. `index.tsx` re-exports the `abstract.tsx` component directly (`export default AbstractPage`) — it is not an HTTP redirect, `/` and `/abstract` render the same page.
2. `pages/` on `main` contains the identical six files — the reduction is **not** something this release commit did relative to `main`; `main` was already reduced to this same set. (This matters for §D: the proximate defect is older than this release commit; this release commit is what *shipped* it to production, not what *introduced* it.)
3. `git log --all --diff-filter=A` shows `pages/color.tsx`, `pages/connect.tsx`, `pages/lab/sota.tsx`, `pages/spline.tsx`, `pages/synth.tsx`, `pages/posts/[slug].tsx` were added in earlier commits on this repo's history — these were real, previously-shipped routes, not speculative.
4. `netlify.toml` (both on `HEAD` and `main`) has no `[[redirects]]` block; there is no `public/_redirects` file anywhere in history. No redirect/rewrite layer exists at all.
5. `netlify.toml` build command is `npm run build:static` = `next build && next export`, `publish = "out"` — confirms this is a pure static export with full-replace deploy semantics, not an incrementally-routed server.
6. Live checks against `https://abstract.voyage` (2026-08-28) confirm the new build is what's currently serving production (root page content matches the new `about.tsx`/`abstract.tsx`/`contact.tsx` set), and confirm 404s on `/lab/sota`, `/posts/welcome`, `/color`, and `/sitemap.xml`.
7. `out/` is gitignored (`.gitignore:16: /out/`) — there is no version-controlled historical record of prior production URL surface inside this repo. The only surviving record is the untracked local `out/` build (dated 2026-07-10, pre-dates this release by ~7 weeks) and its `sitemap.xml`, which is the source for the "previously live" URL list in §A.
8. No `.github/workflows` directory exists — there is no CI pipeline of any kind gating merges or deploys. Build/type-check verification described in the commit message was run locally/manually.

**Missing evidence / Requires Validation:**

- **Netlify deploy history and site configuration** (which branch is wired as the production branch, deploy timestamps, whether a previous good deploy is still retained for rollback). Not accessible from this repo checkout — needs the Netlify dashboard or `netlify api` access.
- **Whether the 4-route reduction was an intentional product decision** (a deliberate relaunch as a minimal site) **or unintended scope** (this export was meant for a different target — e.g., a client handoff or a scoped subset — and got deployed to the domain that served the full site by mistake). The commit message's framing ("proprietary-tooling-free export," single orphan commit, explicit exclusion of the internal config-panel system) reads like it was built for a specific handoff purpose, which is circumstantial support for the "wrong target" interpretation, but this is a business/intent question this analysis cannot answer from code alone.
- **Actual traffic/SEO impact** — Search Console crawl-error counts, real user 404 rate, backlink impact. Not queryable from this environment.
- Individual live-status confirmation for the remaining ~14 previously-live URLs (`/connect`, `/spline`, `/synth`, `/visuals`, the other 10 blog posts, `/feed.xml`, `/robots.txt`, `/llms.txt`) — mechanism is identical to the 4 confirmed cases, so treat as **Probable** until spot-checked.

**Alternative hypotheses considered and ruled out or downgraded:**

- *CDN/cache staleness serving stale 404s*: ruled out — the live root page correctly reflects the *new* content, meaning cache is not stale, the new deploy is genuinely live and correctly propagated. This is a real content gap, not a cache artifact.
- *DNS/origin misrouting*: ruled out — `/about` and `/` both resolve correctly to the new site on the same domain, so DNS/origin routing is functioning normally; only specific paths are missing.
- *Netlify function failure (e.g., the `/contact` intake function)*: not implicated in the 404s under investigation — `/contact` itself returns content; the function's runtime behavior is a separate, untested concern outside this diagnosis's scope.
- *Case-sensitivity / path-normalization bug*: no evidence for this — the missing routes are missing entirely from the build output, not present-but-unreachable due to casing.

**Recommended investigation to close the remaining gap:**
1. Pull Netlify deploy history for the production site to get exact deploy time and confirm `release/production-site-export` (or its build) is the live deploy, and confirm whether a prior good deploy is still retained.
2. Get a stakeholder decision on intended scope (§C option 1 vs 2) — this determines the permanent fix, not just the containment step.
3. Spot-check the remaining ~14 URLs from the historical sitemap/`out/` inventory (list in Appendix) to confirm full blast radius before declaring resolution.

**Root-cause conclusion:** **Probable.** A statically-exported build containing a deliberately narrow page set was published to a production domain that previously served a larger route surface, with no redirect layer and no pre/post-deploy URL-parity check anywhere in the path to production. Confirmed as a *mechanism*; confirmed as *what happened to the live site*; not yet confirmed as *intentional vs. accidental scope*, which is the one open question that changes what "fixed" means.

---

## C. Immediate Remediation Plan (revised 2026-08-28 — supersedes the original two-option version below the fold)

Scope is now decided: ship only `/`, `/about`, `/abstract`, `/contact`, and replace `/posts/*` with the graduated `/posts-lab/*` work rather than restoring the old Synth-layout reading view. Rollback is explicitly rejected for this incident. Everything in this section assumes fix-forward. The original Option 1/Option 2 framing is kept below (unedited) as the record of what was assessed before the decision was made — do not act on it, it's superseded.

### Is fix-forward valid here? (the question the stakeholder asked directly)

Yes, with conditions — this is a recognized, industry-standard incident-response pattern, not an improvised shortcut, but it trades a slower/safer default for speed and shifts risk onto the quality of the forward fix and the team's ability to detect if it isn't working.

**When fix-forward is the right call (SRE/DevOps consensus — Google SRE practices, DORA):**
- Rollback isn't clearly safer or faster than a forward fix. That's arguably true here: recall from §B that `main`'s `pages/` directory *already* matches this release's reduced 4-route set — meaning "rollback" would not obviously restore a full site anyway unless Netlify's deploy history happens to retain an older, still-full-site deploy that hasn't been superseded (unconfirmed, per §B's "Requires Validation"). Rollback's benefit here is genuinely uncertain, which weakens the case against fix-forward.
- The team has a clear, scoped, high-confidence corrective change available. That's also true here: the posts-lab code already exists, reuses the exact same content pipeline as the old `/posts/[slug].tsx` (same slugs, same markdown source — confirmed in §B's amendment), and has already been through a mobile-responsiveness audit (`public/audits/responsiveness-2026-08-19/`). This is a promotion of tested work, not a from-scratch fix under pressure — a materially lower-risk forward fix than "write a patch under a P1 clock."
- The business has explicitly accepted the interim risk. The stakeholder said so directly ("the project can withstand the risk").

**What fix-forward requires to be safe, not reckless (these are the conditions — treat them as mandatory, not optional, precisely because the rollback safety net has been deliberately given up):**
1. **Time-boxed increments, not one big-bang fix.** Ship the highest-severity, lowest-risk piece first (killing the self-inflicted dead links — see Phase 1 below) within hours, not as part of the same change as the full posts-lab promotion.
2. **Verification has to compensate for the missing safety net.** Because "just roll back if it's wrong" is off the table, the pre-deploy checks in §H (manifest diff, smoke test) stop being "future work" and become required — at least in manual/scripted form — for every deploy in this fix-forward sequence, starting now, not after §I's roadmap gets around to automating them.
3. **Rollback stays available as a fallback, even though it's not the current plan.** "Reject rollback for now" should mean exactly that — a decision for *this* incident, re-evaluated if a fix-forward attempt stalls or a forward deploy makes things worse — not a standing policy against ever rolling back. Keep §F's stop-the-line/rollback-trigger criteria active during this sequence.
4. **Each increment gets its own production verification**, not one verification pass at the end of the whole sequence.

### Phase 1 — Fast containment: stop the self-inflicted dead links (target: hours, not days)

This is now the top-priority action, ahead of the full posts-lab promotion, because it's live on the homepage right now and is cheap to fix independently:

- Until `pages/posts/[slug].tsx` exists again, change the Journal/Post Dock's rendering so it does not present a link that 404s. Two reasonable approaches, in order of preference:
  - **(a) Render the cards without a clickable destination** (no `<Link>`/`href`, or visually marked "coming soon") until the real route ships — least code, lowest risk, doesn't require deciding anything about the eventual URL.
  - **(b) Point `getArticleHref` at `/posts-lab/${slug}` in production too, temporarily** — but only if `/posts-lab/*` is deployed alongside it (see risk note below) and is acceptable to expose pre-promotion (it currently still imports the stripped Panel/config system per §B's amendment — would need at least the "runtime defaults preserved, editing UI stripped" treatment first, same as `/about`/`/abstract`/`/contact` got in this release, otherwise this reintroduces the excluded proprietary tooling this release was explicit about excluding "end to end"). **(a) is the safer Phase 1 move**; treat (b) as effectively Phase 2, not a shortcut.
- This is a small, self-contained, easily-verified change — a same-day fix-forward deploy, independent of and not blocking the larger posts-lab promotion work.

### Phase 2 — Permanent fix: promote `/posts-lab/*` to become `/posts/*`

This is real engineering work, not a config change — treat it as its own scoped release (see §K for how this kind of "sandbox-to-production graduation" should be handled as a named, repeatable pattern going forward). Checklist, derived from what's actually different between the two implementations (traced directly in the code on `dynamics_detached`):

1. **Content/data pipeline — already compatible.** Both the old `/posts/[slug].tsx` and `/posts-lab/[slug].tsx` call the identical `helpers/postArticle.ts` functions (`getAllPostSlugPaths`, `getPostArticleProps`) against the same `posts/*.md` source. Same slugs, same frontmatter, same canonical paths (`helpers/siteMetadata.ts`'s `canonicalPath` already always points at `/posts/${slug}`, never the sandbox route). **No content migration needed** — this significantly de-risks the promotion relative to a from-scratch route.
2. **Strip the config-panel system before this ships to production**, following the exact precedent this release already set for `/about`/`/abstract`/`/contact`: `pages/posts-lab/[slug].tsx` currently imports `components/Panel/config`, `useAuthoringToolsVisibility`, `PostsLabConfigPanel`, `postsLabConfigPanelRegistry`, and multiple `*.panel.ts`/`*.panel.tsx` files (`postLab.panel.ts`, `postLab.panel.test.tsx`, plus panel config on `PageSurface`, `SiteHeader` color override, `MarkdownContent`, `TableOfContents`). Per this release's own commit message, the panel *editing* UI is excluded end-to-end while each page's *runtime defaults* (the `useState` values the panels used to edit) are preserved unchanged — apply that identical treatment here rather than shipping the dev-only editing surface to production.
3. **Layout family is actually a net simplification, not an addition.** `/posts-lab/[slug].tsx` renders through `PolymorphicLayout`/`SplitColumnPageShell` — the same shell family `/about`, `/abstract`, and `/contact` already use in this release. The old `/posts/[slug].tsx` used a separate, older `SynthLayout`/`ArticleLayout`/`experiences/synth/*` family that this release never pulled in. Promoting posts-lab means the release's dependency surface *stays* within the shell family it already ships, rather than reintroducing the retired Synth layout components.
4. **Rename/mount the route.** Move (not copy-and-diverge) `pages/posts-lab/[slug].tsx` → `pages/posts/[slug].tsx`, bringing `postLab.config.ts`, `postLab.panel.ts` (post-stripping), `postLabArticle.module.css` along, renamed to match.
5. **Retire the sandbox indirection in `helpers/articleHref.ts`.** The file's own comment already specifies the removal steps: delete the file, replace call sites with a plain `/posts/${slug}` template literal. Do this as part of this same change — leaving the `NODE_ENV` branch in place after the promotion would silently mean dev and production diverge again for no reason.
6. **Re-verify mobile responsiveness after stripping the panel system.** The `public/audits/responsiveness-2026-08-19/` evidence (including a "post-remediation" pass) is a real, positive signal, but it was almost certainly captured with the dev-only panel/authoring tools still present — re-run a lighter version of that same check against the stripped, production-shaped build before calling this done, since panel removal has, in this exact repo, previously been the kind of change that alters rendered layout (see §D precedent: this is the same class of risk the original release's panel-stripping work had to verify against).
7. **Regenerate `sitemap.xml`/`robots.txt`/`feed.xml`** to include the now-real `/posts/*` URLs (currently absent from `public/` entirely, per the original §C evidence) so search engines can (re)discover them.
8. **Run `postLab.panel.test.tsx`** (or its post-stripping equivalent) plus `tsc --noEmit`, `vitest run`, `next build && next export` as the standard pre-deploy gate (§F).

### Phase 2 — Implementation record (2026-08-28)

Done, on this branch, in this working tree — not deployed. What actually happened, since it surfaced real gaps a manual pass would likely have missed (which is itself the argument for the automated-gate requirement below):

- Ported the non-panel dependency closure from `dynamics_detached` (11 files: `helpers/postArticle.ts`, `MarkdownContent`/`TableOfContents` components + their `config/registered.ts` (not `config/panel.ts`), `experiences/abstract/helpers/readingPresentation.ts`, `helpers/markdownRendering.ts`, `helpers/codeCopy.ts`, `hooks/useEscapeKey.ts`, `components/tailwindTypographyScale.ts`, `helpers/articleOutline.ts`, `helpers/cancellableScroll.ts` — each individually confirmed panel-free before porting).
- Wrote `pages/posts/[slug].tsx` from `pages/posts-lab/[slug].tsx`, applying the exact panel-stripping pattern confirmed by diffing this release's own `pages/abstract.tsx` against its `dynamics_detached` counterpart: dropped every `*.panel.ts` import, `useAuthoringToolsVisibility`, `createConfigScopeBinding`/`resolveConfigPanelSurfaceColor`, `PostsLabConfigPanel`, `postsLabConfigPanelRegistry`, and `useAbstractDesignConfigBindings` (confirmed unused by the current `/abstract` too — it calls `useAbstractDesignConfig()` directly, same as the new `/posts` route now does); kept every `useState` initialized from its `DEFAULT_*` constant, matching the "runtime defaults preserved" rule.
- Restored real SEO metadata the sandbox route deliberately didn't have (`robots="noindex,nofollow"`, `canonicalPath={null}`) — production `/posts/[slug]` now sets `canonicalPath`, `ogImagePath`, `publishedTime`/`modifiedTime`, and JSON-LD via the same `helpers/siteMetadata.ts` functions (`getPostCanonicalPath`, `getPostOgImagePath`, `getPublishedDate`, `getAbsoluteUrl`) the old production route used — these already existed unchanged in this branch.
- Retired the sandbox indirection: deleted `helpers/articleHref.ts` and replaced its one call site (`helpers/postContent.ts`) with a plain `` `/posts/${slug}` `` template literal, per the file's own removal note.
- Regenerated `public/sitemap.xml` (previously absent) scoped to exactly the 4 pages + 11 posts; ported `public/robots.txt` and `public/feed.xml` as-is from `dynamics_detached` (content pipeline unchanged, so they're already accurate for this exact scope).
- **Found and fixed two gaps a manual pass would likely have missed**: (1) this release branch had **no `vitest.config.ts` at all** — `vitest run` was silently running with Node defaults (no jsdom, classic JSX runtime), so the 3 ported component tests failed with `document is not defined`/`React is not defined` until the config was ported from `dynamics_detached`; (2) `next build` failed prerendering 3 of the 11 posts with `Missing snippet: withTogglesProvider.js` / `Missing table data for human-communication-traits` — `helpers/postArticle.ts` depends on a whole `content/posts/**` tree (per-post code snippets and table JSON) that exists on every other branch but was never part of this release's orphan commit at all. Ported the missing `content/` tree (9 files, confirmed panel-free) and the build went green.
- **Verified, locally, with `npm run verify:release`** (script + manifest added this session, see §H): full build → `tsc --noEmit` → `vitest run` → route-manifest diff → panel-identifier leak scan → internal-link-integrity crawl across the entire export. Result: **PASSED**. Confirmed directly in the exported `abstract.html`'s embedded post-dock data that all 11 `/posts/{slug}` hrefs now resolve to real generated files — the self-inflicted dead-link finding from the §A/§B amendment is fixed by this same change, not a separate Phase 1.

### Validation before deployment (both phases)

- Phase 1: confirm no card in the Journal/Post Dock renders a clickable `/posts/*` href before deploy; confirm visually in a local `next build && next export` preview, not just by reading the diff.
- Phase 2: run the full checklist above; diff the new `out/` manifest against both the pre-incident inventory (Appendix) *and* the current live 4-route inventory — the new `/posts/*` entries should appear, nothing else should move.

### Deployment

- Phase 1 and Phase 2 are separate deploys, each watched live (§F's monitoring-window requirement), not bundled into one change — this is the time-boxed-increments condition from above, applied concretely.

### Production verification after each deployment

- Phase 1: re-fetch `/abstract`, confirm the Journal/Post Dock no longer contains a `/posts/*` link that resolves to 404 (either no link, or a working one).
- Phase 2: re-run the live checks from §A/§B against all 11 post slugs (Appendix), confirm 200s; re-fetch `/sitemap.xml`, confirm it's valid and lists the real `/posts/*` URLs.

### Monitoring signals confirming recovery

- Same as originally specified: 404 rate back to baseline, Search Console Coverage trending down over 1–2 weeks, plus (new, given fix-forward's reduced safety net) an explicit manual status check against the Appendix URL list after each of the two phase deploys, not deferred to §H's future automation.

### Criteria for declaring the P1 resolved

1. **Phase 1 done**: no self-inflicted dead links rendered anywhere in the live site.
2. **Phase 2 done**: all 11 posts live at `/posts/{slug}`, sourced from the promoted posts-lab implementation, panel/authoring tooling stripped, `sitemap.xml`/`robots.txt`/`feed.xml` accurate.
3. The other previously-live routes confirmed in scope for retirement (`/color`, `/connect`, `/lab/sota`, `/spline`, `/synth`, `/visuals` — see Appendix) get an explicit redirect or retirement decision recorded (this wasn't addressed by the posts-lab conversation and remains open — flagging it so it doesn't get silently dropped now that `/posts/*` is spoken for).
4. Netlify production deploy log confirms each phase's fix as the live deploy, verified via live HTTP check.

**Go/no-go status as of this writing: local gates are green, deploy has not happened.** Everything in the Implementation Record above is verified in the local working tree (`npm run verify:release` PASSED) but nothing has been committed, pushed, or deployed. Before promoting: (a) review the diff (a large, mostly-mechanical port — worth a real read, not a rubber stamp, precisely because "the automated gate passed" and "a human looked at it" are different kinds of evidence per §G), (b) commit, (c) get explicit go-ahead for the actual Netlify deploy specifically — that step wasn't included in this session's scope without asking first, given its blast radius.

---

*Original two-option remediation plan (superseded, kept for the record):*

### Containment (stop the bleeding, reversible, no stakeholder decision required)

- **Preferred: Netlify deploy rollback.** Netlify retains prior deploys as immutable, independently-served artifacts by default; "Publish deploy" / rollback to the last deploy that served the full route set restores all previously-live URLs within minutes with zero code changes and zero risk to the new `/about`/`/abstract`/`/contact` work (it isn't lost — it stays on the branch). This is the correct first move: it buys time for the stakeholder decision in the next section without leaving production broken.
  - *Requires validation*: confirm via Netlify dashboard that a pre-incident deploy is still retained and was serving the full route set (not itself already reduced — recall `main`'s `pages/` is already reduced too, so "last deploy" may not be "last full-site deploy"; check deploy dates against the known-good `out/` timestamp of 2026-07-10 as a sanity anchor).
- If no full-route-set deploy is retained in Netlify's history, rebuild locally from whichever commit produced `pages/color.tsx`, `pages/lab/sota.tsx`, `pages/synth.tsx`, `pages/spline.tsx`, `pages/posts/[slug].tsx` (identifiable via `git log --all` on those paths — evidence gathered in §B item 3) and deploy that as a stopgap, in parallel with pursuing the rollback path.

### Permanent technical remediation — **branches on a decision only the user/stakeholder can make:**

**Option 1 — Restore the full site.** If the 3-page reduction was scoped for a purpose other than replacing the whole production domain (e.g., meant for a subset export/handoff), the fix is: don't deploy this orphan branch as-is to `abstract.voyage`; instead reintroduce the new `about.tsx`/`abstract.tsx`/`contact.tsx` work into whichever branch carries the full route set, and deploy that.

**Option 2 — Confirm the reduction is intentional; ship a proper retirement.** If narrowing the site to `/`, `/about`, `/abstract`, `/contact` is the deliberate new direction, then the permanent fix is *not* restoring old pages — it's:
- Add a `netlify.toml [[redirects]]` block (or `public/_redirects`) mapping every retired URL to a sensible destination (301) — e.g. `/posts/*` and `/lab/*` to `/abstract` or a dedicated "moved" page, rather than letting them 404.
- Regenerate an accurate `sitemap.xml` and `robots.txt` for the new 4-route surface (both are currently absent from `public/` entirely — the build emits none).
- Submit the retired URLs for removal/change-of-address in Google Search Console so search results and crawl-error reports reflect the intentional retirement rather than accumulating as "broken site" signals.

This assessment does not pick between Option 1 and Option 2 — that is a product decision, not a technical one. Everything below (validation, deployment, verification, resolution criteria) applies to either option; only the content of the fix differs.

---

## D. Root-Cause Analysis

**Root cause:** A statically-exported build (full-replace deploy semantics) containing a deliberately narrowed page set was published to the production domain that had previously served a larger route surface, with no redirect/rewrite layer anywhere in the deploy path to absorb the difference. *(Probable — the one open variable is intent, per §B/§C.)*

**Contributing factors:**
- Static export architecture has no concept of "additive" deploys — every deploy is a total replacement of the served file set. This makes route reduction categorically higher-risk here than it would be on a server that only adds/changes routes it explicitly touches.
- `netlify.toml` has never had a `[[redirects]]` block, on `main` or this branch — a pre-existing structural gap, not a regression introduced by this release.
- `out/` (the actual deployed artifact) is gitignored, so there is no version-controlled, diffable record inside the repo of what the previous production URL surface was. The only reason this RCA could reconstruct it at all was a stale local build artifact that happened to still be on disk.
- No CI pipeline exists (no `.github/workflows`). All verification (`tsc`, `next build`) recorded in the commit message was manual and local.
- The verification that *was* done was correctly scoped to its stated goal (confirm the panel-removal refactor is clean) but was never scoped to "does this change the live URL surface" — nobody was checking for that, because nothing in the process asks that question at any stage.

**Escape points** (where this should have been caught but wasn't):
1. **Pre-merge**: no automated diff between the new build's route manifest and the previous production sitemap/route list.
2. **Pre-deploy**: no staging/preview verification against a checklist of known high-value URLs (the 11 blog posts, `/lab/sota`, etc.) before promoting to the production branch.
3. **Deploy-time**: no CI gate at all — Netlify builds directly off a push with only `next build`/`next export` success as the bar, which says nothing about URL-surface correctness.
4. **Post-deploy**: no automated smoke test hitting known URLs after the deploy went live.
5. **Ongoing**: no synthetic monitoring or 404-rate alerting that would have surfaced this within minutes instead of via manual/external discovery.

**Why existing controls failed:** There were effectively no controls in this dimension to fail — this is a **coverage gap**, not a control that malfunctioned. The only quality gate in the entire path (local `tsc`/`next build`, done manually per the commit message) measures build/type correctness, which is orthogonal to URL-surface correctness. A change can be perfectly type-safe and build cleanly while still deleting most of a website's routes, and nothing in this pipeline would notice.

**Detection gaps:** no synthetic monitoring on any route, no 404-rate dashboard/alert, no Search-Console-integration or crawl-error alerting wired to an on-call/notification channel, no post-deploy smoke suite.

**Process weaknesses:** no defined release protocol for this repo (no entry criteria, no go/no-go gate, no required evidence before a branch is promoted to production); a single-commit orphan branch went straight to production without an explicit review step checking "what does this remove relative to what's currently live."

**Systemic corrective actions** (expanded in §E–§I): (1) make the previous production route/sitemap manifest a durable, version-controlled artifact so it's diffable; (2) require a route-surface diff as a deploy gate, with any removal requiring explicit approval; (3) add a redirects layer as standard infrastructure, not an afterthought; (4) add a minimal CI pipeline (type-check, tests, build, route-diff) before any deploy, even for a small site; (5) add post-deploy synthetic checks on a fixed URL list.

---

## E. Release Process (future state)

Right-sized for this project's actual scale (a small static site, static export, Netlify, no existing CI) — this is deliberately lean, not an enterprise process transplanted wholesale, per the guiding principle that more process isn't automatically more reliable.

| Stage | Activity | Owner | Inputs | Automated checks | AI-assisted checks | Human decision points | Required evidence | Exit criteria |
|---|---|---|---|---|---|---|---|---|
| 1. Planning | Define what the release changes and, critically, what it *removes* | Release author | Prior release's URL manifest (Appendix-style list, kept in repo — see §H) | — | Draft a change-impact summary from the diff between new `pages/`/`public/` and the last known-good manifest | Author explicitly states intended route removals, if any | Change-impact note in the PR/commit description | Route-removal list (possibly empty) is explicit, not implicit |
| 2. Change classification | Classify as Standard / Route-Affecting / High-Risk based on whether routes are added, changed, or removed | Release author | Stage 1 diff | Deterministic: any removed route auto-classifies as High-Risk | — | Confirm classification | Classification recorded | Classification set before proceeding |
| 3. Pre-release testing | Type-check, unit tests, build | CI | Source | `tsc --noEmit`, `vitest run`, `next build` | — | — | CI run green | All three pass |
| 4. URL & route validation | Diff emitted `out/` manifest vs. last known-good manifest | CI | `next export` output | Deterministic manifest diff (see §H) | Summarize the diff in plain language for the reviewer | For any removal: approve, or require a redirect entry before proceeding | Manifest diff report attached to PR | Zero unapproved removals |
| 5. Environment validation | Confirm build config parity (env vars, `next.config.js`, Netlify context) between preview and production | Release author | Netlify deploy context | Netlify preview deploy | — | — | Preview deploy URL works | Preview deploy live and reachable |
| 6. Production-readiness review | Final check before promoting: does this branch's route surface match what's approved? | Release author (self-serve at this scale; add a second reviewer once team > 1) | Stages 1–5 outputs | — | — | Explicit go/no-go | Checklist complete | Sign-off recorded |
| 7. Deployment | Merge/push to production branch | Release author | — | Netlify build+deploy | — | — | Deploy log | Build succeeds, deploy is live |
| 8. Smoke testing | Hit fixed high-value URL list against production | CI (post-deploy hook) or manual script until automated | URL list from §H | HTTP status check script | — | — | Smoke test output | All expected 200s/3xxs, zero unplanned 404s |
| 9. Post-deployment verification | Spot-check key pages render correctly, not just status 200 | Release author | Live site | — | Visual/content diff summary (optional) | Confirm content looks right | Verification note | Confirmed |
| 10. Observability | Confirm monitoring is watching the new route set | Release author | Monitoring config (§H) | Synthetic check config diff | — | — | Monitor config updated if routes changed | Monitors match current route set |
| 11. Rollback readiness | Confirm a rollback target is available before calling the release done | Release author | Netlify deploy history | — | — | — | Prior deploy ID noted | Rollback path confirmed available |
| 12. Release closure | Record what shipped, what was removed/redirected, links to evidence | Release author | All of the above | — | Draft closure note from CI artifacts | Approve closure note | Closure note | Recorded |
| 13. Post-release review | For any P1/P2-triggering release, a short retro | Release author (+ anyone else involved) | Incident data if applicable | — | — | — | Retro notes | Action items logged |
| 14. Continuous improvement | Feed retro action items into backlog | Release author | Retro notes | — | — | — | Backlog items created | Tracked |

---

## F. Release Protocol (mandatory controls)

**Release classifications:**
- **Standard** — no route changes (content/style/logic only within existing pages).
- **Route-Affecting** — adds, renames, or removes any route, or changes `netlify.toml`/redirects.
- **High-Risk** — removes any previously-live route without a corresponding redirect, or changes the production branch/domain mapping itself.

**Entry criteria (mandatory, all classifications):**
- `tsc --noEmit` passes.
- `vitest run` passes.
- `next build && next export` succeeds locally or in CI.

**Additional entry criteria for Route-Affecting / High-Risk (mandatory):**
- Route manifest diff generated and attached (§H).
- Every removed route has either a redirect entry or explicit stakeholder sign-off that it's an approved retirement without redirect.
- `sitemap.xml`/`robots.txt` regenerated and validated against the new route set.

**Go/No-Go criteria:**
- **Go**: all entry criteria met, manifest diff shows zero unapproved removals, preview deploy smoke-tested clean.
- **No-Go**: any unapproved route removal, any failing check above, or preview deploy smoke test shows unexpected 404s.

**Stop-the-line criteria (halt an in-progress or just-shipped release immediately):**
- Post-deploy smoke test shows any previously-200 URL now returning 404/5xx.
- Production 404 rate (once monitoring exists, §H) exceeds baseline by a defined threshold (e.g., 3x baseline sustained over 15 minutes) in the post-deploy monitoring window.

**Rollback triggers:**
- Any stop-the-line condition above, with no fast forward-fix available within an agreed window (e.g., 30 minutes for a small site with a solo/small team) → roll back to the last known-good Netlify deploy immediately; investigate forward-fix after service is restored.

**Monitoring window:** actively watch smoke-test/synthetic results for at least 30–60 minutes post-deploy for Route-Affecting/High-Risk releases; Standard releases can rely on ambient synthetic monitoring (§H) without a dedicated watch window.

**Post-release sign-off:** required for Route-Affecting/High-Risk releases — release author (and a second reviewer, once team size supports it) confirms manifest diff was reviewed, smoke tests passed, and monitoring is watching the current route set.

**Exception handling:** if a route removal must ship without a redirect (e.g., legal takedown), record the explicit exception and reason in the closure note rather than silently skipping the gate — the gate is "was this decision made on purpose," not "redirects are always mandatory."

**RACI (right-sized for current team size — expand columns if the team grows):**

| Activity | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Route manifest diff review | Release author | Release author | — | — |
| Go/No-Go decision | Release author | Release author | Stakeholder (for High-Risk route removals) | — |
| Rollback execution | Release author | Release author | — | Stakeholder |
| Post-release sign-off | Release author | Release author | — | — |

---

## G. AI and Automation Model

Principle: **deterministic checks are authoritative for pass/fail; AI is advisory** — it explains, summarizes, and generates hypotheses/candidates for a human or a deterministic check to confirm, but it never independently blocks or approves a deploy on its own judgment alone.

| Use case | What AI does | Evidence it evaluates | Decision supported | Authority | Deterministic complement | Human oversight | Failure modes to consider |
|---|---|---|---|---|---|---|---|
| Change-impact analysis | Summarizes what a diff adds/changes/removes, in plain language, including route-level impact | Git diff, route manifest diff | Classification (Standard/Route-Affecting/High-Risk) | **Advisory** | Deterministic manifest diff (§H) is what actually sets the classification | Author confirms classification | Under/over-stating impact; must never be the sole source of the manifest diff |
| Release-risk assessment | Flags likely-risky changes (e.g., "this removes routes with no redirect added") | Manifest diff, redirect config | Go/No-Go input | **Advisory** | The manifest diff itself is the deterministic gate | Human makes final Go/No-Go | False sense of coverage if treated as exhaustive |
| Automated test generation | Suggests test cases for new/changed components | Source diff | Test coverage improvement | **Advisory** | Existing `vitest` suite is the deterministic gate once tests are added and reviewed | Human reviews generated tests before merging | Generated tests can be shallow or tautological — must be reviewed, not auto-merged |
| Regression-test prioritization | Suggests which existing tests are most relevant to a given diff | Diff + test suite metadata | What to run/watch closely | **Advisory** | CI runs the full suite regardless — this only orders attention | Human/CI decides actual run scope | Could deprioritize a relevant test if the model misjudges relevance |
| URL/route validation | Not needed as an AI task — this is fully deterministic | — | — | **Deterministic only** | Manifest diff script (§H) | — | AI here would add noise to a problem that doesn't need probabilistic judgment |
| Broken-link/404 detection | Crawls build output or live site and flags anomalies for a human to triage | Crawl results, HTTP status codes | Smoke-test pass/fail | **Deterministic for pass/fail** (status code check); AI advisory only for triage/summarization of *why* | Status-code checker (§H) | Human reviews any flagged anomaly | AI summarization could mischaracterize a legitimate intentional redirect as an error |
| Configuration-drift detection | Diffs `netlify.toml`/`next.config.js`/env vars across environments and explains differences in plain language | Config files across branches/environments | Environment-parity confirmation | **Advisory** | Direct file diff is the deterministic source of truth | Human confirms drift is intentional or not | Could miss semantically-equivalent-but-textually-different config |
| Deployment verification | Summarizes smoke-test/monitoring output into a release closure note | Smoke test results, monitor status | Closure note drafting | **Advisory** | Underlying pass/fail is deterministic | Human approves closure note | Summarization could soften a real failure if not carefully prompted/reviewed |
| Anomaly detection | Flags unusual patterns in 404 rate, response times, traffic once monitoring exists | Monitoring/log data | Alert triage priority | **Advisory** | Threshold-based alerting (§F stop-the-line criteria) is the deterministic trigger | On-call/author confirms real incident vs. noise | Alert fatigue if thresholds are AI-tuned without human review |
| Log/telemetry analysis | Summarizes error logs and telemetry after an incident | Logs, deploy history | Incident triage speed | **Advisory** | — | Human directs investigation | Could over-fit a plausible-sounding but wrong narrative — must be checked against raw evidence, as this document itself does throughout §B |
| Root-cause hypothesis generation | Generates candidate root causes from available evidence (as done in this document) | Repo state, git history, live checks | Investigation direction | **Advisory** | Each hypothesis must be checked against concrete evidence before being labeled Confirmed | Human confirms which hypothesis is actually supported | The single largest failure mode: presenting a plausible hypothesis as fact without verification — mitigated by the Confirmed/Probable/Requires-Validation labeling used throughout this document |
| Post-release learning | Drafts retro summaries and extracts recurring failure patterns across releases | Closure notes, incident history | Backlog prioritization for §I | **Advisory** | — | Human approves backlog items | Could over-generalize from a small sample size (this repo has had exactly one incident of this kind so far) |

---

## H. 404 Prevention Controls

Concrete, mostly deterministic, right-sized for a static-export Netlify site:

1. **Route manifest as a versioned artifact — Implemented.** `release-manifest.json` (repo root) is a committed, versioned list of every approved route, required static file, and forbidden (stripped-panel) identifier. This is the single highest-leverage fix — it's what makes every other control below possible, and its absence is why this specific incident was hard to even reconstruct from the repo alone.
2. **Automated URL inventory comparison / route manifest validation — Implemented.** `scripts/verify-release.js` (run via `npm run verify:release`) runs the full build + export, then diffs the resulting path list against `release-manifest.json` — any unapproved addition or missing approved route fails the gate with a non-zero exit code. This directly targets the failure mode in this incident, and was used to verify the posts-lab promotion in §C before it's promoted.
3. **Redirect validation.** Once `netlify.toml [[redirects]]`/`public/_redirects` exist, a script (or Netlify CLI's own redirect testing) confirms every entry resolves to a real destination and every manifest-diff removal has a matching redirect entry (or an explicit no-redirect exception, per §F).
4. **Link crawling — Implemented (local export only).** `scripts/verify-release.js` step 6 crawls every exported HTML file (including embedded `__NEXT_DATA__` JSON, not just literal `<a href>` tags — this is what caught the confirmed self-inflicted post-dock links in §A/§B) and confirms every internal reference resolves to a real file in the export. Not yet extended to crawl a live/preview deploy over HTTP — that remains open (§I).
5. **Production-like smoke testing.** The URL list from item 1, hit against the actual Netlify preview deploy before promotion, and again against production immediately after deploy — the same check used in §C's remediation, made permanent.
6. **High-value URL testing.** A curated subset of the manifest (homepage, top nav destinations, most-linked/most-trafficked posts) checked with tighter expectations (content assertions, not just status code) — cheap insurance on the pages that matter most.
7. **Sitemap comparison.** Diff the newly generated `sitemap.xml` against the previous one; any URL present before and absent now is flagged the same way a manifest removal is.
8. **Synthetic monitoring.** A scheduled job (cron, GitHub Action, or a monitoring service) hitting the manifest URL list on an interval (e.g., hourly) and alerting on unexpected status changes — this is what would have caught this incident within an hour instead of via manual discovery.
9. **Traffic-aware URL prioritization.** Once analytics/Search Console access is available, weight the high-value URL list (item 6) by actual traffic rather than guesswork, so monitoring effort concentrates where impact is highest.
10. **Pre/post-deployment HTTP status comparison.** The core mechanic underlying items 2, 5, and 8 — always compare a before/after status-code table, never assume "build succeeded" implies "site is intact."
11. **Anomaly detection.** Once synthetic monitoring produces a time series, alert on deviation from baseline 404 rate rather than only on absolute thresholds, catching partial/gradual breakage too.
12. **Rollback thresholds.** Formalized in §F's stop-the-line/rollback-trigger criteria — a defined, pre-agreed threshold (not an in-the-moment judgment call) for when a bad deploy gets rolled back automatically or immediately by whoever is watching.

---

## I. Implementation Roadmap

**Immediate / P1 (this incident):**
- Contain via Netlify rollback (§C).
- Get stakeholder decision: restore vs. intentionally retire (§C Option 1 vs 2).
- Ship the permanent fix (restored routes, or redirects + regenerated sitemap/robots.txt).
- Re-verify the full Appendix URL list live.

**Before the next major release:**
- Commit a route manifest generation script (§H item 1) — this unblocks everything else and is cheap to build.
- Add `netlify.toml [[redirects]]` as standing infrastructure (empty is fine; it exists so it's easy to add to next time).
- Add a manual pre-deploy checklist step: "diff manifest against last known-good, get explicit sign-off on any removal."

**Near-term maturity improvements:**
- Stand up a minimal CI pipeline (`.github/workflows` or Netlify build plugin): `tsc`, `vitest`, `next build`/`export`, manifest diff, as automated pre-merge/pre-deploy gates (§H items 1–4).
- Post-deploy smoke test hook (§H item 5) wired into the Netlify deploy pipeline (Netlify Deploy Notifications / build plugins can trigger a post-deploy script).
- Basic synthetic monitoring (§H item 8) — even a simple scheduled GitHub Action hitting the manifest list is sufficient at this scale; no need for a paid monitoring product initially.

**Long-term release engineering maturity:**
- Traffic-aware prioritization once analytics access is wired in (§H item 9).
- Formal anomaly detection on 404/error rate trends (§H item 11) once enough monitoring history exists to establish a baseline.
- Expand the RACI (§F) and add a second-reviewer step if/when team size grows beyond a solo maintainer.
- Periodic (e.g., quarterly) review of the redirect map to prune genuinely dead redirects and confirm the manifest/sitemap are still accurate.

**Prioritization rationale:** items are ordered so that each near-term item is unblocked by the one before it (manifest → diff → CI gate → smoke test → monitoring), and the P1 containment/fix is sequenced ahead of all process work since restoring production correctness cannot wait on process maturity.

---

## J. Release Success Metrics

Track from the next release onward (no historical baseline exists yet, since no monitoring existed before this incident):

- **Change failure rate** — % of releases requiring rollback or hotfix.
- **Deployment failure rate** — % of `next build`/`export` runs that fail outright.
- **Rollback rate** — count/frequency of rollbacks invoked.
- **Escaped defect rate** — defects discovered in production vs. caught pre-deploy (this incident counts as 1 escaped defect against whatever future baseline is established).
- **P1/P2 incidents caused by releases** — count per period; this document represents the first recorded P1 of this kind.
- **404 rate** — from synthetic monitoring (§H item 8) once live; track absolute count and rate-of-change per deploy.
- **Route-validation coverage** — % of known routes covered by the manifest/smoke-test list (target: 100% of the manifest, weighted by §H item 9 for depth of checking).
- **Automated test coverage** — `vitest` coverage %, currently unmeasured/ungated.
- **Mean time to detect (MTTD)** — time from a route breaking to it being flagged (currently unbounded/manual; target: under the synthetic monitoring interval, e.g. ≤1 hour once §H item 8 ships).
- **Mean time to recovery (MTTR)** — time from detection to resolution; for this incident, measure from actual production go-live to the containment rollback once that timestamp is known (§B's open Netlify-deploy-history question).
- **% of releases using progressive rollout** — not currently applicable to this static-export architecture (no built-in canary/percentage rollout on Netlify's static hosting); note as an architectural constraint rather than a process gap — if progressive exposure becomes a priority, it would require moving off pure static export toward an edge/SSR deployment model with traffic splitting, which is a bigger architectural decision than this incident calls for.
- **% of release gates executed automatically** — currently ~0% (all verification is manual per the commit message); target set by the CI work in §I.
- **Release lead time** — time from change-ready to production-live; track once the process in §E is adopted, to confirm the new gates don't create disproportionate friction for a small site.

---

## K. Ways of Working Going Forward — Recommended Practices

Requested directly by the stakeholder: a concrete "how we work ahead of major releases from here on," grounded in what this incident actually showed about this codebase, not a generic checklist. These are additive to §E–§I, distilled into the practices to actually adopt starting with the posts-lab promotion.

**1. Name and formalize the "-lab" graduation pattern this codebase already uses.** This repo already has a real, working convention for building experimental UI in a sibling `-lab` route/directory before it becomes production (`posts-lab` → `posts` is the second instance of this — `labs/` content and the `/abstract` "Lab" section are the first). That's a good instinct and industry-standard (feature-branch-by-directory / dark-launch pattern) — the gap isn't the pattern, it's that graduation has no checklist. Adopt a standing **Graduation Checklist** for any `X-lab` → `X` promotion, generalized from the Phase 2 checklist in §C: (a) confirm content/data-pipeline compatibility, (b) strip dev-only tooling (panels, debug overlays) while preserving baked-in runtime defaults, (c) confirm layout/dependency-family impact (does it add new dependencies to the production bundle, or reuse what's already shipped?), (d) re-run any responsiveness/visual audits *after* dev-tooling stripping, not before, (e) update canonical/SEO/sitemap metadata, (f) remove the sandbox-vs-production indirection (`NODE_ENV` branches like `getArticleHref`'s) as part of the same change, not as later cleanup.

**2. Treat "what routes does this release remove?" as a first-class release question, always answered explicitly.** The root cause of this whole incident was that nobody had to answer that question before this shipped — not that the wrong answer was given. §E stage 1 and §H items 1–2 (versioned route manifest, automated diff) are how this becomes structural rather than a matter of remembering to check.

**3. Keep using plan docs for scoped feature work (`PLAN-POSTS-LAB-MOBILE-LAYOUT.md`, `PLAN-POSTS-LAB-PANEL-TABS.md`) — and start using the same convention for release scoping, not just feature design.** The existing plan docs are a genuine strength (they document findings, status, and rationale in a way this RCA itself relied on as evidence). Extend that habit one level up: a short `RELEASE-<name>.md` per release, recording scope, explicit exclusions, and the go/no-go checklist result — the release-level equivalent of what these feature plan docs already do well.

**4. Default to fix-forward only when the three conditions from §C are actually met — otherwise default to rollback.** Fix-forward isn't "the new house style"; it was the right call *this time* because rollback's benefit was uncertain (main's route set is already reduced) and a low-risk, already-tested forward fix existed. Re-evaluate case by case: if a future incident has a clean rollback target and no ready-made forward fix, rollback is still the safer default per standard SRE guidance.

**5. Stand up the cheapest version of §H's controls now, manually, rather than waiting for the roadmap.** Specifically for the immediate posts-lab work: before Phase 2 ships, run a manual route-manifest diff (`next export`, diff the file tree by hand against the current live inventory) and a manual smoke-test pass against all 11 post URLs. This costs minutes and directly de-risks the exact kind of gap that caused this incident, without waiting for CI automation.

**6. Separate "is this deliberate?" from "does this work?" as two distinct sign-offs on any release that touches routes.** This incident's ambiguity (was the 4-route scope intentional?) took a full investigation to resolve because the two questions were never asked separately. Going forward: a release's closure note (§E stage 12) should have to state both explicitly, even for a one-person team — it costs one sentence and prevents exactly this kind of retroactive uncertainty.

**7. Right-size all of this — don't let process outgrow the team.** This is a solo/small-team project; the recommendation is a lightweight checklist and a few scripts, not a change-advisory board. Re-read §F's RACI and §I's roadmap with that lens: everything proposed there is sized for the team that exists today, with room to add reviewers/gates later if the team grows, not a mandate to build enterprise process now.

---

## Appendix: Pre-Incident URL Inventory (with disposition, per the 2026-08-28 scope decision)

Reconstructed from the untracked local `out/` build (dated 2026-07-10) and its `sitemap.xml`. This is the working reference list for the manifest diff described in §C and §H until a proper versioned manifest exists. Disposition column reflects the decision recorded in this conversation: only `/`, `/about`, `/abstract`, `/contact` are in permanent scope; `/posts/*` is being replaced (not restored) by the posts-lab graduation; every other route's disposition is still open (see §C resolution criterion 3).

| URL | Status (2026-08-28 live check) | Disposition |
|---|---|---|
| `/` | Confirmed 200 | In scope — stays |
| `/about` | Confirmed 200 | In scope — stays |
| `/abstract` | Confirmed 200 (code inspection: shares build with `/`) | In scope — stays; **also the source of the confirmed self-inflicted dead links** (§A amendment) |
| `/contact` | Confirmed 200 (code inspection) | In scope — stays |
| `/posts/welcome` | Confirmed 404 | **Replace** — will resolve once posts-lab is promoted (§C Phase 2) |
| `/posts/2016-12-24_medium-mastering-solid` | Probable 404 (same mechanism; same content pipeline as posts-lab, not yet promoted) | Replace |
| `/posts/2017-01-15_medium-gzipping` | Probable 404 | Replace |
| `/posts/2017-02-11_medium-dom-basics` | Probable 404 | Replace |
| `/posts/2017-11-03_medium-tech-debt` | Probable 404 | Replace |
| `/posts/2019-09-15_medium-feature-toggles-react` | Probable 404 | Replace |
| `/posts/2020-11-05_medium-taxonomy-dependencies` | Probable 404 | Replace |
| `/posts/2020-12-01_medium-tech-leading` | Probable 404 | Replace |
| `/posts/2020-12-08_medium-resilient-team` | Probable 404 | Replace |
| `/posts/2023-01-27_medium-biomimetics` | Probable 404 | Replace |
| `/posts/2023-05-03_infinity-labs-open-education` | Probable 404 | Replace |
| `/lab/sota` | Confirmed 404 | **Open** — not addressed by the posts-lab decision; needs explicit retire/restore call |
| `/color` | Confirmed 404 | Open |
| `/sitemap.xml` | Confirmed 404 | Must be regenerated regardless of other dispositions (§C Phase 2 step 7) |
| `/connect` | Probable 404 | Open |
| `/spline` | Probable 404 | Open |
| `/synth` | Probable 404 | Open |
| `/visuals` | Probable 404 | Open |
| `/feed.xml`, `/llms.txt`, `/robots.txt` | Probable 404 | Open (robots.txt/sitemap.xml should exist regardless of what else is retired — a static site should always ship both) |
| `/experience/synth/**` | Probable 404 | Open (asset paths tied to the `/synth` route's disposition) |

**Not recommended for restoration without explicit review:** `index.backup.html` existed in the old `out/` build but appears to be a leftover/debug artifact rather than an intentionally published route — flag for confirmation rather than auto-including in any remediation path.

**New finding, not in the original inventory:** the live `/abstract` page's Journal/Post Dock currently renders 11 outbound links to `/posts/{slug}` that all 404 — this is a *self-inflicted* dead link shipped by this release itself, not an orphaned old URL, and is why Phase 1 in §C treats it as the top-priority fix ahead of the fuller Phase 2 promotion.
