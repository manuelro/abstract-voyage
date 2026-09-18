# PLAN-POLYMORPHIC-HEADER-INK-CENTRALIZATION

## Why this plan exists

Three bugs this session, all the same root shape: a PolymorphicLayout
capability that *looked* centralized (a config knob, tier-resolved,
panel-editable) but wasn't actually applied anywhere automatically — each
consuming page had to hand-derive the real behavior itself, and each one
that did got it slightly wrong or incomplete:

1. Narrow-column dark-ink text color — config-only (`AUDIT-POLYMORPHIC-
   GRADIENT-ABSTRACTION.md`), fixed by extracting
   `resolvePolymorphicNarrowColumnTypography` — but that's a function a page
   still has to remember to *call* and wire in.
2. Nav text color — required each page to hand-build a `colorMode: 'custom'`
   / `navTextColor: <derived ink>` override on its own `<SiteHeader>` call.
   `/posts` didn't have this at all until this session.
3. Wordmark color — required each page to *also* know to suppress the
   independently-tuned `wordmarkGradient*` palette and force a flat ink
   matching #2, via a `gradientBackedNarrowColumn ? flatStops : rawStops`
   branch. I ported #2 to `/posts` and missed this entirely — reported the
   task complete anyway. That's the direct trigger for this plan.

Underlying pattern: **`PolymorphicLayout.tsx` computes real values and
returns them on `colors`, but never applies them** — every page has to
re-derive the same "what do I actually DO with `scrollGradientDarkInkSaturation`/
`narrowColumnGradientReferenceColor`" logic by hand, at N call sites per
page (`/abstract` alone has two independent `<SiteHeader>` render call
sites that must be kept in sync with each other). A config value existing
is not evidence it's wired — confirmed three separate times this session.
The fix is not "port the missing piece a fourth time," it's removing the
*opportunity* to leave a piece out.

## Target shape: one hook, not five composed steps

Today, getting a page's header to correctly reflect the gradient requires
composing, correctly, in the right order, at every `<SiteHeader>` call
site:

1. `resolvePolymorphicNarrowColumnTypography(colors, globalTypographyConfig)`
2. A `ref` + `usePolymorphicColumnAdaptiveInk({ ref, baseColor: (1).titleColor, config, colors })`
3. `colorMode: 'custom'`, `navTextColor: (2) ?? (1).titleColor` merged into
   the page's own `SiteHeaderConfig`
4. `gradientBackedNarrowColumn ? [{color: (3), at:0},{color:(3), at:100}] : colors.wordmarkGradientStops`
   for `logoStops`
5. `colors.wordmarkGradientStops ? {...wordmarkConfig, colorMode:'adaptive'} : wordmarkConfig`
   for `wordmarkConfig`

Five independent steps, in one specific order, with no compiler or runtime
check that all five happened together. That's the actual defect. The fix:
collapse this into **one hook**, `usePolymorphicHeaderPresentation`, that
takes what a page already has (`colors`, its `PolymorphicLayoutConfig`, its
`GlobalTypographyConfig`, its base `SiteHeaderConfig`, its `WordmarkConfig`,
a ref) and returns a single ready-to-spread result:

```ts
// experiences/abstract/components/PolymorphicLayout.headerPresentation.ts
export function usePolymorphicHeaderPresentation({
  ref,
  colors,
  config,
  globalTypographyConfig,
  baseSiteHeaderConfig,
  wordmarkConfig,
}: {
  ref: RefObject<HTMLElement>;
  colors: PolymorphicLayoutResolvedColors;
  config: PolymorphicLayoutConfig;
  globalTypographyConfig: GlobalTypographyConfig;
  baseSiteHeaderConfig: SiteHeaderConfig;
  wordmarkConfig: WordmarkConfig;
}): {
  siteHeaderConfig: SiteHeaderConfig;   // colorMode/navTextColor already merged in
  wordmarkConfig: WordmarkConfig;       // colorMode already merged in
  logoStops: ReadonlyArray<SvgStop> | undefined;
  ink: string;                          // the raw resolved value, for any other
                                         // same-page consumer (hero text, etc.)
}
```

