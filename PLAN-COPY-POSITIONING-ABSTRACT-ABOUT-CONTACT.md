# Copy & Positioning System — Abstract · About · Contact

Analysis and recommendations only. No site files were modified. Implementation
locations are in §13 so a follow-up pass can apply the strings exactly.

Author of record (repo evidence): **Manuel Cerdas**. All facts below are drawn
from the repository; nothing is invented.

---

## 1. Repository / Content Audit

### Where the copy actually lives

| Surface | File | Key strings |
|---|---|---|
| Homepage H1 | `pages/abstract.tsx:489` | `ABSTRACT_EDITORIAL_HEADLINE = 'Abstract Voyage is where I think out loud.'` |
| Homepage intro paragraph | `pages/abstract.tsx:497–501` | `ABSTRACT_EDITORIAL_PARAGRAPH_1` (the 51-word origin paragraph) |
| Homepage composer bridge | `experiences/abstract/components/AbstractHeroCtaComposer.tsx:17` | `INTRO_LINE_1 = 'Tell me what you're working on'` → placeholder `Start anywhere` → carries a draft to `/contact` |
| Homepage `<title>`/meta | `pages/abstract.tsx:4007–4009` | `Manuel Cerdas — Independent Engineer & Advisor` / `Independent engineering and advisory across AI products, technical systems, product strategy, and interface design.` |
| About timeline (dates/captions) | `pages/about.tsx:179–199` | `ABOUT_TIMELINE_ROWS` (5 rows) |
| About narrative (depth) | `pages/about.tsx:214–220` | `ABOUT_NARRATIVE_PARAGRAPHS` (5 paragraphs) |
| About timeline lead-in | `experiences/about/components/AboutTimeline.config.ts:711` | `description: 'More than a decade of consulting and contract work, in the order it happened.'` |
| About meta | `pages/about.tsx:1381` | `About the judgment, collaboration, and ongoing experiments behind Abstract Voyage.` |
| Contact greeting | `pages/contact.tsx:82–85` | `ENTRY_MESSAGE` (the "Relay" agent intro) |
| Contact "how I work" | `pages/contact.tsx:90–93` | `CONTACT_INTRO_PARAGRAPH` |
| Contact close | `pages/contact.tsx:114–116` | `CLOSE_MESSAGE` (`…the first one costs nothing.`) |
| Contact meta / email | `pages/contact.tsx:1409` / `:220` | meta desc + `mailto:reach@abstract.voyage` |
| Site-wide SEO defaults | `helpers/siteMetadata.ts:5–10` | `authorJobTitle`, `defaultTitle`, `defaultDescription`, `homeHeading` — all still say **"AI consultant"** |
| Journal welcome excerpt | `posts/welcome.md:5,13` | `Engineer & consultant. Formerly McKinsey.` and body `Senior Software Engineer` |

Emphasis mechanism (both Abstract & About): `**word**` renders brighter and
`[text](href)` becomes an inline link, via `renderEmphasisText`
(`helpers/textEmphasis.tsx`). Any recommended string may use these inline.

### 1. Core factual claims currently made (repo-grounded)
- Abstract Voyage is a name Manuel writes/works under; a place to "think out loud."
- The inquiry began with **how light and sound relate** (~2017), plus what
  **biomimicry** teaches about making a product feel human. The page's gradient
  is *generated from colors derived from sound* — the theme is made literal.
