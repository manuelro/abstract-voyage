# Plan: create `CLAUDE.md` at repo root, closing the "nothing auto-loads" gap

**Handoff note:** this plan is written for an executing agent with no memory of the conversation that produced it. Every claim below about current repo state was true as of 2026-09-06 — **verify against the live repo before acting on any of it**, don't copy it as fact. Where this plan says "confirmed," it means confirmed at that date, not confirmed permanently.

## Context — why this file needs to exist

This repo has accumulated a real, working convention of root-level markdown artifacts — implementation plans (`PLAN-*.md`), read-only findings (`AUDIT-*.md`), diagnosed bugs (`BUG-REPORT-*.md`), and process-protocol docs born from real incidents (`CONFIG-CHANGE-PROTOCOL.md`, `P1-404-INCIDENT-RCA-AND-RELEASE-PROTOCOL.md`, `UI-BUG-DIAGNOSIS-PROTOCOL.md`). None of it is discoverable by a fresh agent session except by knowing to `ls *.md` and read them — there is no `CLAUDE.md` and no `AGENTS.md` anywhere in this repo (confirmed directly: `find` for both at repo root and via `git show HEAD:AGENTS.md` came back empty on the `main` branch). `CLAUDE.md` is the one file Claude Code auto-loads into every session's context for a project automatically — creating it is what turns "an agent might stumble onto the right doc" into "an agent is told, every session, where the docs are."

