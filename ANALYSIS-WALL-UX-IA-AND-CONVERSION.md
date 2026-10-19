# Wall UX, IA, and conversion analysis

Status: **expert review for operator decision**, completed 2026-10-18. This is design, information-architecture, and positioning guidance grounded in a live inspection of `/wall`. It does not change code or copy. Psychology, neuroscience, and neuromarketing claims are labeled **theory informed**: they apply general models to this page, they are not the result of a visitor study. Follow the evidence standard in [ANALYSIS-POSITIONING-AND-INFERENCE-AUDIT.md](ANALYSIS-POSITIONING-AND-INFERENCE-AUDIT.md). Where this document recommends copy or structure, treat each item as an option for review, not a mandate.

Companion document: [STRATEGY-SITE-POSITIONING-AND-PAGE-GOALS.md](STRATEGY-SITE-POSITIONING-AND-PAGE-GOALS.md) holds the site-wide positioning and the per-page goals this analysis assumes.

## Scope and method

- Scope: the wall experience assembled in `pages/wall.tsx`, with content from `content/wall.md` and `content/practices.md`.
- Method: live inspection of `/wall` on a private dev server, captured at 1440x900, 1024x820, and 390x844, full-page and in scroll steps, so scroll-driven gradient states were observed rather than inferred. Content, SEO wiring, and navigation were read from source.
- Strategic frame: the wall must serve two audiences at once, technical recruiters and prospective clients, and the stated job of the page is to show how the owner thinks. The analysis is organized around that dual job.

## Verdict

The wall is a genuinely distinctive artifact. The art direction is confident, the editorial voice is coherent, and the closing Practices banner is a strong conversion surface. The page is close to production quality on craft. Its weaknesses are not visual, they are architectural: the page is hard to discover, it does not orient a first-time visitor in the opening screen, and the one element that would orient them, the personal introduction, is placed last. Fixing discovery and the first screen is worth more than any further visual polish.

## What works, preserve it

- **A memorable, ownable aesthetic.** Vibrant gradient article cards interleaved with serif editorial quotes and one high-contrast featured statement (THE NEXT CHANGE) read as deliberate and crafted. This is a differentiator against template portfolios and is itself evidence of front-end and interaction craft, which is a recruiter signal.
- **A real narrative.** The quotes trace a career arc from contractor to leading engagements to McKinsey to independent work. Read in sequence they do deliver on the promise of showing how the owner thinks.
- **A well-built conversion close.** The Practices banner (eyebrow, the "Judgment carried from the first decision through to real measurable use" headline, four practice areas, delivery, industry, and the "Discuss a product or engineering challenge" call to action) has clear hierarchy, good contrast, and a single primary action. This is the strongest part of the page.
- **A clean single-column mobile reading sequence.** The masonry collapses to a legible top-to-bottom narrative on a 390px viewport, and the banner and call to action render well there.

## Findings, ranked by strategic impact

### F1. The wall is architecturally orphaned and declared non-canonical (P1)

Observation, from source. `pages/wall.tsx` sets `canonicalPath="/abstract"` and reuses `/abstract`'s title and description (`loadAbstractPageContent`). Nothing in the site navigation or the wordmark links to `/wall`; the only references to the route are in planning docs and build wiring. The primary nav exposes only ABOUT, JOURNAL, and CONTACT.

Why it matters. A page that is meant to do the heavy lifting cannot do it if no one arrives, and if search engines are told its canonical address is a different page. Today the wall is effectively a hidden variant of the home. This is the single highest-leverage issue, because every other refinement below only pays off once the page is reachable and indexable.

Recommendation, a strategic decision for the operator (see the companion strategy document, Open decisions). Choose one coherent model:
- **A. Promote the wall to the primary experience.** Make `/` render the wall, or merge the wall's masonry into the home. Then it inherits the home's discovery and canonical status by definition.
- **B. Keep `/abstract` as home and make the wall a first-class destination.** Add it to the nav with a concrete label (for example WORK or THINKING, not an abstract word), give it its own canonical path and its own title and description, and link to it from the home hero.

Do not leave the current in-between state, where the wall carries the heaviest message but is unreachable and canonicalized away.