- Career arc: contract engineering for large corporations (~2010) → technology
  consulting (contractor → squads → whole engagements, 2018–2023) → **McKinsey**
  (2023–2026, firm-wide initiatives, "deciding what should exist rather than
  building it") → **independent since 2026** ("a few collaborators, a small
  number of clients").
- Method: listen to the people closest to the work → surface unnamed risks →
  plan against outcomes → treat the plan as a hypothesis until real usage tests it.
- Explicit identity signals in repo: **"Senior Software Engineer"**
  (`posts/welcome.md`), **"Independent Engineer & Advisor"** (homepage title),
  **"Independent engineering and advisory"** (homepage meta). GitHub/CodePen
  (`manuelro`), Medium (`abstractvoyage`), LinkedIn.

### 2. Recurring themes
Following questions that "had no use"; light/sound; biomimicry/human-feeling
products; judgment over execution (AI shifts the weight to judgment); accuracy
before planning; staying close to the work.

### 3. Strongest existing language worth preserving
- `Abstract Voyage is where I think out loud.` (H1 — plain, distinctive, keep)
- `How light and sound relate, which is where the color on this page comes from.`
- `The plan is a hypothesis until real usage tests it, and when the signals move I say so.`
- `an agent Manuel engineered. Listening is the part of his work I handle.`
- `That's with Manuel now. He'll come back with what he's already thinking.`

### 4. Weakest / most generic language
- `More than a decade of consulting and contract work…` (About lead-in) — leads
  with the occupational label, not the practice.
- `Creative engineer and AI consultant` (SITE_METADATA) — the one place the site
  still self-labels "consultant"; contradicts the already-updated homepage title.
- `Engineer & consultant. Formerly McKinsey.` (welcome excerpt) — affiliation
  standing in for a story on a 3-line bio.

### 5–7. Duplication / overloaded sentences / filler
- **Not much duplication** — a prior pass already split the pages well (a code
  comment at `pages/contact.tsx:88` records that the "how I work" paragraph was
  *moved off* the homepage to Contact). The one genuinely overloaded unit is the
  homepage paragraph (§ below): it carries name-origin + light/sound + McKinsey +
  AI + independence in one breath.

### 8–9. Biography that should move off Abstract → About
`took me to McKinsey, where I kept studying and experimenting. Then AI opened a
question…` — McKinsey and the AI/independence turn are **About material** and
already exist there in richer form. They do not need to appear on the homepage.

### 10–11. Consulting/McKinsey prominence vs. engineering
The homepage is already engineer-forward. The residue is in **SEO defaults**
(`siteMetadata.ts`) and **`welcome.md`**, plus the About **lead-in**. Engineering
can accurately become more prominent because the repo explicitly calls Manuel a
"Senior Software Engineer" and "Independent Engineer & Advisor."

### 12–16. Inflated/résumé prose, implied-but-underspecified, position-dependent meaning
- No inflated marketing prose detected — the voice is already restrained.
- The homepage paragraph's meaning is **position-dependent**: it sits at
  `paragraphMaxWidth: max-w-xl` and `lg:text-lg` (`AbstractEditorialHero.config.ts:318,317`).
  At 51 words that is ~4 lines on desktop and 6–7 on mobile (`text-sm`), which is
  the density the brief flags. `**light and sound**` and the `[on my own terms](/about)`
  link are the only emphasized fragments — their weight is real and worth keeping.

---

## 2. Current Positioning Diagnosis

**Who the current copy makes the author appear to be:** an engineer who writes
and builds under the name "Abstract Voyage," whose homepage already reads as
"independent engineer/advisor" but whose *supporting metadata and journal bio*
still introduce him as an "AI consultant, formerly McKinsey."

**Role of McKinsey/consultant today:** on the **homepage**, McKinsey appears once
(a waypoint in the origin paragraph) and "consultant" does not appear at all. The
"consultant" identity now lives almost entirely in **non-hero surfaces**
(`siteMetadata.ts` SEO defaults, `welcome.md`) and in the About **lead-in**.

**The gap:** the homepage hero has *already* been repositioned; the rest of the
system hasn't caught up. So the fix is less "rewrite the homepage away from
consulting" and more "(a) finish compressing the hero paragraph, and (b) make the
metadata + lead-in agree with the identity the hero already asserts."

---

## 3. Recommended Positioning

**Central positioning proposition (internal — not necessarily on-site):**

> *Abstract Voyage is the working notebook of Manuel Cerdas — a software engineer
> who follows questions, starting with how light and sound relate, from curiosity
> into built work, now on his own.*

Identity hierarchy to enforce everywhere:

`ENGINEER / BUILDER / INDEPENDENT INQUIRY` (primary) → `McKINSEY` (a chapter,
context) → `consulting` (incidental; name the chapter honestly on About, nowhere
else). The repo's own preferred service word is **"advisor / advisory"** (homepage
title + meta) — use that, not "consultant," wherever a non-engineering label is
unavoidable.