Internally this hook is exactly today's five steps, composed once,
correctly, in the one place responsible for getting it right. A page's own
`<SiteHeader>` call site shrinks to:

```tsx
const header = usePolymorphicHeaderPresentation({
  ref: headerInkRef, colors, config: pageLayoutConfig,
  globalTypographyConfig, baseSiteHeaderConfig: pageSiteHeaderConfig, wordmarkConfig,
});
<SiteHeader
  {...slotProps}
  config={buildEffectiveSiteHeaderConfig(header.siteHeaderConfig, pageLayoutConfig)}
  wordmarkConfig={header.wordmarkConfig}
  logoStops={header.logoStops}
  .../>
```

A page that adopts `<PolymorphicLayout>` and calls this one hook gets nav
text, wordmark, and (via `header.ink`) any other narrow-column text
correctly gradient-aware *by construction* — there is no fifth step left
to forget, because there's no longer a sequence of steps at the call site
at all, just one hook and one spread.

### Migration

- `pages/abstract.tsx` — two `<SiteHeader>` call sites both currently
  hand-build `effectiveWordmarkConfig`/`topHeaderLogoStops`/
  `narrowColumnWordmarkGradientStops`/`topHeaderTitleColor` independently.
  Both switch to one shared `usePolymorphicHeaderPresentation()` call
  (computed once, passed to both), removing the two-call-site drift risk
  structurally, not just by discipline.
- `pages/about.tsx` — same collapse for its one call site
  (`aboutTimelineInkColor`/`scrollGradientAdaptiveHeaderConfig` chain).
- `pages/posts/[slug].tsx` — same collapse for its one call site (the
  chain this session just built by hand).
- Any future page adopting `<PolymorphicLayout>`'s gradient background
  needs exactly one hook call to get full parity with the other three —
  not a fourth independent reading of this plan's own "five steps."

## Closing the second gap: the `readingPresentation.ts` column-color bug

The article-body/ToC washed-out-text bug (`columnColor: 'transparent'`
fed into a contrast resolver) is a *different* color system
(`experiences/abstract/helpers/readingPresentation.ts`'s own
`deriveReadableInk`, not `resolveTypographyColors`/`resolvePolymorphicNarrowColumnTypography`)
but the *identical* root cause: `colors.wideColumnColor`/`narrowColumnColor`
are not real background references once the gradient is transparent-active.
The fix this session (`articleColumnColor`/`tocColumnColor` fallback
chains) is currently **inline in `pages/posts/[slug].tsx`**, one-off — the
next page that builds its own contrast-derived text system (not
necessarily `readingPresentation.ts` — any future one) will rediscover
this exact bug from scratch.

Extract the fallback chain itself, independent of which color-derivation
system consumes it:

```ts
// PolymorphicLayout.narrowColumnTypography.ts (or a sibling file)
export function resolvePolymorphicColumnBackgroundReference(
  colors: PolymorphicLayoutResolvedColors,
  column: 'wide' | 'narrow',
): string {
  if (column === 'narrow') {
    return colors.narrowColumnGradientReferenceColor
      ?? colors.scrollGradientOriginColor
      ?? colors.narrowColumnColor;
  }
  return colors.scrollGradientOriginColor ?? colors.wideColumnColor;
}
```

Any future page's own text-color system — whatever it is — calls this
instead of reading `colors.wideColumnColor`/`narrowColumnColor` directly,
and can never again feed the literal `'transparent'` paint sentinel into a
contrast resolver.

## Closing the third gap: config-authoring mistakes (the splitBand regression)

