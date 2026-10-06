# Three-page editorial refinement plan

**Source of decisions:** [Three-page editorial review](ANALYSIS-THREE-PAGE-EDITORIAL-REVIEW.md). The review's recommendation IDs are the implementation keys; this plan does not replace its rationale or references.

**Scope:** `content/pages/abstract.md`, `content/pages/about.md`, and `content/pages/contact.md`.

**Goal:** Make the existing career arc legible as software engineering and technical leadership, interface engineering and development, and attention to real use. Keep the voice understated and retain the creative inquiry that distinguishes the site.

**Status:** Implemented on 2026-09-30. The source files now contain the reviewed copy, with one minor ABOUT-06 continuity edit recorded in the analysis document.

## Implementation sequence

1. **Home — establish the person and the work.** Apply HOME-01 to the meta description. Apply HOME-02 to the hero body, then CROSS-01 to its About link. Preserve the heading (KEEP-01) and the light-and-sound origin.
2. **About — show a continuous progression.** Apply ABOUT-01 to the meta description, ABOUT-02 to the timeline title, ABOUT-03 to the opening section, ABOUT-04 to the first two sentences of the 2018–2023 section, ABOUT-05 to the firm-wide work section, and ABOUT-06 to the first three sentences of the independent-work section. Apply CROSS-02 to the closing Contact link. Preserve the gradient explanation, recurring usage problem, and plan-as-hypothesis statement (KEEP-02 through KEEP-04).
3. **Contact — clarify fit and control.** Apply CONTACT-01 to the meta description, CONTACT-02 to the second paragraph of the entry message, CONTACT-03 to both skip-name labels, and CONTACT-04 to the middle two starter stems. Preserve the assistant introduction and recap cue (KEEP-05).
4. **Validate.** Confirm each page loads through the content schema; check the exact updated strings, recommendation coverage, links, placeholders, and absence of unintended terminology in the resulting visitor copy. Exercise the rendered pages at mobile and desktop widths if the shared verification environment can be used safely; inspect screenshots and final text at the consumer. Record any verification limit explicitly.

## Editorial boundaries

- Apply only the reviewed replacements and connective link labels. Do not add metrics, projects, responsibilities, technologies, or employer details.
- Keep frontmatter keys, section markers, timeline IDs, contact placeholders, and the number and order of starter stems intact.
- Keep the contact flow's `{{agentName}}` template and its review-before-send promise intact.
- Do not introduce the deprecated occupational terms or the phrase “interface design” into new visitor-facing copy.
- Leave the analysis document as the decision record, including its verbatim original-copy quotes.

## Completion record

- [x] HOME-01, HOME-02, CROSS-01
- [x] ABOUT-01 through ABOUT-06, CROSS-02
- [x] CONTACT-01 through CONTACT-04
- [x] Content schema and focused tests pass: `helpers/content/pageContent.build.test.ts` passed; the Tailwind-field pretest passed.
- [x] Direct rendered-page checks: `/abstract`, `/about`, and `/contact` each returned HTTP 200 on the pre-existing port 3001 server. Each page contained its new copy, and all three rendered meta descriptions matched the updated source.
- [x] Browser-verification limit recorded: no screenshots or computed-style inspection were performed. A pre-existing Chrome instance and Next development server were already running; no additional browser or server was started. This implementation is verified for content loading and server-rendered output, not visually verified at responsive breakpoints.

No agent-owned browser or development server was started for this task, so none remains to stop.
