# Production route allowlist — plan

**Status: implemented and verified, 2026-10-18.** Originally planning-only; implemented in a later turn per explicit instruction. See §10 for the implementation record and test evidence, and §9 for how to add a route under this mechanism going forward. This document is the sequenced path to a mechanism that keeps every page in source (for code tracking, the same reason `components/Panel/` stays in the tree) while the production build emits only `/`, `/about`, and `/contact`. It mirrors [PLAN-PANEL-BUILD-EXCLUSION-PRODUCTION-READINESS.md](PLAN-PANEL-BUILD-EXCLUSION-PRODUCTION-READINESS.md)'s "in code, absent from shipped output" model, applied to routes instead of components, and it extends the existing release gate (`release-manifest.json` / `scripts/verify-release.js`) rather than inventing a parallel one.

---

## 0. Objective, restated precisely

- Keep every file under `pages/` in source control, buildable under `next dev`, so nothing is lost for future work.
- The production static export (`next build && next export`, Netlify `publish = "out"`) must contain **exactly three routes: `/`, `/about`, `/contact`.**
- `/` is the wall experience (`pages/wall.tsx`, now mounted via `pages/index.tsx` per the route swap already landed this session). The original `/wall` URL must not resolve in production; it already 301-redirects to `/` (`public/_redirects`, landed this session).
- `/about` is `pages/about.tsx`, `/contact` is `pages/contact.tsx`. Both are already production-shaped (panel-excluded per the existing Panel.stub mechanism).
- Every other route — `/abstract`, `/journal`, `/posts/[slug]`, `/thoughts`, `/thoughts/[slug]`, `/labs`-adjacent sandbox pages, `/admin`, `/black-hole`, `/synth-archive`, `/quote-lab`, `/carousel-lab`, `/cube-lab` — stays in the repository but must not appear in `out/`.

## 1. Current state, confirmed this session (not assumed)