---

## 4. Three-Page Message Architecture

**A. One positioning statement:** see §3.

**B. Communication job of each page**
- **Abstract (positioning layer):** Establish *what this place is* and *the
  perspective behind it* in the fewest words that still carry identity, the
  light/sound origin, and a reason to go deeper. Withhold the biography.
- **About (expansion layer):** Show *how this way of working developed* — the
  questions, the arc through consulting and McKinsey, and the shift to judgment —
  as evidence, not résumé.
- **Contact (invitation layer):** Make the *kind of conversation* that fits
  legible, and let an agent do the listening. Already built; needs the least change.

**C. Desired visitor progression**
- After **Abstract:** *"This is one person's working notebook — an engineer who
  chases specific questions into things he builds. I want to see where that goes."*
- After **About:** *"That instinct has a real arc behind it — real work, real
  stakes, and a clear reason he now works the way he does."*
- After **Contact:** *"If I have a problem in that shape, I can start a real
  conversation here, and a person — not a form — will actually read it."*

---

## 5. Abstract — Three Copy Directions

Baseline (current, `pages/abstract.tsx:497–501`), **51 words**:

> It started as a name to write under, loose enough to let me study whatever held
> my attention. It began with how **light and sound** relate. That habit took me
> to McKinsey, where I kept studying and experimenting. Then AI opened a
> **question** I wanted to chase [on my own terms](/about).

Headline stays in all three: **`Abstract Voyage is where I think out loud.`**
All three **remove McKinsey and the AI turn from the homepage** (they belong to,
and already exist on, About) and keep the `**light and sound**` emphasis + an
`/about` link for information scent.

### Version A — Maximum clarity (32 words · −37%)
> A name I build and write under, open enough to follow whatever holds my
> attention. It started with how **light and sound** relate — and usually ends in
> something built. [Where that goes.](/about)

- **Strength:** understood on first read; "I **build**… ends in something built"
  establishes engineer identity through *action*, not a label.
- **Tradeoff:** drops the explicit McKinsey/AI thread (intended — moves to About).
- **Emphasis:** `**light and sound**`; link `Where that goes.`

### Version B — Editorial / exploratory (35 words · −31%)
> It started as a name to write under, loose enough to hold whatever caught my
> attention — beginning with how **light and sound** relate. The questions stayed;
> the work is where they end up. [Follow one.](/about)

- **Strength:** keeps the original's introspective cadence and the "write under"
  opening; "the work is where they end up" implies building without stating a title.
- **Tradeoff:** slightly longer; "the work is where they end up" is a touch
  abstract.
- **Emphasis:** `**light and sound**`; link `Follow one.`

### Version C — Engineer-forward (37 words · −27%)
> A name I build and write under, kept loose enough to follow whatever holds my
> attention. It began with how **light and sound** relate; I've been turning
> questions like it into engineering ever since. [The longer arc.](/about)

- **Strength:** makes the technical identity explicit ("into **engineering**")
  without becoming a bio.
- **Tradeoff:** "into engineering" is the most label-forward of the three; least
  compression.
- **Emphasis:** `**light and sound**` (optionally `engineering`); link `The longer arc.`

---

## 6. Recommended Abstract Direction — **Version A**

> A name I build and write under, open enough to follow whatever holds my
> attention. It started with how **light and sound** relate — and usually ends in
> something built. [Where that goes.](/about)

**Why A for this interface and system:**
- At `max-w-xl` / `lg:text-lg` it lands in ~3 desktop lines (down from ~4) and
  ~4–5 mobile lines (down from 6–7) — a real reduction in the visual density the
  brief targets, with cleaner phrase boundaries around the em-dash.
- It answers all five homepage questions *implicitly*: what it is (a name he
  builds/writes under), who (an engineer — via the verb "build"), what's explored
  (light and sound), what's distinctive (curiosity that "ends in something built"),
  why continue (`Where that goes.` → /about).
- It does the one thing the brief most wants: **removes the employer name-drop
  from the homepage** while keeping the origin that makes the site specific.
