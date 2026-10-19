# Site positioning and per-page goals

Status: **strategic reference**, written 2026-10-18, for operators and for future LLM work on this repository. This document states what the site is for, who it serves, what each page is meant to achieve, and the guardrails that keep the work honest. It is a decision frame, not an implementation plan, and it does not itself change copy or code.

It builds on, and does not override, the positioning work already in the repository:
- [ANALYSIS-POSITIONING-AND-INFERENCE-AUDIT.md](ANALYSIS-POSITIONING-AND-INFERENCE-AUDIT.md) and [PLAN-POSITIONING-AND-EDITORIAL-ARCHITECTURE.md](PLAN-POSITIONING-AND-EDITORIAL-ARCHITECTURE.md) for the intended inference and the copy guardrails.
- [ANALYSIS-WALL-UX-IA-AND-CONVERSION.md](ANALYSIS-WALL-UX-IA-AND-CONVERSION.md) for the wall-specific analysis this document assumes.
- [PLAN-CENTRALIZED-PAGE-CONTENT.md](PLAN-CENTRALIZED-PAGE-CONTENT.md) for where page copy lives (`content/pages/`, `content/wall.md`, `content/practices.md`).

## How future LLM work should use this document

1. Before changing a page, read its row in the per-page goals table and confirm the change serves that page's primary goal and primary audience.
2. Hold to the voice and evidence guardrails below. They are strict on purpose: the site uses real articles and a real career as evidence, so invented proof is disproportionately damaging.
3. When a request conflicts with a stated goal or guardrail, surface the conflict rather than silently resolving it.
4. Treat psychology, neuroscience, and neuromarketing rationale as theory informed. Do not describe a design as effective until observation supports it.

## Positioning north-star

One sentence. Manuel Cerdas is a senior software engineer and technical leader who shapes digital products through implementation judgment and close attention to how people understand and use them, carrying decisions from the first conversation through to working software in real use.

This is one practice, not several adjacent interests. The four disciplines are the shape of that one practice, taken from `content/practices.md`:
1. Product Strategy and Direction, deciding what is worth building.
2. Experience and Interface Design, worked out as working software rather than static mockups.
3. Software Engineering and Architecture, built to stay reliable and maintainable.
4. Applied AI and Intelligent Automation, where it genuinely earns a place, with human oversight.

The connective claim, the one the whole site is trying to make legible, is that these are held in a single continuous line of reasoning, so nothing is lost in handoffs.

Credibility arc, supported by the repository and safe to state: contract engineering from around 2010, growing leadership across squads and whole engagements, work across several teams on firm-wide initiatives at McKinsey from 2023 to 2025, and independent practice since 2025 that still carries decisions through implementation. Documented industries are consumer goods, real estate, and online retail.

## Audiences and their jobs to be done

The site serves two primary audiences with different scanning behavior. Design each page for both, but know which one leads.

- **Technical recruiters and hiring managers.** Job: within roughly thirty seconds, verify discrete signals, seniority, scope, stack, breadth, named context, and then find proof and a way to reach out. They scan for checkable facts and real work.
- **Prospective clients, founders and product or engineering leaders.** Job: decide whether this person can help with a specific problem, understand how engagement works, and start a low-friction conversation. They scan for problem-fit and a credible path to contact.
- **Secondary, peers and referrers.** Job: understand the thinking well enough to trust and recommend. Served by the writing and the labs.

Shared truth: both primary audiences decide fast, from the first screen, and both convert through the same two actions, read the work or start a note.

## Conversion architecture

There are two conversion actions on the site. Keep them consistent and always reachable.
1. **Start a note** through `/contact` (the Relay assistant). This is the primary conversion for clients and the secondary for recruiters.
2. **Read the work**, an article under `/posts/`, a note under `/thoughts/`, a lab under `/labs/`, or the career story at `/about`. This is the primary evidence action for recruiters and a trust-builder for clients.

Every substantive page should offer at least one clear path to each: a way to go deeper into the work, and a way to reach out. The nav (ABOUT, JOURNAL, CONTACT) carries the persistent path; individual pages should reinforce it at their close, as the wall banner already does.

## Per-page goals

Primary audience codes: R recruiter, C client, P peers. Routes marked internal should be excluded from public journeys and search indexing.

