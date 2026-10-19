# Wall featured card orientation: implemented direction

Status: **implemented and checked in the browser; audience task validation remains**. Updated 2026-10-18 to record the operator's final one-column and copy decisions. This supersedes the earlier two-column span and four-part copy proposal. The F2/F3 rationale is in [ANALYSIS-WALL-UX-IA-AND-CONVERSION.md](ANALYSIS-WALL-UX-IA-AND-CONVERSION.md); audience and page goals are in [STRATEGY-SITE-POSITIONING-AND-PAGE-GOALS.md](STRATEGY-SITE-POSITIONING-AND-PAGE-GOALS.md).

## Decisions

1. The featured quote is the **first wall item** and occupies **exactly one masonry column** at every viewport and resolved wall column count. The quote, introduction, and CTA form one vertical sequence. Its height follows its content even when that makes it taller than adjacent cards. Article cards retain their own aspect ratio.
2. The eyebrow is **“The Next Change.”** The hero line is **“Carry product decisions into working software. Let real use shape the next change.”** The Markdown source controls emphasis without changing the words.
3. The shared Practice card treatment from the closing banner carries the introduction after the hero: **“Hello, I’m Manuel Cerdas.”** followed by **“I build software and lead teams, connecting product strategy, experience design, and engineering, with applied AI where it helps.”** This merges the identity and discipline lines into one compact content unit. There is no separate discipline label.
4. **“Explore the practice”** is a secondary in-page CTA to `#practices-heading`. The closing banner retains the contact conversion CTA. Reduced-motion preference changes the scroll to instant movement.
5. The old lower identity quote is removed, so the wall does not repeat the introduction. The “light and sound” origin story stays on `/about`.
6. The eyebrow, hero, introduction, and CTA share a left reading edge. The featured quote has its own full quote config panel, seeded with the closing banner's color settings. Padding is part of that quote config and applies to the outer figure so the whole vertical stack moves together.

## Content and component ownership

- `content/wall-featured-quote.md` owns the eyebrow, hero Markdown, introduction title/body, provenance, and CTA label/target. `content/wall.md` owns its first-position manifest entry and `contentRef` only. The server loader validates and resolves the reference before building the feed.
- `FeaturedInjectedQuote` extracts the bottom banner's established `EditorialQuote` child-injection and organic-height configuration. Both the first wall quote and closing banner use it.
- `PracticeCard` extracts the closing banner's title-and-body practice item. The banner still renders four practice cards; the feature renders one introduction card with the same typographic system and a higher default body opacity for legibility on its darker gradient.
- `FeaturedCard` composes the introduction and anchor CTA below the native quote text. The quote's native source heading displays the eyebrow. The component does not own authored copy.
- `WallQuoteItem` disables the featured quote's aspect ratio, keeps its role marker, applies the dedicated featured quote configuration, and passes the Practices layout configuration to the shared card. `MasonryWall` uses its existing single-column item behavior; no span metadata or span-aware color-rhythm scoring is needed.
- `DEFAULT_FEATURED_WALL_QUOTE_CONFIG` starts from the closing banner's color configuration and sets the lead's left alignment and compact four-side padding. `FEATURED_WALL_QUOTE_PANEL` exposes the actual quote appearance controls, independently of the closing banner. Authored words remain in Markdown.

## Reading and interaction checks

- At 390, 768, 1024, and 1440 CSS pixels, inspect the rendered first item. It must occupy one resolved masonry column, remain first with color rhythm on and off, and display eyebrow → hero → introduction title/body → CTA in that order without clipping or horizontal overflow. Vertical growth is expected.
- Exercise the featured quote's padding controls at minimum, default, and maximum values through its quote panel. Inspect computed padding on the quote figure and the resulting item bounds, including narrow widths. Change a quote color and alignment field in that panel and confirm only the featured quote changes. Exercise the shared Practice “Content” opacity control at minimum and maximum through the actual panel; inspect final intro and closing-banner body spans.
- Compare both `FeaturedInjectedQuote` consumers in the browser. The closing banner must still show its source heading, statement, four practice items, and contact CTA. Check its responsive branch as well as the first-card branch.
- Confirm the feature CTA updates the fragment, focuses the Practices heading, and lands below the fixed header. With reduced motion, confirm instant scroll. Check that the lower identity quote is absent and `/about` still carries the origin story.
- Run type checking and focused feed/quote tests. The Markdown loader must reject a missing or mismatched featured reference. Follow the project's `AGENTS.md` visual-verification and process-containment rules.

## Outcome measure

The implementation makes identity and working approach available in the first wall object. Whether that improves comprehension or contact intent still requires the F2 task observation described in the analysis: recruiters and prospective clients should be able to state who Manuel is and what he does, find work, and find contact within roughly thirty seconds. Do not describe that audience outcome as proven by source review or screenshots.