**The incident that surfaced this gap:** a session spent three rounds of expensive misdiagnosis on a CoverFlow visual bug, missing a cause (`.stackNeutralSurface`'s own border) that had already been found and named earlier in the *same conversation*. The resulting postmortem produced `UI-BUG-DIAGNOSIS-PROTOCOL.md` — a real, useful protocol doc — that then sat with zero path for any future session to ever find it. That's the specific failure this plan closes, generalized to the same gap already existing for the other protocol docs.

## What to verify before starting (do this first, don't trust this plan's paraphrase)

1. Confirm `CLAUDE.md` and `AGENTS.md` still don't exist at repo root (`ls -a` at repo root; also check `git show HEAD:AGENTS.md` / `HEAD:CLAUDE.md` in case a different branch carries one worth reconciling with).
2. Confirm the current full list of root-level `*.md` convention files (`ls *.md` at repo root) — new ones may have been added since this plan was written. Read each one's opening paragraph to classify it (plan / audit / bug report / protocol).
3. Read `package.json`'s `scripts` block directly rather than trusting any paraphrase of dev commands.
4. Read the actual `CoverFlow`/`Card` config-panel files (`experiences/abstract/components/CoverFlow/CoverFlow.config.ts` and sibling `.panel.ts` files, `experiences/abstract/components/Card/config/appearance.ts`) to confirm the config-panel pattern description below still matches reality.

## Recommended procedure

**Step 1 — generate a baseline with the `init` skill/slash-command** (`/init` in Claude Code — "Initialize a new CLAUDE.md file with codebase documentation"). This produces generic codebase orientation (tech stack, folder layout, build/test commands) cheaply and accurately from the live repo, rather than hand-writing it and risking staleness.

**Step 2 — layer the following required sections on top of that baseline.** These are the parts a generic init pass has no way to know about, because they're specific to incidents and conventions this repo has already lived through:

### Required section: root-level markdown artifact convention

State plainly that this repo accumulates investigation/plan artifacts as root-level markdown files, using these prefixes:
- `PLAN-<NAME>.md` — an implementation plan, written before or alongside a nontrivial change.
- `AUDIT-<NAME>.md` — read-only investigation findings, no code changed.
- `BUG-REPORT-<NAME>.md` — a diagnosed bug, root cause and (if fixed) the fix.
- `<TOPIC>-PROTOCOL.md` / `*-INCIDENT-RCA-*` — a standing process rule born from a real incident, meant to be followed on every future occurrence of that class of problem, not just referenced once.

Directive to encode: **before starting any nontrivial investigation or plan, run `ls *.md` at repo root and read anything whose name plausibly overlaps the task** — prior work on the same component/bug class may already exist. When producing a new plan/audit/protocol, follow the same naming and structural convention (see any existing file of that type for the expected shape) so the next agent's own `ls *.md` pass finds it.

### Required section: UI bug diagnosis — mandatory pointer

Explicit, imperative, not optional-sounding:

> Before diagnosing any "this looks wrong" visual/rendering bug, read `UI-BUG-DIAGNOSIS-PROTOCOL.md` in full. It contains a cheapest-first diagnostic hierarchy (live config values → CSS grep → cheap live toggle → DOM inspection → rendering-pipeline theories, in that order) and a running ledger of already-discovered `Card`/`CoverFlow`/`ArticleCard` visual mechanisms. Check the ledger before generating a new hypothesis. Extend the ledger when a new mechanism is found, even one that turns out not to be the cause of the bug you were chasing — it may be the cause of the next one.

### Required section: config-panel system pointer

One paragraph: many components in `experiences/*/components/` follow a `<Component>.config.ts` (typed default + clamped `normalize*Config` function) + `<Component>.panel.ts` (`defineConfigScope(...)` UI definition) pair. Operators tune values live under `next dev` only — the panel is compile-time-excluded from production builds (verified by `scripts/verify-release.js`'s panel-identifier leak scan). Point to `CONFIG-CHANGE-PROTOCOL.md` for the full Tune → Verify → Promote workflow and the Category 1 (page-local) vs. Category 2 (genuinely global/shared) classification that determines how much review a config change needs.

### Required section: dev server hygiene

State the port/build-isolation rules as a hard rule, not a suggestion, since violating them corrupts a shared `.next` cache or collides with a port the human operator may already be using:
- Never launch a dev server on port 3000 or 3001.
- Always set `CLAUDE_NEXT_DIST_DIR` (an env var `next.config.js` already reads — confirm this is still true by reading `next.config.js` directly) to an isolated build directory; a different port alone does not prevent shared `.next` cache corruption.
- Kill any dev server you started before ending the session.

### Required section: verification standard

State plainly: never declare a bug fixed or a feature working without reproducing the *exact reported scenario* live (real browser, not code-reading alone), then testing the adversarial/edge case most likely to still be broken. For UI changes, use the `verify` skill or an actual running browser — screenshots or DOM/computed-style measurements, not inference from source.

### Required section: scope discipline

One paragraph: this repo has files with wide blast radius shared across multiple pages/experiences (shared config providers, `tailwind.config.js`, components reused by more than one page's own presentation). When a task's scope is one page/component but the correct fix would require touching a shared file, surface that explicitly and ask before proceeding, rather than silently widening the change.

## What NOT to do in this pass

- Don't attempt full prose documentation of every component/experience — that's a losing battle against a codebase that changes daily, and it's not what closes the actual gap (discoverability of the protocol docs). Point to the docs; don't restate their contents in `CLAUDE.md` itself, or the two will drift out of sync.
- Don't delete or restructure any existing `PLAN-*.md`/`AUDIT-*.md`/protocol file as part of this pass — this plan only adds one new file.
- Don't wire this into `.claude/settings.json` hooks or automation — `CLAUDE.md` auto-loading is already the built-in mechanism; no additional plumbing is needed or wanted.

## Verification for this plan's own implementation

- After writing `CLAUDE.md`, start a **fresh** Claude Code session in this repo (not a continuation of the session that wrote it) and confirm the file's content actually appears in that session's own initial context (this is the whole point — verify the loading path works, don't assume it from the file existing on disk).
- Ask that fresh session a question equivalent to "a CoverFlow card's edge looks wrong, what do you check first?" and confirm it independently locates and applies `UI-BUG-DIAGNOSIS-PROTOCOL.md`'s hierarchy without being told the filename.
- Confirm `npm run verify:release` (or whatever the current equivalent script is — check `package.json`) still passes; a new root-level markdown file should never affect it, but this is a cheap check worth running regardless.