- **`pages/index.tsx`** now re-exports `pages/wall.tsx`'s `AbstractPage`/`getStaticProps` (this session's change). `pages/abstract.tsx` is no longer referenced by `index.tsx`, so excluding it from the build cannot break the home route.
- **No existing mechanism excludes routes from `next export`.** `next.config.js` has no `exportPathMap`. Every `.tsx` file directly under `pages/` (per the project's own `pageExtensions: ['tsx']` restriction) becomes a route by default.
- **A release-route allowlist mechanism already exists, but it is a verification gate, not an exclusion mechanism.** `release-manifest.json` lists 21 "approved" routes (including `/abstract`, `/journal`, `/posts/*`, `/thoughts/*`) and `scripts/verify-release.js` (`npm run verify:release`) fails if the actual `next export` output doesn't match that list exactly — it does not prune anything itself. Both need to shrink to the 3-route target as part of this plan, not be left stale.
- **There is direct institutional precedent for exactly this kind of route reduction going wrong in production**, on this exact repository: [P1-404-INCIDENT-RCA-AND-RELEASE-PROTOCOL.md](P1-404-INCIDENT-RCA-AND-RELEASE-PROTOCOL.md). A prior release pruned production to a 4-route set (`/`, `/about`, `/abstract`, `/contact`) and shipped with the homepage's own article-card section still rendering 11 live-looking links to `/posts/*` routes that no longer existed, a self-inflicted dead-link incident, not just an old-bookmark problem. `verify-release.js`'s step 7 (internal-link-integrity crawl) was built specifically in response to this incident. **This plan has the same shape as that incident's starting condition and must not repeat it** — see §3.
- **`pages/admin.tsx`** (the Decap CMS editorial workspace) depends on `/api/dev/editor-config`, a Next API route. This project's `editor`/`dev:editor` npm scripts run a local `decap-server` alongside `next dev`; nothing in the deploy path suggests `/admin` is meant to be reachable on the live static export (API routes are not part of a static `next export` output at all). Confirmed from `package.json` and `pages/admin.tsx`'s own markup, not from a redeploy test. Treat `/admin`'s exclusion as low-risk and consistent with current behavior, but worth a one-line confirmation before implementation (§6).
- **`pages/api/*`** (`dev/editor-config.tsx`, `dev/apply-config-update.tsx`, `copy/generate.tsx`) are local authoring/dev endpoints, not part of `next export`'s static output by construction. No action needed for them under this plan.

## 2. Recommended mechanism: `next.config.js` `exportPathMap`

Next.js's `exportPathMap` (an async function in `next.config.js`, receiving `(defaultPathMap, { dev, ... })`) is the framework-native control for exactly this: which paths `next export` actually writes, independent of what's discoverable under `pages/`. Recommended over the alternative (physically moving excluded page files out of `pages/` before the build and back after) for three reasons:

1. **Zero filesystem risk to concurrent sessions.** This repo routinely runs multiple `next dev` processes against the same working tree (the existing `CLAUDE_NEXT_DIST_DIR` isolation and `predev` stale-server reaper exist because of this). A config-only filter never touches a page file on disk; a move-and-restore script would, and a build interrupted mid-run could leave another session's dev server looking at a missing route file.
2. **Matches the established pattern.** `next.config.js`'s webpack `alias` block already gates the Panel.stub substitution on `{ dev }` — production-only, a no-op under `next dev`. `exportPathMap` takes the identical `{ dev }` argument; gating it the same way means every page stays fully browsable and testable under `next dev` (for this task, for future dev, and for the visual-verification phase below), and only the final static export is filtered.
3. **No new indirection.** `defaultPathMap` (the function's first argument) already contains Next's own fully-resolved route list, including every dynamic `getStaticPaths` entry (`/posts/[slug]`, `/thoughts/[slug]`). Filtering it down to an allowlist of three keys is a few lines, not a parallel path-generation system to maintain.

**Known tradeoff, accepted:** `next build` still compiles and runs `getStaticProps`/`getStaticPaths` for every page under `pages/`, including the excluded ones — `exportPathMap` only filters what `next export` subsequently writes to `out/`. This costs some build time and means a broken excluded page can still fail `next build`. Acceptable because Netlify only publishes `out/` (`netlify.toml` `publish = "out"`), so this doesn't affect what ships; revisit only if build time becomes a real operational problem.

**Correction from implementation (§10): this tradeoff turned out to be a real, not just theoretical, blocker, and `exportPathMap` alone is not sufficient.** `next build` failing on an excluded page (`pages/quote-lab.tsx`, confirmed) turned the "known tradeoff" into an outright build failure, and separately, `exportPathMap` does not suppress export of a `getStaticProps` page in this Next version regardless of what it returns (`/wall` kept exporting even though it was never in the returned map). The mechanism that actually shipped combines three layers, kept here for an accurate record:
1. `exportPathMap` (this section) — kept as a declared-intent filter and defense-in-depth, but confirmed insufficient alone for `getStaticProps` pages.
2. A build-time page-staging wrapper, `scripts/build-production-routes.js` — physically (and temporarily) moves every non-production `pages/**/*.tsx` file out before `next build` runs, so excluded pages can never break the build in the first place, then restores them in a `finally` regardless of outcome. This is what `npm run build:static` actually invokes now.
3. A post-export prune for the one unavoidable case — `pages/wall.tsx` must stay present (it's `pages/index.tsx`'s own import dependency) but is not itself a production route; the staging wrapper deletes `out/wall.html` and its `_next/data/*/wall.json` after `next export` writes them, since nothing upstream suppresses that specific file.

## 3. The cross-cutting risk this plan must resolve: dead internal links

This is not hypothetical, it is this repository's own documented incident (§1). Confirmed sources of outbound links from the 3 kept pages into routes this plan would remove:

| Source | Links to | Why it matters |
|---|---|---|
| `content/wall.md` | `/posts/2023-01-27_medium-biomimetics`, `/posts/2020-12-08_medium-resilient-team`, `/posts/2020-12-01_medium-tech-leading`, `/posts/2020-11-05_medium-taxonomy-dependencies`, `/posts/2017-11-03_medium-tech-debt`, `/posts/2016-12-24_medium-mastering-solid` (and the `the-next-change`/`decision-to-delivery` statements link to `/posts/2017-11-03_medium-tech-debt` and `/about`) | These are the wall's own article cards, the homepage's primary content. Rendering a prominent card that links to a route the build doesn't ship is the exact P1-404 failure mode. |
| `content/pages/about.md` | `[a biomimetic framework for interfaces](/posts/2023-01-27_medium-biomimetics)` | Inline body link in the About narrative. |
| `experiences/abstract/components/SiteHeader.tsx` (nav) | hardcoded `href="/journal"`, plus `isJournalCurrent` checks `pathname.startsWith('/posts/')` | The persistent site nav currently has a JOURNAL item on every page, including the 3 kept ones. |
| `experiences/abstract/components/SiteFooter/SiteFooter.tsx` | `href: '/abstract'` (a footer promo tile) | Points at a route this plan removes. |
| `experiences/abstract/components/MobileNavCube.tsx` | treats `pathname === '/abstract'` as equivalent to `/` for active-state | Stale once `/abstract` isn't live; low severity (dead code path, not a visible broken link) but should be cleaned up for correctness. |

`public/sitemap.xml`, `public/feed.xml`, and `release-manifest.json` also currently enumerate `/about`, `/abstract`, `/journal`, `/thoughts/*`, and every `/posts/*` slug — all need to shrink to the new 3-route reality, not be left pointing at URLs the build no longer serves (the sitemap pointing at dead URLs was itself part of the original P1 incident's blast radius).

## 4. Decision required before implementation (this is the operator's call, not a default)

How should the 3-page build handle its own links into the now-excluded content (the table in §3)? Options, not mutually exclusive:

- **(a) Expand the allowlist** to also ship `/posts/*` (and whichever of `/journal`/`/thoughts` are needed to reach them without a dead index). Keeps every current link working with zero content changes, but is a direct contradiction of the stated 3-route scope — listed for completeness, not as the assumed answer.
- **(b) Edit the content so the kept pages make no outbound claims about excluded routes.** For the wall, this likely means the article "cards" stop being links (display-only, or re-labeled as non-interactive highlights) and the About body link either becomes plain text or is removed. Keeps the 3-route scope exactly as stated; changes the wall's content model (and contradicts the wall's current "article card leads to the article" design this session's own UX analysis described as a strength).
- **(c) Redirect the excluded routes** (`public/_redirects`, same mechanism already used for `/wall → /`) to a sensible destination (for example `/` or `/contact`) so no visitor hits a hard 404 even though the content isn't deployed. Softer than (b) but still means a visitor who clicks "read the article" lands somewhere that isn't the article, a real but smaller UX cost worth naming plainly.
- **(d) Do nothing extra and accept the dead links.** Not recommended; this is verbatim the P1-404 incident's root cause on this same repository, documented in detail in §1. Listed only so it's explicitly rejected rather than silently defaulted into.

This plan's remaining phases assume a decision gets made here before Phase 2 starts; Phase 7's automated gate (§5) will catch it either way if skipped.

## 5. Work plan

### Phase 1 — Resolve §4's decision
Blocking. Everything else depends on knowing whether wall/about content changes, redirects get added, or the scope expands.

### Phase 2 — `next.config.js`: add `exportPathMap`
Filter Next's own `defaultPathMap` down to `{ '/': ..., '/about': ..., '/contact': ... }`, gated on `!dev` (mirrors the existing Panel.stub `if (!dev)` gate in the same file) so `next dev` is completely unaffected and every page remains reachable for local work.

### Phase 3 — Shrink `release-manifest.json`
`routes` becomes `["/", "/about", "/contact"]`. Review `requiredStaticFiles` and `forbiddenIdentifiers` for continued relevance; the route-manifest diff and internal-link crawl in `scripts/verify-release.js` need no code changes, they read the manifest, so this is a data change, not a script change.

### Phase 4 — Prune the static files that enumerate routes
- `public/sitemap.xml`: entries limited to `/`, `/about`, `/contact`.
- `public/feed.xml`: audit its entries the same way (not yet inspected in this plan; likely lists posts, needs the same decision as §4).
- `public/robots.txt`: currently just `Allow: /` plus the sitemap pointer — confirm it needs no change, or add `Disallow` rules for routes that might still be crawlable via old external backlinks even after 404/redirect.

### Phase 5 — `public/_redirects`
Depending on §4's decision: add 301s for `/abstract` (definitely, now dead regardless of §4) and, if (c) was chosen, for `/journal`, `/posts/*` (wildcard), `/thoughts/*`, and the sandbox pages. Keep the existing `/wall → /` rule as-is.

### Phase 6 — Nav, footer, and active-state cleanup
- `SiteHeader.tsx`: remove or repoint the JOURNAL nav item (a 2-item ABOUT/CONTACT nav, or a replacement third item — a real IA decision, not just a code edit, flag for explicit sign-off rather than picking silently).
- `SiteFooter.tsx`: remove or repoint the `/abstract` promo tile.
- `MobileNavCube.tsx`: drop the stale `pathname === '/abstract'` equivalence check.
- Confirm `/admin`'s exclusion is safe (§1's inference) with a one-line explicit check before relying on it, rather than treating the inference as settled.

### Phase 7 — Run the existing release gate against the new target
`npm run verify:release`, already wired to build, type-check, test, diff the route manifest, scan for panel-identifier leaks, and crawl internal links. This is the real proof for §3/§4, not Phases 1-6's own success — step 7 of that script (internal-link integrity) will concretely enumerate any remaining dead link from the 3 kept pages into excluded routes. Treat any failure as a return to Phase 1/4/6, not a one-off patch.

### Phase 8 — Visual verification
Per this repo's own `AGENTS.md` resource-safety rules: a local `next build && next export`, served statically, confirmed to answer only `/`, `/about`, `/contact` with real content, and to 404 or redirect (per §5's decision) on every excluded path, including `/wall`, `/abstract`, `/journal`, and a sample `/posts/[slug]`. Screenshot all three kept routes to confirm nothing visually regressed from the route/nav changes in Phase 6.

### Phase 9 — Documentation
- Update [STRATEGY-SITE-POSITIONING-AND-PAGE-GOALS.md](STRATEGY-SITE-POSITIONING-AND-PAGE-GOALS.md)'s per-page goals table: Journal, posts, thoughts, and labs rows change from "live production page" to "in source, not in the production build" — that table currently describes them as reachable, which stops being true once this ships.
- Cross-reference this plan from `CONFIG-CHANGE-PROTOCOL.md` / the P1-404 doc if those remain the standing authority on release process, rather than letting a third, disconnected process document accumulate.

## 6. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Repeat of the P1-404 incident: a kept page links to an excluded route | §3/§4 make this explicit up front; Phase 7's internal-link crawl is a hard gate, not advisory |
| Sitemap/feed/robots still list excluded URLs, inviting search engines to crawl and index now-dead routes | Phase 4, verified by Phase 7's required-static-files check and a manual review (not currently automated to check *content*, only *presence*, of sitemap/feed) |
| Nav/footer still link to a route that no longer resolves | Phase 6, same link-crawl gate in Phase 7 catches any miss |
| `next build` still pays the cost of building excluded pages (getStaticProps/getStaticPaths execution) | Accepted tradeoff (§2); only `out/` ships, so no production risk, only build-time cost |
| Moving-files alternative mechanism would risk concurrent `next dev` sessions on this shared working tree | Not used; `exportPathMap` is config-only, never touches `pages/` on disk (§2) |
| `/admin`'s exclusion turns out to be relied on in a way not visible from static inspection | Phase 6 explicit confirmation step before treating it as settled |
| Reducing the nav from 3 items to fewer is itself a UX/IA decision, not just a code change | Flagged explicitly in Phase 6, not defaulted |

## 7. Decisions needed (summary)

1. **§4** — how the 3-page build handles its own links into now-excluded content: expand scope, edit content, redirect, or (not recommended) accept dead links.
2. **Phase 6's nav replacement** — what, if anything, replaces the JOURNAL nav item once `/journal` isn't live.
3. **Whether `/abstract` gets a redirect to `/` or is simply allowed to 404** — it has no remaining inbound reference from the 3 kept pages after Phase 6, but external backlinks/bookmarks and search-engine-indexed copies of the old URL still exist.

## 8. Exit criteria

- [ ] §4 decision made and recorded (not defaulted into).
- [ ] `next.config.js` `exportPathMap` added, gated to production export only, verified `next dev` is unaffected (every page still reachable locally).
- [ ] `release-manifest.json` reflects exactly `/`, `/about`, `/contact`.
- [ ] `public/sitemap.xml`, `public/feed.xml`, `public/robots.txt` reviewed and updated to match.
- [ ] `public/_redirects` updated per §4/§7's decisions.
- [ ] Nav/footer/active-state code no longer references routes this build excludes.
- [ ] `npm run verify:release` passes clean against the 3-route target, including a zero-result internal-link-integrity crawl.
- [ ] Phase 8's visual verification completed for all three kept routes and a sample of excluded routes' actual production behavior (404 vs redirect).
- [ ] `STRATEGY-SITE-POSITIONING-AND-PAGE-GOALS.md` updated to reflect which pages are actually live in production.

## 9. How to add a route to the production build

Three files change together, in the same commit — matching this plan's own §3/§8 instruction not to let the manifest, the config, and the real output drift apart.

1. **`next.config.js`** — add the route's path string to the `PRODUCTION_ROUTES` array inside `exportPathMap`. This is declared intent and a defense-in-depth filter; per §2's correction it is not sufficient alone for a `getStaticProps` page, but it costs nothing to keep accurate.
2. **`scripts/build-production-routes.js`** — add the page's file path (relative to `pages/`) to the `PRODUCTION_PAGE_FILES` set, so the staging step stops moving it out before `next build` runs. If the new page is a dynamic route (a `getStaticPaths` page, the `posts/[slug].tsx` shape), add its directory or bracket file the same way — the staging walk is recursive and extension-based, it doesn't care about the dynamic-segment syntax.
3. **`release-manifest.json`** — add the route to `routes`. For a dynamic route, list every concrete path it resolves to (matching the pre-pruning manifest's own `/posts/2016-12-24_medium-mastering-solid` style, one entry per slug), not the bracket pattern itself — `scripts/verify-release.js`'s route-manifest diff compares against the actual exported `.html` files, which are concrete paths.

Then:
4. Add the new page to `public/sitemap.xml` and, if it's an article-shaped page, `public/feed.xml`.
5. If the page is reachable only by a direct link today (no nav entry), decide whether it needs one — this plan doesn't add nav entries automatically, by design (§6's own nav decision was deliberately left to the operator, not defaulted).
6. Run `npm run build:static` (or, for local testing on a shared working tree with other `next dev` sessions active, do it inside a disposable `git worktree` instead — see §10's test record for the exact commands; the staging script briefly moves real files on disk, unsafe for a shared tree with an active watcher).
7. Confirm the new route's `.html` appears in `out/` and nothing unexpected also appears (`find out -name "*.html"`).

**The reverse (removing a route) is the same three-file edit in reverse** — drop it from `PRODUCTION_ROUTES`, `PRODUCTION_PAGE_FILES` (only if the page file isn't also a dependency of a route that stays, the way `wall.tsx` is — see the `NON_ROUTE_DEPENDENCY_ROUTES` case in the script if a removed route's file still needs to stay present as an import), and `release-manifest.json`. Add a `public/_redirects` rule for the retired URL (the existing `/*  /  301` catch-all already covers this automatically, so an explicit rule is optional, only useful for documenting intent on a specific high-traffic retired URL the way the `/wall` and prior-session's `/abstract`-adjacent rules do).

## 10. Implementation record (2026-10-18)

Implemented per explicit operator instruction ("Implement and test... get back with evidence... explain how to add more routes"). Full sequence, including two issues discovered only by actually running a real `next build` (neither hypothetical in §2/§5's original planning pass — both are now folded into those sections and into this record):

- **`next.config.js`**: added `exportPathMap`, gated on `!dev`, filtering Next's own `defaultPathMap` to `['/', '/about', '/contact']`. Kept despite §2's correction (declared intent, harmless, free defense-in-depth).
- **`scripts/build-production-routes.js`** (new): the real enforcement mechanism. Stages out every `pages/**/*.tsx` file except `_app.tsx`, `_document.tsx`, `index.tsx`, `about.tsx`, `contact.tsx`, and `wall.tsx` (the last one a dependency, not a route) into `.pages-excluded-staging/`, runs `npm run build` (preserves the existing `prebuild` → tailwind-field verification hook) then `next export`, prunes the one unavoidable `wall.html`/`wall.json` leak, and restores every staged file in a `finally` regardless of outcome.
- **`package.json`**: `build:static` now runs this script instead of the old `npm run build && npm run export`.
- **`release-manifest.json`**: `routes` shrunk from 21 entries to `["/", "/about", "/contact"]`.
- **`public/sitemap.xml`**: rewritten to the 3 routes only (previously listed `/abstract`, `/journal`, every `/posts/*` slug).
- **`public/feed.xml`**: emptied to a valid zero-item RSS channel (every prior item linked to a now-excluded `/posts/*` URL).
- **`public/_redirects`**: added a catch-all `/*  /  301` after the existing `/wall → /` rule, so every excluded route (including any future one added to `pages/` without also being added to the allowlist) redirects to the canonical home instead of hard-404ing — this directly answers §4's decision, choosing option (c), and is the concrete mitigation for the dead-link risk documented in §3 and the repository's own [P1-404-INCIDENT-RCA-AND-RELEASE-PROTOCOL.md](P1-404-INCIDENT-RCA-AND-RELEASE-PROTOCOL.md).
- **Two pre-existing, unrelated defects found blocking the first real `next build` of this route set, fixed as part of getting to working evidence:**
  1. `pages/WallQuoteItem.tsx` + `.test.tsx` were shared component/test files colocated directly under `pages/`, which Next's `pageExtensions: ['tsx']` treats as routes; the test file's server-only (`fs`-using) import chain broke the webpack build. Relocated both to `experiences/abstract/components/Quote/` (alongside the sibling `EditorialQuote.tsx` they already depend on) and fixed their relative imports; updated `pages/wall.tsx`'s own import accordingly. Dormant under `next dev`, fatal under `next build` — nobody had run a clean production build recently.
  2. `pages/wall.tsx` was never taken through the panel-build-exclusion production work ([PLAN-PANEL-BUILD-EXCLUSION-PRODUCTION-READINESS.md](PLAN-PANEL-BUILD-EXCLUSION-PRODUCTION-READINESS.md) only covered `about`/`abstract`/`contact`/`posts/[slug]`) — unsurprising, since nothing routed to it in production until this session's wall-to-homepage promotion. Two gaps, both fixed at the root (the shared stub files, not a wall.tsx-specific hack): `scripts/panel-stub-manifest.json` was stale and missing stub coverage for `PracticesSection.panel.ts`/`Quote/*.panel.ts` (fixed by re-running `node scripts/generate-panel-stubs.js`, which is the generator's own documented maintenance step, not new tooling); and `components/Panel.stub/index.ts` / `components/Panel.stub/config.ts` were each missing one real export (`DEFAULT_PANEL_SHELL_CONFIG`, `defineConfigScope`) that the real `components/Panel` module provides and that wall.tsx's own code (and `CoverFlow/OvalGeometryPreview.tsx`) reads unconditionally — added both, matching the file's own existing safe-stub conventions exactly (a real passthrough value for the plain-data case, the same safely-callable Proxy the generator already uses elsewhere for the function case).

**Test evidence.** Run inside a disposable `git worktree` (`git worktree add /tmp/route-allowlist-verify HEAD`, with the session's uncommitted changes copied in and `node_modules` symlinked), specifically to avoid moving real files in the shared working tree while two other `next dev` sessions were active against it (confirmed running via `pgrep -fl "next dev"` before and after). `CLAUDE_NEXT_DIST_DIR=.next node scripts/build-production-routes.js`, full output captured:

```
Route (pages)                              Size     First Load JS
┌ ● / (340 ms)                             261 B           453 kB
├   /_app                                  0 B             165 kB
├ ○ /404                                   181 B           166 kB
├ ● /about                                 16.8 kB         282 kB
├ ● /contact                               33.8 kB         252 kB
└ ● /wall (341 ms)                         199 B           453 kB   ← pre-prune; removed by the script immediately after
...
Export successful. Files written to /private/tmp/route-allowlist-verify/out
[build-production-routes] pruned leaked export: out/wall.html
[build-production-routes] pruned leaked export: out/_next/data/OKcOnVGIHv3TDOUcCUdbI/wall.json
[build-production-routes] restored 14 page file(s) to pages/.
```

Post-build checks, all passed:
- `find out -name "*.html"` → exactly `404.html`, `about.html`, `contact.html`, `index.html`. No `wall.html`, `abstract.html`, `journal.html`, `admin.html`, `quote-lab.html`, `carousel-lab.html`, `cube-lab.html`, `black-hole.html`, `synth-archive.html`, or any `posts/`/`thoughts/` page.
- `out/_next/data/<buildId>/*.json` → exactly `about.json`, `contact.json`, `index.json`. No `wall.json`.
- Programmatic diff: exported route set vs. `release-manifest.json`'s `routes` array → exact match.
- `out/admin`, `out/posts`, `out/og`, `out/experience` directories exist but are confirmed to be static asset folders copied verbatim from `public/` (cover images, the Decap config loader, OG images), not page routes — zero `.html` files in them beyond what's already counted above.
- `out/index.html` contains real wall markup (`data-wall-quotes` present, correct `<title>`) and the correct `rel="canonical" href="https://abstract.voyage/"`; `about.html`/`contact.html` likewise have correct titles and self-canonical tags.
- `pages/` directory in the worktree, after the run: byte-identical file count and contents to before the run (all 14 staged files restored; staging directory removed).
- `out/_redirects` present in the export, containing both the `/wall → /` rule and the new catch-all.

**Not yet done, explicitly out of scope for this pass:** §4's content decision beyond the redirect mitigation (wall.md/about.md still contain `href`s into now-excluded `/posts/*` — the catch-all redirect means a visitor lands on `/` instead of a 404, but "click an article card, land back on the page you were already on" is still a real, named UX cost, not a full resolution); §6's nav/footer/active-state cleanup (`SiteHeader.tsx`'s JOURNAL link, `SiteFooter.tsx`'s `/abstract` tile, `MobileNavCube.tsx`'s stale `/abstract` check); `npm run verify:release` itself still calls raw `next build`/`next export` rather than this new staged script, so it would not currently pass without the same staging — needs the same `build-production-routes.js` wiring as `build:static` got; `STRATEGY-SITE-POSITIONING-AND-PAGE-GOALS.md`'s per-page table still describes Journal/posts/thoughts/labs as live production pages.