| Route | Page | Primary goal | Primary audience | Primary action | Success signal | Key guardrails |
|---|---|---|---|---|---|---|
| `/` | Home (`abstract.tsx`) | Orient in one screen: who, what, why credible; route to work, story, or contact | R, C | Enter the work or start a note | Visitor can state who this is and what they do, and chooses a next step | Lead with positioning, not only atmosphere; keep engineering current, not past tense |
| `/wall` | The thinking wall | Show how the owner thinks, reflections plus real work, and convert at the close | C, R | Discuss a challenge (`/contact`); read a post | Visitor follows the narrative and reaches the call to action | Resolve discovery and canonical status first (see wall analysis F1); orient the first screen via the merged featured card, identity plus operating principle plus a practice-referencing CTA that scrolls to the Practices section (see wall analysis F2) |
| `/about` | Career narrative | Establish seniority, trajectory, and judgment; make the one-practice story legible | R, C | Start a note (`/contact`); read linked posts | Reader perceives a senior, connected practice, not scattered interests | Make duration visible early; keep claims bounded to what is documented; no invented metrics |
| `/journal` | Writing index | Present the body of writing as browsable evidence of expertise | R, P | Open a post | Visitor opens at least one post | Titles and excerpts must match article content; do not oversell |
| `/posts/[slug]` | Full article | Demonstrate technical depth, tradeoff judgment, and clear thinking | R, P | Read, then reach out or read more | Time on page; onward to contact or another post | Fix inaccurate or overstated claims in featured posts before promoting them |
| `/thoughts`, `/thoughts/[slug]` | Shorter notes | Show current, lighter-weight thinking and voice between full articles | P, C | Read; follow to related work | Reader returns or goes deeper | Keep notes genuine; do not pad the archive to look prolific |
| `/labs`, `/labs/[slug]` | Creative-coding experiments | Demonstrate front-end, graphics, and interaction craft and range | R, P | Explore; infer capability | Recruiter registers hands-on craft | Label exploratory; drafts stay out of production; keep performant and accessible |
| `/contact` | Relay contact assistant | Capture and shape a high-quality inquiry while the visitor keeps control of the message | C, R | Send a note to Manuel | Completed, well-formed notes; low abandonment | Promise only what the process delivers; always allow sending original words; graceful degraded path |
| `/admin` | Decap CMS | Internal content editing | internal | n/a | n/a | Not a public destination; keep out of nav and index |
| `/quote-lab`, `/carousel-lab`, `/cube-lab` | Component sandboxes | Internal design and development tooling for building shared components | internal | n/a | n/a | Author-facing; exclude panels and these routes from production and search |
| `/black-hole`, `/synth-archive` | Experiential pieces | Optional expressive or experimental surfaces | P | Explore | Delight, range | Keep clearly secondary; do not let them define the professional profile |

Notes on the home and wall relationship: today `/` renders `abstract.tsx` (hero plus featured-post CoverFlow) and `/wall` renders the masonry thinking wall but canonicalizes to `/abstract` and is not linked from the nav. These two pages overlap in intent. The open decision below must be resolved so one of them clearly owns the "primary experience" role.

## Voice and copy guardrails

Carried forward from the positioning audit, with two additions.
- Do not invent projects, responsibilities, client names, metrics, adoption, revenue, user counts, audience scale, or research validation. The repository does not document these.
- Keep engineering current and foundational. Do not imply implementation is delegated away or belongs only to an earlier phase.
- Avoid labels that split engineering from the broader work. Prefer concrete decisions, constraints, interface behavior, and documented scope.
- Do not present applied AI as an established, evidenced specialization. It is a genuine discipline of the practice, stated as capability and judgment, not as a track record the posts do not yet support.
- Keep the Relay contact assistant's promises inside what the process can meet (reply windows, degraded fallback, visitor control of the message).
- House style addition, voice: write plainly; prefer short declarative sentences; let examples carry positioning before any label.
- House style addition, punctuation: the operator prefers prose without long dashes. When editing copy, favor commas, semicolons, colons, periods, or parentheses over em dashes. This is a preference to apply when touching copy, not a mandate to sweep existing content in a single pass.

## Evidence and validation standard

- **Theory informed** rationale applies general models (attention, fluency, information scent, cognitive load, serial position, authority) to this site. It guides prioritization; it does not prove an outcome.
- **Strategic and editorial judgment** covers positioning, voice, accuracy, and taxonomy.
- Nothing here is **empirically informed** for this site, because no visitor study has tested these specific pages.
- Before claiming a change works, run a small task-based test with people in the two primary roles, measuring whether they can identify who this is and what they do, find one piece of work, and find the way to reach out. Use the result to adjust prominence and copy.

## Open strategic decisions

1. **Home versus wall (highest priority).** Decide whether the wall becomes the primary experience (promote it to `/`, or merge it into the home) or remains a distinct, first-class destination that is linked from the nav and the home and given its own canonical URL and metadata. The current orphaned, canonical-to-`/abstract` state is the one option to retire. See [ANALYSIS-WALL-UX-IA-AND-CONVERSION.md](ANALYSIS-WALL-UX-IA-AND-CONVERSION.md) F1.
2. **AI positioning maturity.** Decide how prominently to present Applied AI given the current evidence gap. Recommended stance until there is publishable proof: present it as capability and judgment within the practice, not as a headline specialization.
3. **Labs prominence.** Decide how much to surface the labs in primary journeys. They are strong recruiter craft signals but should not crowd out the professional narrative.

## References

Internal: the positioning audit and plan, the wall IA plan, the centralized-content plan, and the panel build-exclusion plan named above. External research references are listed in the wall analysis and the wall IA plan.