- Identity-through-action beats identity-through-label — it reads like an engineer
  thinking in public, not a bio advertising him.

Keep `**light and sound**` as the *only* bold fragment (isolation effect — one
emphasis carries more than three). The composer line below the hero
(`Tell me what you're working on` → `Start anywhere`, bridging to /contact) is
unchanged.

---

## 7. About — Three Copy Directions

About's five paragraphs (`pages/about.tsx:214–220`) are already strong,
engineer/judgment-forward, and grounded — they should be **preserved**, not
rewritten. The only high-leverage edit is the **timeline lead-in**
(`AboutTimeline.config.ts:711`), which currently front-loads "consulting." Each
direction pairs with the matching Abstract version and differs mainly in the
lead-in and the framing verb of paragraph 3.

Current lead-in: *"More than a decade of consulting and contract work, in the
order it happened."*

- **Direction A (clarity):** *"More than a decade of building software and the
  work around it, in the order it happened."*
- **Direction B (editorial):** *"More than a decade of following questions into
  built work, in the order it happened."*
- **Direction C (engineer-forward):** *"More than a decade of engineering — and
  the deciding around it — in the order it happened."*

Paragraph 3 keeps its single, historically accurate mention of *technology
consulting* (that chapter genuinely was consulting), but now reads as **context**
under an engineering-led lead-in rather than the frame for the whole column. All
five paragraphs otherwise stand. McKinsey (paragraph 4) is already context, not
identity — leave it. See §12 for the full recommended set (uses Direction A).

---

## 8. Contact — Three Copy Directions

Contact is a conversational intake ("Relay") that is **already on-voice and
non-salesy** — the honest recommendation is to change almost nothing. The only
positioning-bearing prose is `CONTACT_INTRO_PARAGRAPH`
(`pages/contact.tsx:90–93`). The agent scaffolding (greeting, close, error
states) should stay as-is.

Current: *"I start by listening to the people closest to the work. That is usually
where the unnamed **risks** are. Once the picture is accurate I plan against
**outcomes**, and we test the plan."*

- **Version A (keep — recommended):** unchanged. It already states the method
  without a pitch.
- **Version B (slightly tighter):** *"I start with the people closest to the work
  — that's where the unnamed **risks** are. Once the picture is accurate I plan
  against **outcomes**, and we test it."* (−4 words)
- **Version C (engineer-explicit):** *"I start by listening to the people closest
  to the work, where the unnamed **risks** are. Then I build against **outcomes**,
  and we test the plan against real use."* (foregrounds building/testing to echo
  the homepage)

`ENTRY_MESSAGE` and `CLOSE_MESSAGE` stay verbatim — they are the best-voiced copy
on the site and already frame Manuel as someone who *engineered the agent* and
*reads everything himself*.

---

## 9. Cross-Page Current → Proposed Copy Table

