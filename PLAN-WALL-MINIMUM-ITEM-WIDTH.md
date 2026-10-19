# Wall minimum item width

Status: implemented in `pages/wall.tsx` on 2026-10-14.

## Decision

Keep wall article cards and editorial quotes at least 345 px wide whenever the viewport can physically hold that width. Treat the wall's mobile, tablet, and desktop column settings as maximums. Resolve the actual count from the measured content width and the active item gap:

`columns = min(configured maximum, max(1, floor((content width + gap) / (345 + gap))))`

Use the same resolved count for MasonryWall's base, md, and lg inputs so its reading-order layout, measured item widths, and top-rule placement agree. Measure the width of the uncapped wall content area with ResizeObserver; begin with one column until it is known. A change to the page max width, header padding, wall gap, or column setting must recompute the count without new viewport breakpoints.

## Width and composition

- Keep the existing header-aligned wall gutters above 408 px. At 408 px and below, reduce only the wall's horizontal gutter to `max(0, (available width - 345px) / 2)`. This permits a 345 px item from 345 through 408 px. Below 345 px, use the available viewport width; horizontal scrolling would undermine the wall's vertical reading flow.
- Center and cap a one-column masonry wall at 520 px. This prevents an oversized portrait card from dominating the 768–889 px interval and other wide single-column states. Measure available width outside this cap to avoid a layout loop that would prevent the second column from appearing.
- Preserve feed order and the existing card/quote components. The page-local change should not alter global MasonryWall, PageContainer, or header behavior.

## Default thresholds

With a 1680 px page cap, current header gutters, and 16/40/56 px item gaps: two columns fit at 890 px, three at 1243 px, and four at 1644 px. These are consequences of the measured-width rule, not hardcoded breakpoints.

## Verification

Check actual rendered article and quote widths, column count, side gutters, and overflow at 320, 345, 375, 390, 408, 409, 768, 889, 890, 1024, 1242, 1243, 1280, 1536, 1643, 1644, and 1680 px. Capture and inspect representative mobile, tablet, desktop, and threshold screenshots. Exercise changes through the wall's runtime config path for column ceilings and gaps. At widths below 345 px, confirm the explicit physical-limit exception and absence of horizontal page overflow.

Completed: all listed viewport widths were checked in the rendered wall. Article and quote widths matched at each width; both were at least 345 px from a 345 px viewport upward. At 320 px, both used the full 320 px viewport with no horizontal overflow. The configured desktop maximum was exercised at 1 and 6 columns, its gap at 0 and 384 px, and the page cap at 960 and 1920 px through the actual settings panel. The measured column count and final article/quote widths changed accordingly.