### F2. The first screen does not orient the visitor (P1)

Observation. The wall now renders at `/` (the homepage, per this session's route change), so this is the site's first screen. The opening viewport is the wordmark, a three-item nav, and immediately the masonry of cards and quotes. There is no single line that answers who this is, what they do, and why it is credible. The wordmark "Abstract Voyage" is evocative but not self-explaining. The one piece of orientation copy that exists, the "I'm Manuel Cerdas..." introduction, sits at the very bottom of the scroll (this was the separate finding F3; it is folded into F2 below, because the assessed direction resolves both at once).

Why it matters, theory informed. First impressions of a page form in a fraction of a second and are dominated by pre-attentive visual processing; the opening screen sets expectations before any reading happens (Lindgaard et al., 2006; Itti and Koch, 1998, on visual salience). The first-encountered item in a sequence is recalled and weighted disproportionately (primacy in the serial-position curve, Murdock, 1962) and anchors the interpretation of everything that follows (anchoring and adjustment, Tversky and Kahneman, 1974): an oriented first object makes the subsequent quotes read as "this person's thinking," while an un-oriented one leaves them as unattributed fragments. Material that is easy to place and understand is judged more favorably and more competent (processing fluency, Reber, Schwarz, and Winkielman, 2004); a first screen that is beautiful but ambiguous spends that fluency on decoration rather than on positioning. For a recruiter doing a roughly thirty-second scan (the audience job-to-be-done named in [STRATEGY-SITE-POSITIONING-AND-PAGE-GOALS.md](STRATEGY-SITE-POSITIONING-AND-PAGE-GOALS.md)), an un-oriented first screen is a bounce risk.

#### Proposed direction under assessment

The operator proposes to resolve F2 (and F3) by consolidating the orientation rather than adding a separate band. Concretely: merge the bottom introduction ("I'm Manuel Cerdas. I build software, lead teams, and work on how people make sense of what we build. Abstract Voyage is where I follow the questions behind that work. It began with light and sound.") with the existing featured wall statement ("Ship early enough to see how people use the product. Build well enough to change it when you need to.") into one rewritten featured card; add a call-to-action button to that card whose label references the practice; move the card to be the first item in the wall; and, on click, smoothly scroll the visitor to the Practices section.

#### Assessment and verdict

Endorsed, with four conditions. The direction is well aligned with how the two target audiences actually consume a first screen, and it fixes the primacy gap more elegantly than a bolt-on orientation band would, because it reuses the single most salient object the page already has (the featured card) instead of introducing a competing one. The conditions below are where it succeeds or fails; each is graded against the HCI literature, and each carries a named risk, not just an endorsement.

**(a) Merging identity and the operating principle into one card. Endorse, conditioned on strict internal hierarchy.**
Grounding. One coherent object is easier to hold in working memory than two fragments separated by a full page scroll (chunking, Miller, 1956; the modern capacity estimate is closer to four items, Cowan, 2001), and consolidating the orientation into the first object exploits the primacy and anchoring effects above that the page currently wastes. A single fluent object also reads as more composed and competent (Reber et al., 2004).
Risk and condition. The featured card is currently memorable precisely because it is one isolated, high-contrast statement (the isolation effect, von Restorff, 1933). Loading it with identity, a principle, and an action can dilute that distinctiveness and overload the reader (cognitive load, Sweller, 1988). Condition: enforce one dominant focal point and a strict order inside the card, a short identity lead, the principle as the hero line, one action, and keep the "light and sound" origin line out of this card (route it to `/about`, where that story already lives) so the card stays a single chunk rather than a paragraph.

**(b) Adding a call-to-action button to the card. Endorse, conditioned on role separation from the bottom conversion CTA.**
Grounding. An explicitly labeled action with a clear destination raises the probability a scanner takes the intended path (information scent and foraging, Pirolli and Card, 1999). A button is a larger, faster, lower-error target than an inline text link, which matters for the primary first-screen action and especially on touch (Fitts, 1954; MacKenzie, 1992). Giving the visitor an explicit near-term goal (reach the practice) and then a terminal goal (contact) structures motivation along the page (goal-gradient, Hull, 1932; Kivetz, Urminsky, and Zheng, 2006).
Risk and condition. Two calls to action competing for the same job slow the decision (more choices raise decision time, Hick, 1952; Hyman, 1953), and the Practices banner already owns the single conversion CTA to `/contact`. Condition: the two must not compete. The top card's CTA is internal wayfinding ("see how I work," scroll to the practice), visually secondary; the bottom CTA remains the primary conversion ("Discuss a product or engineering challenge," to `/contact`). Two actions with different jobs and different visual weight are fine; two actions contending for the same click are not.

**(c) Moving the card to the first position. Endorse, conditioned on the masonry and reorder mechanics.**
Grounding. Attention and recall concentrate on the first element in reading order (primacy again; first-impression speed, Lindgaard et al., 2006; above-the-fold attention concentration is also consistent with practitioner eyetracking, Nielsen, 2006, cited as design research rather than a controlled experiment). Making the one oriented object the lead is the direct primacy fix.
Risk and condition. The wall is CSS-column masonry with column balancing and a color-rhythm reorder pass. "First" must mean both first in reading order and visually the singular lead, not merely the top of one of three columns where two other top cards compete with it. Conditions: pin the card so the color-rhythm reorder cannot displace it; decide whether at multi-column widths it should span or be elevated so it reads as the lead; and confirm it interacts cleanly with the top-rule and first-in-column breathing-room logic already in `WallQuoteItem`.

**(d) Practice-referencing label and smooth scroll to the Practices section. Endorse, conditioned on reduced-motion support.**
Grounding. The CTA label and the destination heading should use matching language so the anchor relationship is legible (consistent signaling, Lorch and Lorch, 1996). An animated scroll preserves object constancy and helps the visitor keep a mental map of where the destination sits relative to where they were, which an abrupt jump does not (animated transitions, Heer and Robertson, 2007; Bederson and Boltman, 1999; abrupt changes risk change blindness, Simons and Levin, 1997). Offering a high-scent shortcut to the highest-value section serves the fast scanner without removing the slow-reading path down the wall (information foraging, Pirolli and Card, 1999).
Risk and condition. Over a tall page a long animated fly-through can disorient or cause vestibular discomfort. Condition: honor `prefers-reduced-motion` with an instant anchor jump (WCAG 2.1, Success Criterion 2.3.3, Animation from Interactions), keep the animation duration bounded, and give the Practices section a stable scroll-target anchor.

#### A strategic rewrite, as a draft option for review

Not a mandate; one option, to be checked against the positioning guardrails and tested (see the evidence standard in [ANALYSIS-POSITIONING-AND-INFERENCE-AUDIT.md](ANALYSIS-POSITIONING-AND-INFERENCE-AUDIT.md)). The card carries three parts in this order:
- Identity lead (orientation, who and what): "I'm Manuel Cerdas. I build software, lead teams, and shape how people make sense of what we build."
- Principle (the hero line, the kept featured statement): "Ship early enough to see how people use the product. Build well enough to change it when you need to."
- Action (internal wayfinding, references the practice): "See how the practice works" or "Explore the practice," scrolling to the Practices section.

The "Abstract Voyage is where I follow the questions behind that work. It began with light and sound." line is a genuine differentiator and a curiosity hook (the information-gap theory of curiosity, Loewenstein, 1994), but it is a second communicative job and belongs out of this card; keep it on `/about`, reachable through the existing link, so the first-screen card stays one chunk.

#### Does this fully resolve F2? One honest caveat.

Mostly yes, with one trade-off to decide deliberately. F2 and F6 both value having the four practice disciplines visible as plain words on the first screen, because the recruiter scan rewards discrete, checkable signals seen without a click. Routing to the practice via a CTA trades that immediate visibility for a cleaner card and a guided path. That is a reasonable trade for the client audience and for a tidy first screen, but it is weaker for the pure recruiter scan than showing the disciplines outright. Options: accept the one-click path; or let the card also name the four disciplines compactly (a single line of four words) in addition to the CTA. This is the one sub-decision worth making explicitly rather than defaulting into.

#### Open sub-decisions for the operator

1. Disciplines on the first screen: name them on the card, or route to them via the CTA only (the caveat above).
2. CTA label wording: concrete action ("See how I work") versus named-section reference ("Explore the practice"); the second strengthens the label-to-heading signaling, the first is plainer.
3. Fate of the "light and sound" origin line: drop from the card and keep on `/about` (recommended), or retain a compressed trace.
4. Multi-column lead treatment: whether the first card spans or is visually elevated at tablet and desktop widths so it reads as the singular lead.

Implementation surface, for a later coding turn (out of scope for this document): the card content and ordering live in `content/wall.md` and `pages/wall.tsx`; the CTA and smooth-scroll-with-reduced-motion behavior live in the wall's featured-card render and the Practices section's anchor. The Quote API already supports a CTA/link affordance, so the button can reuse it rather than introduce a new mechanism.

### F4. Weak information scent, clickable and non-clickable items look similar in kind (P2)

Observation. Article cards (which link to posts) are solid gradient cards; quotations and statements (mostly `link: false`) are bare serif text with an evocative eyebrow such as THROUGH DELIVERY or THE QUESTIONS. The difference in behavior is carried only by visual style, and the eyebrows do not signal source or whether the item leads anywhere.

Why it matters, theory informed. Information-scent and information-foraging theory holds that people decide where to click from local cues that predict what lies behind a link (Pirolli and Card, 1999). When clickable and non-clickable items share a visual family and labels do not encode destination, scent is weak: people either miss real links or try to click reflections. The existing wall IA plan already calls for consistent source and topic cues; this finding reinforces it from the interaction-affordance side.

Recommendation. Establish one consistent, learnable cue system: article cards get a small, repeated read affordance (a date plus an arrow or "Read"); reflective quotes get a consistent source tag that says they come from the About narrative (for example REFLECTION, or FROM ABOUT, with the period when it adds context). Do not make a quote look clickable unless the whole quote is a link. See [PLAN-WALL-INFORMATION-ARCHITECTURE.md](PLAN-WALL-INFORMATION-ARCHITECTURE.md) sections 3 and 5, which already specify this; it is not yet fully expressed on the page.

### F5. Loose reading rhythm and unused space weaken the composed impression (P2)

Observation, from the 1440 and 1024 captures. CSS-column balancing produces large, uneven vertical gaps between masonry items, and there is a tall empty band between the wall and the banner. The Practices banner itself places all content in the left half and leaves the right half empty at 1440.

Why it matters, theory informed. Controlled visual salience and reduced clutter help a viewer parse structure and lower cognitive load (Rosenholtz et al., 2007; Sweller, 1988). Large accidental gaps read as unintentional rather than as deliberate rest, which slightly undercuts the "composed and intentional" impression the aesthetic is working to create, and that impression is part of the competence signal.

Recommendation. Tighten the masonry distribution and cap the between-section whitespace so rests feel chosen; review the first two desktop viewports specifically. For the banner, either balance content across both columns at wide widths or narrow the content measure so the empty half does not read as missing content. Keep changes to spacing and distribution, do not reorder the semantic reading sequence to fix a screenshot (consistent with the existing IA plan).

### F6. The dual job, recruiter proof and client conversion, is served unevenly (P2)

Observation. The wall serves the "how I think" job well and the client-conversion job well at the close. The recruiter's distinct job, quickly verifying concrete skills, seniority, and breadth, is left implicit: competencies appear only as prose in the Practices banner far down the page, and the articles are framed as reflections rather than as evidence a scanner can inventory.

Why it matters. Recruiters and hiring managers scan for discrete, checkable signals (stack, scope, seniority, named context). Clients scan for problem-fit and a path to engage. The page currently optimizes for the second and the narrative, and leaves the first to inference. Authority cues that already exist, for example the McKinsey period, are present but understated inside a quote (authority and social proof heuristics, Cialdini).

Recommendation. Without inventing anything (hold to the no-invented-metrics guardrail in the positioning audit), make the existing proof scannable: surface the four practice areas near the top as part of the orientation band, keep article cards clearly legible as published work, and let the real, documented context (independent practice, prior engagements, McKinsey period, consumer-goods and real-estate industries) register without overstatement. Do not manufacture outcome metrics or client names to satisfy the recruiter scan.

### F7. Production-readiness checklist (P1 for the first three items)

- **Confirm the authoring panel is excluded from the production build.** The SETTINGS launcher and config panel are visible in dev. Verify against [PLAN-PANEL-BUILD-EXCLUSION-PRODUCTION-READINESS.md](PLAN-PANEL-BUILD-EXCLUSION-PRODUCTION-READINESS.md) that it is fully stripped in production and ships no panel code.
- **Resolve canonical and metadata (ties to F1).** If the wall becomes a real destination, give it its own `canonicalPath` and its own title and description rather than `/abstract`'s. If it stays a variant, it should not also be the page visitors are told does the heavy lifting.
- **Verify text contrast at every scroll state.** The scroll-driven gradient darkens and lightens the background. In live per-viewport states the quotes were legible, but confirm no real scroll position drops body or quote text below WCAG AA, on a slower machine and before the WebGL renderer's first paint, and confirm the deterministic pre-paint backdrop keeps text readable.
- **Check the WebGL and animation cost.** The page runs multiple gradient programs and canvases. Confirm acceptable first-paint and scroll performance on a mid-range laptop and a typical phone, and that `prefers-reduced-motion` is honored for the tilt and gradient motion.
- **Confirm all wall destinations resolve.** Article hrefs, About deep links (`/about#about-...`), and the Practices call to action to `/contact` should all land on a stable target, including the About anchor stages.

## Does the page need a new section?

Mostly no. The page does not need more sections; it needs one relocation and one small addition, plus the discovery fix.

- **Add one orientation band at the top** (F2 and F3): name, one positioning line, the four practice disciplines as words, and a single primary path. This is the one addition worth making. It is small, it reuses existing copy, and it fixes primacy, scent, and the recruiter scan at once.
- **Relocate the existing introduction** from the bottom into that band rather than duplicating it.
- Resist adding a separate skills grid, testimonials block, or logo bar. Testimonials and client logos would require real, attributable content the repository does not have, and inventing them violates the positioning guardrails. The Practices banner already carries the capability statement; strengthen its scannability rather than duplicating it higher up.

## Neuromarketing and cognition frame, applied

These are lenses for prioritization, labeled theory informed; none is a validated claim about this specific page.

- **Serial position, primacy and recency.** Recency is strong here: the page ends on a clear, single call to action (good use of recency and of the peak-end rule, Kahneman). Primacy is the gap: the opening screen carries no positioning. F2 and F3 are the primacy fix.
- **Processing fluency to perceived competence.** Layouts that are easy to parse are judged more competent and trustworthy (Reber et al., 2004). Tightening rhythm (F5) and orienting the first screen (F2) convert the existing visual quality into perceived competence rather than spending it on ambiguity.
- **Information scent.** Clear, destination-encoding cues raise the odds a scanner clicks the right thing (Pirolli and Card). F4.
- **Von Restorff, the isolation effect.** One distinctive featured statement is remembered precisely because it is isolated. The design already does this well with the single featured card; keep the feature to one, as the IA plan specifies, so the effect is not diluted. This is the central constraint on F2's merged-card direction: adding identity and a CTA to that card is only safe if the card keeps one dominant focal point and a strict internal order, otherwise the consolidation trades a memorable object for a cluttered one.
- **Authority and social proof.** The McKinsey period and the independent-practice framing are credible authority cues; they are present but quiet (F6). Let them register honestly without manufacturing proof.
- **Cognitive load.** Reduce competing salience and accidental clutter so the narrative is easy to follow (Sweller; Rosenholtz et al.). F5.

## Prioritized actions

| Priority | Action | Findings |
|---|---|---|
| P1 | Decide the wall-to-home relationship; make the page discoverable and canonical | F1 |
| P1 | Resolve orientation via the merged featured card: combine the identity intro with the featured statement, add a practice-referencing CTA, move the card to first, smooth-scroll (reduced-motion-aware) to the Practices section. See F2's assessment and its four conditions | F2, F3 |
| P1 | Confirm authoring panel is stripped in production; resolve canonical and metadata | F7 |
| P1 | Verify text contrast at all scroll states and before first WebGL paint | F7 |
| P2 | Consistent cue system for clickable cards vs reflective quotes | F4 |
| P2 | Tighten masonry rhythm and section whitespace; balance or narrow the banner measure | F5 |
| P2 | Make existing proof scannable for the recruiter pass, without inventing content | F6 |
| P3 | Check WebGL and motion performance and reduced-motion handling | F7 |

## Validation before claiming success

Do not describe any of these changes as effective on the basis of this document alone. Run a small task-based test: ask a few people in the two target roles to, within thirty seconds on the first screen, state who the owner is and what they do, then to find one piece of work and the way to get in touch. Compare before and after on time and accuracy. This matches the acceptance approach already written into [PLAN-WALL-INFORMATION-ARCHITECTURE.md](PLAN-WALL-INFORMATION-ARCHITECTURE.md).

## References

- Lindgaard, G., Fernandes, G., Dudek, C., and Brown, J. (2006). Attention web designers: You have 50 milliseconds to make a good first impression. Behaviour and Information Technology.
- Reber, R., Schwarz, N., and Winkielman, P. (2004). Processing fluency and aesthetic pleasure. Personality and Social Psychology Review.
- Pirolli, P., and Card, S. (1999). Information foraging. Psychological Review.
- Sweller, J. (1988). Cognitive load during problem solving. Cognitive Science.
- Rosenholtz, R., Li, Y., and Nakano, L. (2007). Measuring visual clutter. Journal of Vision.
- Itti, L., and Koch, C. (1998, 2001). Computational modeling of visual attention.
- Kahneman, D. (2011). Thinking, Fast and Slow (peak-end rule, System 1 and System 2).
- Cialdini, R. (2006). Influence: The Psychology of Persuasion (authority, social proof).
- Murdock, B. B. (1962). The serial position effect of free recall. Journal of Experimental Psychology (primacy and recency).
- Tversky, A., and Kahneman, D. (1974). Judgment under uncertainty: Heuristics and biases. Science (anchoring and adjustment).
- Miller, G. A. (1956). The magical number seven, plus or minus two. Psychological Review (chunking and working-memory limits).
- Cowan, N. (2001). The magical number 4 in short-term memory. Behavioral and Brain Sciences (updated capacity estimate).
- Fitts, P. M. (1954). The information capacity of the human motor system in controlling the amplitude of movement. Journal of Experimental Psychology (target size and acquisition time).
- MacKenzie, I. S. (1992). Fitts' law as a research and design tool in human-computer interaction. Human-Computer Interaction.
- Hick, W. E. (1952). On the rate of gain of information. Quarterly Journal of Experimental Psychology (choice reaction time).
- Hyman, R. (1953). Stimulus information as a determinant of reaction time. Journal of Experimental Psychology.
- Hull, C. L. (1932). The goal-gradient hypothesis and maze learning. Psychological Review.
- Kivetz, R., Urminsky, O., and Zheng, Y. (2006). The goal-gradient hypothesis resurrected: Purchase acceleration, illusionary goal progress, and customer retention. Journal of Marketing Research.
- Heer, J., and Robertson, G. (2007). Animated transitions in statistical data graphics. IEEE Transactions on Visualization and Computer Graphics (object constancy in animated transitions).
- Bederson, B. B., and Boltman, A. (1999). Does animation help users build mental maps of spatial information? IEEE Symposium on Information Visualization.
- Simons, D. J., and Levin, D. T. (1997). Change blindness. Trends in Cognitive Sciences.
- Loewenstein, G. (1994). The psychology of curiosity: A review and reinterpretation. Psychological Bulletin (information-gap theory).
- Lorch, R. F., and Lorch, E. P. (1996). Effects of headings on text recall and summarization (consistent signaling cues).
- von Restorff, H. (1933). Über die Wirkung von Bereichsbildungen im Spurenfeld (the isolation effect).
- W3C, Web Content Accessibility Guidelines 2.1, Success Criterion 2.3.3, Animation from Interactions (prefers-reduced-motion).
- Nielsen, J. (2006). F-shaped pattern for reading web content. Nielsen Norman Group (practitioner eyetracking research, cited as design research rather than a controlled experiment).
- Also see the research basis already cited in `PLAN-WALL-INFORMATION-ARCHITECTURE.md`.