| Page / Location | Current Copy | Proposed Copy | Why Update It | Strategic Aim | Research / Principle | Evidence / Citation |
|---|---|---|---|---|---|---|
| Abstract — `ABSTRACT_EDITORIAL_PARAGRAPH_1` (`abstract.tsx:497`) | "It started as a name to write under… took me to **McKinsey**… Then AI opened a **question** I wanted to chase [on my own terms](/about)." (51w) | "A name I build and write under, open enough to follow whatever holds my attention. It started with how **light and sound** relate — and usually ends in something built. [Where that goes.](/about)" (32w) | 51 words / ~4–7 lines is the density flagged; carries 5 ideas at once | Reduce homepage density; move biography to About; establish engineer identity via action | Cognitive load; processing fluency; information scent | Sweller 1988; Reber, Schwarz & Winkielman 2004; Pirolli & Card 1999 |
| Abstract — same | "…took me to **McKinsey**, where I kept studying…" | (removed from homepage) | Employer name-drop on the positioning layer; redundant with About | Reduce McKinsey prominence; progressive disclosure | Progressive disclosure; signaling shouldn't substitute for substance | Nielsen 2006 (NN/g); Spence 1973 |
| Abstract — emphasis | `**light and sound**` + `**question**` (two bold runs) | `**light and sound**` only | Two emphases dilute each other | Strengthen the one distinctive hook | Isolation (Von Restorff) effect | Von Restorff 1933 |
| About — timeline lead-in (`AboutTimeline.config.ts:711`) | "More than a decade of **consulting and contract work**, in the order it happened." | "More than a decade of **building software** and the work around it, in the order it happened." | Front-loads the occupational label over the practice | Establish engineering identity; reduce consulting prominence | Impression primacy; self-presentation; concise/plain language | Asch 1946; Goffman 1959; Redish 2007 |
| About — narrative ¶3 (`about.tsx:218`, row index 2) | "The work it turned into was technology **consulting**." | Keep (single, factual mention, now read as context) | Historically accurate; one mention is fine once the lead-in reframes | Credibility through evidence; historical accuracy | Signaling as support, not identity | Spence 1973 |
| Site meta — `authorJobTitle` (`siteMetadata.ts:5`) | "Creative engineer and AI **consultant**" | "Software engineer and independent advisor" (or delete — field is unused) | Contradicts the homepage's own "Engineer & Advisor" title; field is currently dead | Occupational-identity consistency | Self-presentation; voice consistency | Goffman 1959 |
| Site meta — `defaultTitle` (`siteMetadata.ts:6`) | "…Creative Engineer & AI **Consultant** \| Abstract Voyage" | "Manuel Cerdas — Independent Engineer & Advisor \| Abstract Voyage" | Live fallback `<title>`/og:title for non-overriding pages | Foreground engineering in SERP/social | Credibility signaling; first-impression | Spence 1973; Asch 1946 |
| Site meta — `defaultDescription` (`siteMetadata.ts:8`) | "…creative engineer and **consultant** working across AI engineering, product strategy…" | "…software engineer working across AI products, technical systems, product strategy, and interface design." | Live fallback meta description; still says "consultant" | Reduce consultant framing in SEO | Processing fluency; consistency | Reber et al. 2004 |
| Site meta — `homeHeading` (`siteMetadata.ts:9`) | "…creative engineer and AI **consultant** exploring systems…" | Delete (unused) or "…software engineer exploring systems, craft, and expressive interfaces." | Dead code carrying an off-message label | Housekeeping; consistency | Editorial judgment | — |
| Journal — `welcome.md:5` excerpt | "Engineer & **consultant**. **Formerly McKinsey**. On systems and craft." | "Software engineer. On systems and craft." | 3-line bio leans on affiliation for credibility | Reduce McKinsey prominence; drop consultant label | Signaling shouldn't replace substance; identity through work | Spence 1973; Goffman 1959 |
| Contact — `CONTACT_INTRO_PARAGRAPH` | "I start by listening… plan against **outcomes**, and we test the plan." | Keep (or Version B micro-trim) | Already on-voice and non-salesy | Trust through restraint | Concise/plain language | Redish 2007 |

---

## 10. "Consultant" / McKinsey Terminology Audit