My own regression two turns ago (`splitBandLeftModeLg`/`-RightModeLg`
silently flipped to `'transparent'` while hand-copying "the gradient
part") is a different failure class — not a missing runtime behavior, a
**config-authoring mistake with no guard rail**. Two structural fixes:

1. **An explicit, named field list**, not tribal knowledge re-derived by
   hand each time a page adopts the gradient:

   ```ts
   // PolymorphicLayout.pageConfigs.ts
   export const POLYMORPHIC_SCROLL_GRADIENT_FIELD_KEYS = [
     'scrollGradientEnabled', 'scrollGradientEnabledWide', /* … */,
     'wordmarkUsesScrollGradient', 'wordmarkGradient*', /* … */,
     'wideColumnTransparent', 'wideColumnTransparentWide', 'wideColumnTransparentLg',
     'narrowColumnTransparent', 'narrowColumnTransparentWide', 'narrowColumnTransparentLg',
   ] as const satisfies ReadonlyArray<keyof PolymorphicLayoutConfig>;
   ```

   plus a small helper, `withPolymorphicScrollGradientCopiedFrom(target,
   source)`, that copies *exactly* those keys and nothing else — mechanical,
   not hand-transcribed, so a future "bring the gradient from `/abstract` to
   page X" task can't silently touch `splitBand*` again the way I did.

2. **A structural test assertion** (extending the existing
   `PolymorphicLayout.pageConfigs.test.ts` guard, same file the target-file/
   target-symbol integrity check already lives in): for every registered
   page config, `scrollGradient*ColumnEnabled: true` implies the matching
   `*Transparent: true` — the exact "gradient enabled but architecturally
   can never paint" mistake `ABOUT_POLYMORPHIC_LAYOUT_CONFIG`'s own doc
   comment already flagged once by hand. Catches it at `vitest run` time
   instead of a live screenshot report.

## Scope and sequencing

All three closures share one theme — move logic out of pages and into
`experiences/abstract/components/PolymorphicLayout.*` sibling files, plus
one test guard — no changes to `PolymorphicLayout.tsx`/`.config.ts`
themselves required (the boundary reasoning from
`AUDIT-POLYMORPHIC-GRADIENT-ABSTRACTION.md` still holds: these need a
page's own `GlobalTypographyConfig`/`SiteHeaderConfig`/`WordmarkConfig` as
inputs, concepts the layout hook itself has no reason to know about).

Suggested order (each step independently shippable, verified live before
the next):

1. `resolvePolymorphicColumnBackgroundReference` extraction (smallest, zero
   behavior change — a pure refactor of the fallback chain already proven
   correct in `/posts`) + retrofit `/posts`'s own inline version to call it.
2. `usePolymorphicHeaderPresentation` hook, built by lifting the already-
   proven logic out of `/abstract`'s own two call sites (the most complete,
   most-exercised version) — then migrate `/about` and `/posts` onto it,
   deleting their own hand-rolled versions.
3. `POLYMORPHIC_SCROLL_GRADIENT_FIELD_KEYS` + `withPolymorphicScrollGradientCopiedFrom`
   — retroactively verify `POST_LAB_POLYMORPHIC_LAYOUT_CONFIG`'s own copied
   block against this list (confirms the splitBand regression is fully
   closed, not just patched once).
4. Extend `PolymorphicLayout.pageConfigs.test.ts` with the
   transparent-implies-enabled guard.

Each step's own live verification: real Playwright screenshots (now
confirmed installed in this repo, `npx playwright`) comparing `/abstract`,
`/about`, `/posts` header nav + wordmark color, not HTML-text inference —
the standard this session's own last bug report raised.

## What this does NOT change

- No change to any page's actual *visual* output for `/abstract` or
  `/about` — this is a pure extraction of already-correct, already-shipped
  logic, not a redesign. `/posts` gets the same visual result it has right
  now, just from one hook call instead of five hand-composed steps.
- No change to `PolymorphicLayoutConfig`'s own schema/fields.
- Does not attempt to also centralize `readingPresentation.ts`'s own
  `deriveReadableInk` engine itself (the ToC/article hue-shift/pigment
  system) — only the background-reference fallback chain it (and any
  future system) needs as an input.