| Location | Current Wording | Recommended Treatment | Replacement | Reason |
|---|---|---|---|---|
| `abstract.tsx:499` | "took me to **McKinsey**, where I kept studying and experimenting" | **MOVE TO ABOUT** | (removed from homepage; already present on About ¶4) | McKinsey is a chapter, not the homepage's job; About already carries it in richer form — removes the only employer name-drop from the positioning layer |
| `AboutTimeline.config.ts:711` | "More than a decade of **consulting** and contract work" | **REFRAME** | "More than a decade of building software and the work around it" | Shifts emphasis to engineering; the practice, not the label, leads the About column. Historically honest ("the work around it" covers the consulting/advisory part) |
| `about.tsx:189` (row caption) | "The **consulting** years, 2018 to 2023" | **KEEP** | — | Historically accurate label for that specific chapter; now downstream of an engineering-led lead-in, so it reads as context |
| `about.tsx:218` (¶3) | "The work it turned into was technology **consulting**." | **KEEP** | — | The single accurate naming of that chapter; one mention is context, not identity. Do not relabel a genuinely-consulting period as "engineering" |
| `about.tsx:196` (row caption) | "**McKinsey**, 2023 to 2026" | **KEEP** | — | Factual timeline entry; belongs on the expansion layer |
| `about.tsx:218` (¶4) | "**McKinsey** put that problem at a **scale**…" | **KEEP** | — | Already context ("a chapter in the story"), not a credibility crutch |
| `siteMetadata.ts:5` `authorJobTitle` | "Creative engineer and AI **consultant**" | **REFRAME** (or REMOVE — unused) | "Software engineer and independent advisor" | Only remaining self-label using "consultant"; contradicts the homepage's own title. Field is currently consumed nowhere |
| `siteMetadata.ts:6` `defaultTitle` | "Creative Engineer & AI **Consultant**" | **REFRAME** | "Manuel Cerdas — Independent Engineer & Advisor \| Abstract Voyage" | Live fallback title/og:title on non-overriding pages; align to the homepage's chosen framing |
| `siteMetadata.ts:8` `defaultDescription` | "creative engineer and **consultant**" | **REFRAME** | "software engineer" | Live fallback description; removes consultant from SEO |
| `siteMetadata.ts:9` `homeHeading` | "creative engineer and AI **consultant**" | **REMOVE** (unused) | delete, or reframe to "software engineer" | Dead code carrying an off-message label |
| `welcome.md:5` | "Engineer & **consultant**. **Formerly McKinsey**." | **REFRAME** | "Software engineer." | Both the label and the affiliation are doing "credibility by association" on a 3-line bio; drop both for identity-through-work |

Every replacement above either (a) more accurately describes identity
("software engineer," repo-verified via `welcome.md`'s "Senior Software
Engineer"), (b) removes an unnecessary label, or (c) uses the repo's own service
word "advisor." No genuinely-consulting historical period is relabeled as
engineering (rows kept KEEP).

---

## 11. Academic / Research Basis

All are established works; treat exact DOIs/page numbers as **to be verified**
(prepared without live lookup). Peer-reviewed vs. industry usability research is
labeled.

- **Cognitive load** — Sweller, J. (1988). *Cognitive load during problem
  solving: Effects on learning.* Cognitive Science, 12(2), 257–285. *(peer-reviewed)*
  → justifies compressing the homepage paragraph so it isn't processed as one
  overloaded unit.
- **Processing fluency** — Reber, R., Schwarz, N., & Winkielman, P. (2004).
  *Processing fluency and aesthetic pleasure.* Personality and Social Psychology
  Review, 8(4), 364–382. *(peer-reviewed)*; and Oppenheimer, D. M. (2006).
  *Consequences of erudite vernacular utilized irrespective of necessity.*
  Applied Cognitive Psychology, 20(2), 139–156. *(peer-reviewed)* → simpler, more
  fluent phrasing reads as more credible; supports plain over ornate.
- **Information foraging / information scent** — Pirolli, P., & Card, S. (1999).
  *Information foraging.* Psychological Review, 106(4), 643–675. *(peer-reviewed)*
  → the `[Where that goes.](/about)` link must give a clear "scent" of the About payoff.
- **Curiosity / information gap** — Loewenstein, G. (1994). *The psychology of
  curiosity.* Psychological Bulletin, 116(1), 75–98. *(peer-reviewed)* → deliberately
  *withholding* the biography on the homepage is what creates the pull to continue.
- **Impression primacy** — Asch, S. E. (1946). *Forming impressions of
  personality.* Journal of Abnormal and Social Psychology, 41(3), 258–290.
  *(peer-reviewed)* → the first label a reader meets disproportionately anchors
  identity; hence fixing `defaultTitle`/lead-in.
- **Signaling** — Spence, M. (1973). *Job Market Signaling.* Quarterly Journal of
  Economics, 87(3), 355–374. *(peer-reviewed)* → an affiliation (McKinsey) is a
  signal that should *support*, not *substitute for*, the story.
- **Self-presentation** — Goffman, E. (1959). *The Presentation of Self in
  Everyday Life.* Doubleday. *(foundational monograph)* → occupational labels are
  identity performance; choosing "engineer/advisor" over "consultant" is a
  deliberate self-presentation.
- **Isolation effect** — Von Restorff, H. (1933). *Über die Wirkung von
  Bereichsbildungen im Spurenfeld.* Psychologische Forschung, 18, 299–342.
  *(peer-reviewed, historical)* → one bold phrase (`**light and sound**`) is more
  memorable than several competing ones.
- **Progressive disclosure / web reading** — Nielsen, J. (2006). *Progressive
  Disclosure* and (1997) *How Users Read on the Web*, Nielsen Norman Group.
  *(industry usability research)*; Redish, J. (2007). *Letting Go of the Words.*
  Morgan Kaufmann. *(practitioner)* → layer detail across pages; write tight,
  scannable web prose.

Principle vs. inference vs. judgment: the *principles* (load, fluency, scent,
curiosity, primacy, signaling) are research-supported; the *specific wording* is
editorial judgment informed by those principles. Research does not "prove" one
sentence beats another.

---

## 12. Final Recommended Three-Page Copy

### ABSTRACT — FINAL
**H1 (unchanged):**
> Abstract Voyage is where I think out loud.

**Intro paragraph (replace `ABSTRACT_EDITORIAL_PARAGRAPH_1`):**
> A name I build and write under, open enough to follow whatever holds my
> attention. It started with how **light and sound** relate — and usually ends in
> something built. [Where that goes.](/about)

*(Composer line below the hero — "Tell me what you're working on" → "Start
anywhere" — unchanged.)*

### ABOUT — FINAL
**Timeline lead-in (replace `AboutTimeline.config.ts` `description`):**
> More than a decade of building software and the work around it, in the order it
> happened.

**Narrative paragraphs (unchanged — preserved as the depth layer):**
1. > Before any of this had a name, I was a **contractor**. Large corporations,
   long projects, the kind of work where the **brief** arrives finished and the
   job is to build it well. That was the work for years, and building it well was
   enough, until I started wondering about things the brief never asked about.
2. > Two questions in particular, and neither had a use. How **light and sound**
   relate, which is where the color on this page comes from. The gradient behind
   these words is generated rather than chosen, from colors derived from sound.
   The other is what **biomimicry** can teach about making a product feel human.
   [Both are still open](/), and chasing them taught me more than any framework
   did. It set the pattern too. I pick up a question, and eventually it turns into work.
3. > The work it turned into was technology consulting. I started as a
   contractor, across industries from consumer goods to real estate, then led
   multiple squads, and later whole **engagements**. Different clients, one
   recurring problem. The plan always arrived confident, and real **usage** always
   disagreed with part of it.
4. > **McKinsey** put that problem at a **scale** where being wrong was expensive.
   I worked across several teams on firm-wide initiatives, and most of a day went
   to deciding what should exist rather than building it. That is where the shift
   stopped being an opinion.
5. > Then AI took over much of the execution, and the weight moved to
   **judgment**. That is the shift I wanted to work inside. It opened
   collaboration rather than replacing it, so I still bring people in when the
   work needs them. I take on a few at a time and stay close to the work, from the
   first conversations through delivery. The plan is a **hypothesis** until real
   usage tests it, and when the signals move I say so. [Start anywhere](/contact)

*(Timeline captions/dates unchanged: "The consulting years, 2018 to 2023" and
"McKinsey, 2023 to 2026" remain — factual chapter labels, now downstream of an
engineering-led lead-in.)*

### CONTACT — FINAL (essentially unchanged; the strongest-voiced copy on the site)
**Greeting (`ENTRY_MESSAGE`, unchanged):**
> Hello. I'm Relay, an agent Manuel engineered. Listening is the part of his work
> I handle.
>
> Tell me what's going on. It doesn't need to be polished. Whatever you say
> reaches him as you said it, and he reads all of it himself.

**"How I work" (`CONTACT_INTRO_PARAGRAPH`, unchanged):**
> I start by listening to the people closest to the work. That is usually where
> the unnamed **risks** are. Once the picture is accurate I plan against
> **outcomes**, and we test the plan.

**Close (`CLOSE_MESSAGE`, unchanged):**
> That's with Manuel now. He'll come back with what he's already thinking. If a
> conversation follows, the first one costs nothing.

**Read as a sequence:** Abstract asserts "an engineer who builds from questions"
→ About supplies the arc and the judgment behind it → Contact turns it into a
real, low-friction conversation. No idea is repeated verbatim; "light and sound"
intentionally echoes (homepage introduces it, About explains it), which is
continuity, not redundancy.

---

## 13. Implementation Locations

Apply only if asked to implement. All changes are **string swaps** except where noted.

| Change | File · symbol | Notes |
|---|---|---|
| Homepage paragraph | `pages/abstract.tsx:497–501` · `ABSTRACT_EDITORIAL_PARAGRAPH_1` | Single string constant; rendered by **both** hero instances (`:4164` classic, `:4643` polymorphic) via `ABSTRACT_EDITORIAL_PARAGRAPHS`. One edit covers both. Keep `**…**` + `[text](/about)` markup (parsed by `renderEmphasisText`, `helpers/textEmphasis.tsx`). The doc comment at `:490–496` explaining the old wording should be updated to match. |
| Homepage H1 | `pages/abstract.tsx:489` · `ABSTRACT_EDITORIAL_HEADLINE` | No change recommended. |
| About lead-in | `experiences/about/components/AboutTimeline.config.ts:711` · `description` default | String swap. This is the config default; verify no page-level override sets `aboutTimelineConfig.description` to something else (it's read at `pages/about.tsx:1598` as `aboutTimelineConfig.description \|\| undefined`). |
| Site SEO defaults | `helpers/siteMetadata.ts:5,6,8,9` | `defaultTitle`/`defaultDescription` are **live** (fallbacks in `components/SeoHead.tsx:21–22`, also `pages/posts/[slug].tsx:380`). `authorJobTitle`/`homeHeading` are **unused** (no consumers found) — safe to reframe or delete. |
| Journal excerpt | `posts/welcome.md:5` (frontmatter `excerpt`) | Markdown frontmatter; surfaces on journal listings. Body `Senior Software Engineer` (`:13`) is fine to keep. |
| Contact | `pages/contact.tsx:82,90,114` | No change recommended (optional micro-trim in §8). |

**No JSX/structural changes are required** for the recommended set — every
recommended edit replaces a string in place, and the emphasis/link markup
conventions already support the `**bold**` and `[link](/about)` used above.

---

## 14. Final Evaluation Against the 15 Criteria

1. **First-time visitor understands AV from the homepage alone?** Yes — "a name
   I build and write under… light and sound… ends in something built."
2. **Meaningfully shorter?** Yes — 51 → 32 words (−37%), ~4 lines → ~3 desktop.
3. **Compression improved, not impoverished?** Yes — kept origin + identity +
   scent; dropped only the biography that duplicates About.
4. **Engineering > consulting in identity weight?** Yes — "I build"/"something
   built" on the homepage; metadata + lead-in reframed to engineer/advisor.
5. **"Consultant" removed/softened without falsifying history?** Yes — removed
   from metadata/welcome; the one genuinely-consulting About chapter keeps its
   honest label (KEEP rows).
6. **McKinsey contextual, not identity-defining?** Yes — off the homepage; on
   About it stays a dated chapter.
7. **About holds the withheld depth?** Yes — all five narrative paragraphs preserved.
8. **Contact continues the same voice?** Yes — left largely intact by design.
9. **Three different jobs?** Yes — position / expand / invite.
10. **Unnecessary repetition across pages?** No — "light and sound" echoes by
    intent (introduce → explain); nothing else repeats.
11. **Human, precise, restrained, distinctive?** Yes — matches the existing register.
12. **Every major factual claim repo-grounded?** Yes — engineer, light/sound,
    biomimicry, consulting arc, McKinsey dates, independence all from repo.
13. **Academic claims supported by cited research?** Principles yes; exact
    DOIs/pages flagged **verify** (no live lookup).
14. **Abstract occupies substantially less visual space?** Yes — see #2.
15. **Sounds like an engineer thinking in public, not a bio advertising itself?**
    Yes — identity through action ("build," "something built"), no title-dropping.

No criterion fails; the set above is the recommended production copy.
