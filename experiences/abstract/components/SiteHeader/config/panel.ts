import type { ConfigScopeEntry } from '../../../../../components/Panel/config';
import { defineConfigScope } from '../../../../../components/Panel/config';
import {
  DEFAULT_SITE_HEADER_CONFIG,
  type SiteHeaderConfig,
} from './registered';

export const SITE_HEADER_COLORS_SCOPE_ID =
  'SiteHeader/colors' as const;

// Content-container width/alignment for both header segments is edited
// from pages/posts-lab/postLab.panel.ts's own 'Posts lab page layout'
// scope instead — the only page that currently exposes a control for
// these fields, per this codebase's "centralize layout config, don't
// spread it across component-owned panels" direction (a future
// cross-page normalization is explicitly out of scope for now). Hidden
// here, not rendered a second time — these keys still live on this
// shared SiteHeaderConfig object (the component's own runtime
// prop surface is unavoidably shared), only the *editing surface* is
// posts-lab-owned.
const HEADER_LAYOUT_KEYS_OWNED_ELSEWHERE: ReadonlyArray<keyof SiteHeaderConfig> = [
  'headerLeftContentAlign',
  'headerLeftContentVerticalAlign',
  'headerLeftContentWidthWide',
  'headerLeftContentInnerAlignWide',
  'headerRightContentAlign',
  'headerRightContentVerticalAlign',
  'headerRightContentWidthWide',
  'headerRightContentInnerAlignWide',
  // headerLeftContentClassName/headerRightContentClassName: a plain
  // passthrough string, not a token-validated field, so it has no panel
  // field on *either* scope — postLab.panel.ts's own padding/margin fields
  // (the ones actually rendered) get joined into this string at the page's
  // own effectiveSiteHeaderConfig call site. Still listed here because
  // defineConfigScope requires every DEFAULT_SITE_HEADER_CONFIG
  // key to be represented as rendered or hidden.
  'headerLeftContentClassName',
  'headerRightContentClassName',
  // mobileContactPlain: page-owned, hardcoded at a page's own
  // effectiveSiteHeaderConfig call site if a page ever needs to override
  // it — same precedent as navAlignedToSplitEnabled's own per-page
  // override, not a panel-editable field on this shared scope. Defaults
  // `true` (plain, matching About/Journal — see this field's own doc
  // comment, SiteHeader.config.ts) since that's what every real
  // page in this codebase wants; no page currently needs to override it.
  'mobileContactPlain',
  // headerContentLayoutOwnedByPage/headerLeftSegmentClassName/
  // headerRightSegmentClassName: same precedent as
  // headerLeftContentClassName/headerRightContentClassName above — a
  // boolean opt-out flag plus two plain passthrough strings, page-owned
  // (posts-lab is the only current consumer, see that field's own doc
  // comment in SiteHeader.config.ts), not panel-editable fields on
  // this shared scope. postLab.panel.ts's own real per-breakpoint
  // alignment/width fields (the ones actually rendered) get resolved into
  // these two strings at the page's own effectiveSiteHeaderConfig call site.
  'headerContentLayoutOwnedByPage',
  'headerLeftSegmentClassName',
  'headerRightSegmentClassName',
];

/**
 * The colorMode switch + its two dependent field groups — extracted so
 * SiteHeaderColorOverride.panel.ts (the per-page override scope,
 * see that file's own doc comment) can render the *exact* same fields
 * instead of a second, hand-copied definition that could silently drift on
 * labels/options/min/max. Kept as plain data (not a generic factory) since
 * ConfigFieldDefinition's own key/visibleWhen types are parameterized per
 * TConfig — the override file documents its own narrow, deliberate cast at
 * the one point it borrows this array for a differently-shaped (but
 * field-for-field identical) config type.
 */
export const SITE_HEADER_COLOR_FIELDS: ReadonlyArray<ConfigScopeEntry<SiteHeaderConfig>> = [
  {
    kind: 'enum',
    key: 'colorMode',
    label: 'Header color mode',
    description: 'Adaptive follows the hero ink tone. Custom applies the colors below. Surface derives all three from the page surface color, offset by the amounts below. Column derives logo/nav from the split column\'s own color underneath each, contrast-checked and offset by the same amounts below.',
    options: [
      { label: 'ADAPTIVE', value: 'adaptive' },
      { label: 'CUSTOM', value: 'custom' },
      { label: 'SURFACE', value: 'surface' },
      { label: 'COLUMN', value: 'column' },
    ],
  },
  {
    kind: 'group',
    label: 'Custom colors',
    visibleWhen: config => config.colorMode === 'custom',
    fields: [
      { kind: 'color', key: 'logoColor', label: 'Logo' },
      { kind: 'color', key: 'navTextColor', label: 'Navigation text' },
      { kind: 'color', key: 'navBorderColor', label: 'Navigation border' },
    ],
  },
  {
    kind: 'group',
    label: 'Surface/column offset',
    visibleWhen: config => config.colorMode === 'surface' || config.colorMode === 'column',
    fields: [
      {
        kind: 'number',
        key: 'logoSurfaceOffset',
        label: 'Logo offset',
        description: 'How much lighter (positive) or darker (negative) than the base color the logo is.',
        min: -1,
        max: 1,
        step: 0.01,
      },
      {
        kind: 'number',
        key: 'navTextSurfaceOffset',
        label: 'Navigation text offset',
        description: 'How much lighter (positive) or darker (negative) than the base color the nav text is.',
        min: -1,
        max: 1,
        step: 0.01,
      },
      {
        kind: 'number',
        key: 'navBorderSurfaceOffset',
        label: 'Navigation border offset',
        description: 'How much lighter (positive) or darker (negative) than the base color the nav border/separator is.',
        min: -1,
        max: 1,
        step: 0.01,
      },
    ],
  },
  {
    kind: 'group',
    label: 'Column contrast',
    visibleWhen: config => config.colorMode === 'column',
    fields: [
      {
        kind: 'number',
        key: 'columnTextMinContrast',
        label: 'Minimum contrast ratio',
        description: 'Target WCAG contrast ratio for logo/nav text/nav border against their own split column color. If the target is physically impossible for that background, the highest-contrast black/white endpoint is used.',
        min: 1,
        max: 21,
        step: 0.1,
      },
    ],
  },
];

export const SITE_HEADER_COLORS_PANEL =
  defineConfigScope<SiteHeaderConfig>({
    id: SITE_HEADER_COLORS_SCOPE_ID,
    component: 'SiteHeader',
    scope: 'colors',
    // 'Site header' alone was indistinguishable from this same component's
    // OTHER, page-owned section — "Abstract/About/Contact header colors"
    // (SiteHeaderColorOverride) — in the panel's collapsed list,
    // which shows only the title, not the summary below. An operator
    // looking for nav typography (all caps, letter spacing, font size/
    // weight — see the "Navigation type" group) had no way to tell which
    // of the two sections held it without expanding both or searching.
    title: 'Site header & navigation',
    createdAt: '2026-07-18',
    summary: 'Top bar · legacy band · navigation type',
    defaultOpen: false,
    // See HEADER_LAYOUT_KEYS_OWNED_ELSEWHERE's own doc comment above.
    hiddenKeys: HEADER_LAYOUT_KEYS_OWNED_ELSEWHERE,
    defaultValue: DEFAULT_SITE_HEADER_CONFIG,
    fields: [
      ...SITE_HEADER_COLOR_FIELDS,
      {
        kind: 'group',
        label: 'Navigation type',
        // Nav labels only (About/Journal/Contact) — the logo is vector
        // artwork (Logo.tsx), not text, so nothing here touches it. Color
        // is deliberately absent: nav text color is already fully owned by
        // colorMode/*Color/*SurfaceOffset above (SITE_HEADER_COLOR_FIELDS)
        // and stays inferred per-page exactly as it works today.
        fields: [
          {
            kind: 'enum',
            key: 'fontFamily',
            label: 'Heading font',
            description: 'Inherit (default) follows the site-wide Global typography setting. Sans/Serif pin the logo/nav font regardless of that setting.',
            options: [
              { label: 'INHERIT', value: 'inherit' },
              { label: 'SANS', value: 'sans' },
              { label: 'SERIF', value: 'serif' },
            ],
          },
          {
            kind: 'boolean',
            key: 'navUppercase',
            label: 'All caps',
            description: 'Uppercases the nav labels (About/Journal/Contact). On by default, matching today\'s look.',
          },
          {
            kind: 'number',
            key: 'navLetterSpacingEm',
            label: 'Letter spacing',
            min: 0,
            max: 0.3,
            step: 0.01,
            unit: 'em',
          },
          {
            kind: 'enum',
            key: 'navFontWeight',
            label: 'Font weight',
            options: [
              { label: 'NORMAL', value: 'font-normal' },
              { label: 'MEDIUM', value: 'font-medium' },
              { label: 'SEMIBOLD', value: 'font-semibold' },
              { label: 'BOLD', value: 'font-bold' },
            ],
          },
          {
            kind: 'enum',
            key: 'navFontSizeNarrow',
            label: 'Font size (mobile)',
            description: 'Applies below the md breakpoint (768px).',
            options: [
              { label: '9px', value: 'text-[9px]' },
              { label: '10px', value: 'text-[10px]' },
              { label: '11px', value: 'text-[11px]' },
              { label: 'xs (12px)', value: 'text-xs' },
              { label: 'sm (14px)', value: 'text-sm' },
              { label: 'base (16px)', value: 'text-base' },
            ],
          },
          {
            kind: 'enum',
            key: 'navFontSizeDesktop',
            label: 'Font size (desktop)',
            description: 'Overrides the mobile font size from md (768px) up.',
            options: [
              { label: '9px', value: 'md:text-[9px]' },
              { label: '10px', value: 'md:text-[10px]' },
              { label: '11px', value: 'md:text-[11px]' },
              { label: 'xs (12px)', value: 'md:text-xs' },
              { label: 'sm (14px)', value: 'md:text-sm' },
              { label: 'base (16px)', value: 'md:text-base' },
            ],
          },
        ],
      },
      {
        kind: 'group',
        label: 'Top bar wrapper',
        fields: [
          { kind: 'enum', key: 'height', label: 'Narrow wrapper height', options: [
            { label: 'H-12', value: 'h-12' },
            { label: 'H-14', value: 'h-14' },
            { label: 'H-16', value: 'h-16' },
            { label: 'H-20', value: 'h-20' },
            { label: 'H-24', value: 'h-24' },
            { label: 'H-28', value: 'h-28' },
            { label: 'H-32', value: 'h-32' },
            { label: 'H-36', value: 'h-36' },
            { label: 'H-40', value: 'h-40' },
          ] },
          { kind: 'enum', key: 'desktopHeight', label: 'Desktop wrapper height', options: [
            { label: 'H-12', value: 'md:h-12' },
            { label: 'H-14', value: 'md:h-14' },
            { label: 'H-16', value: 'md:h-16' },
            { label: 'H-20', value: 'md:h-20' },
            { label: 'H-24', value: 'md:h-24' },
            { label: 'H-28', value: 'md:h-28' },
            { label: 'H-32', value: 'md:h-32' },
            { label: 'H-36', value: 'md:h-36' },
            { label: 'H-40', value: 'md:h-40' },
          ] },
          { kind: 'enum', key: 'paddingX', label: 'Narrow padding', options: [
            { label: 'PX-4', value: 'px-4' },
            { label: 'PX-5', value: 'px-5' },
            { label: 'PX-6', value: 'px-6' },
            { label: 'PX-8', value: 'px-8' },
          ] },
          { kind: 'enum', key: 'paddingY', label: 'Narrow vertical padding', options: [
            { label: 'PY-0', value: 'py-0' },
            { label: 'PY-1', value: 'py-1' },
            { label: 'PY-2', value: 'py-2' },
            { label: 'PY-3', value: 'py-3' },
            { label: 'PY-4', value: 'py-4' },
            { label: 'PY-6', value: 'py-6' },
          ] },
          { kind: 'enum', key: 'desktopPaddingX', label: 'Desktop padding', options: [
            { label: 'PX-6', value: 'md:px-6' },
            { label: 'PX-8', value: 'md:px-8' },
            { label: 'PX-10', value: 'md:px-10' },
            { label: 'PX-12', value: 'md:px-12' },
            { label: 'PX-16', value: 'md:px-16' },
          ] },
          { kind: 'enum', key: 'desktopPaddingY', label: 'Desktop vertical padding', options: [
            { label: 'PY-0', value: 'md:py-0' },
            { label: 'PY-1', value: 'md:py-1' },
            { label: 'PY-2', value: 'md:py-2' },
            { label: 'PY-3', value: 'md:py-3' },
            { label: 'PY-4', value: 'md:py-4' },
            { label: 'PY-6', value: 'md:py-6' },
          ] },
          { kind: 'enum', key: 'marginTop', label: 'Narrow margin top', options: [
            { label: 'MT-0', value: 'mt-0' },
            { label: 'MT-2', value: 'mt-2' },
            { label: 'MT-4', value: 'mt-4' },
            { label: 'MT-6', value: 'mt-6' },
            { label: 'MT-8', value: 'mt-8' },
          ] },
          { kind: 'enum', key: 'marginBottom', label: 'Narrow margin bottom', options: [
            { label: 'MB-0', value: 'mb-0' },
            { label: 'MB-2', value: 'mb-2' },
            { label: 'MB-4', value: 'mb-4' },
            { label: 'MB-6', value: 'mb-6' },
            { label: 'MB-8', value: 'mb-8' },
          ] },
          { kind: 'enum', key: 'desktopMarginTop', label: 'Desktop margin top', options: [
            { label: 'MT-0', value: 'md:mt-0' },
            { label: 'MT-2', value: 'md:mt-2' },
            { label: 'MT-4', value: 'md:mt-4' },
            { label: 'MT-6', value: 'md:mt-6' },
            { label: 'MT-8', value: 'md:mt-8' },
          ] },
          { kind: 'enum', key: 'desktopMarginBottom', label: 'Desktop margin bottom', options: [
            { label: 'MB-0', value: 'md:mb-0' },
            { label: 'MB-2', value: 'md:mb-2' },
            { label: 'MB-4', value: 'md:mb-4' },
            { label: 'MB-6', value: 'md:mb-6' },
            { label: 'MB-8', value: 'md:mb-8' },
          ] },
        ],
      },
      {
        kind: 'group',
        label: 'Navigation layout',
        fields: [
          { kind: 'enum', key: 'logoWidth', label: 'Narrow logo width', options: [
            { label: 'W-36', value: 'w-36' },
            { label: 'W-40', value: 'w-40' },
            { label: 'W-48', value: 'w-48' },
            { label: 'W-56', value: 'w-56' },
          ] },
          { kind: 'enum', key: 'desktopLogoWidth', label: 'Desktop logo width', options: [
            { label: 'W-56', value: 'md:w-56' },
            { label: 'W-64', value: 'md:w-64' },
            { label: 'W-72', value: 'md:w-72' },
            { label: 'W-80', value: 'md:w-80' },
          ] },
          { kind: 'enum', key: 'gap', label: 'Narrow header gap', options: [
            { label: 'GAP-1', value: 'gap-1' },
            { label: 'GAP-2', value: 'gap-2' },
            { label: 'GAP-3', value: 'gap-3' },
            { label: 'GAP-4', value: 'gap-4' },
            { label: 'GAP-6', value: 'gap-6' },
          ] },
          { kind: 'enum', key: 'desktopGap', label: 'Desktop header gap', options: [
            { label: 'GAP-4', value: 'md:gap-4' },
            { label: 'GAP-6', value: 'md:gap-6' },
            { label: 'GAP-8', value: 'md:gap-8' },
            { label: 'GAP-10', value: 'md:gap-10' },
          ] },
          { kind: 'enum', key: 'navGap', label: 'Navigation gap', options: [
            { label: 'GAP-4', value: 'md:gap-4' },
            { label: 'GAP-6', value: 'md:gap-6' },
            { label: 'GAP-8', value: 'md:gap-8' },
            { label: 'GAP-10', value: 'md:gap-10' },
          ] },
          { kind: 'enum', key: 'mobileNavGap', label: 'Narrow navigation gap', options: [
            { label: 'GAP-0', value: 'gap-0' },
            { label: 'GAP-1', value: 'gap-1' },
            { label: 'GAP-2', value: 'gap-2' },
            { label: 'GAP-3', value: 'gap-3' },
          ] },
          { kind: 'enum', key: 'contactPaddingX', label: 'Contact padding X', options: [
            { label: 'PX-3', value: 'px-3' },
            { label: 'PX-4', value: 'px-4' },
            { label: 'PX-5', value: 'px-5' },
            { label: 'PX-6', value: 'px-6' },
          ] },
          { kind: 'enum', key: 'contactPaddingY', label: 'Contact padding Y', options: [
            { label: 'PY-2', value: 'py-2' },
            { label: 'PY-2.5', value: 'py-2.5' },
            { label: 'PY-3', value: 'py-3' },
            { label: 'PY-4', value: 'py-4' },
          ] },
          { kind: 'enum', key: 'contactBorderWidth', label: 'Contact border', options: [
            { label: '1PX', value: 'border' },
            { label: '2PX', value: 'border-2' },
          ] },
        ],
      },
      {
        kind: 'group',
        label: 'Split background',
        fields: [
          {
            kind: 'boolean',
            key: 'splitBandEnabled',
            label: 'Show split background',
            description: 'Decorative 38/62 split background behind the whole header — only ever renders on a page that also supplies its own two colors (today, only the about page does), so this is inert everywhere else regardless of this toggle.',
          },
          {
            kind: 'enum',
            key: 'splitBandSide',
            label: 'Wide side',
            description: 'Which physical side gets the wider (62%) band — mirrors SplitColumnLayout\'s own wideColumnSide so the header band and body grid stay in sync.',
            options: [
              { label: 'LEFT', value: 'left' },
              { label: 'RIGHT', value: 'right' },
            ],
            visibleWhen: config => config.splitBandEnabled,
          },
        ],
      },
      {
        kind: 'group',
        label: 'Split-aligned navigation',
        // None of this group's sub-fields are gated behind
        // navAlignedToSplitEnabled's own value here, deliberately: every
        // current page that turns this feature on (/about, /abstract) does
        // so via a local override at its own SplitColumnPageShell call
        // site, not by writing true into this shared, panel-bound config
        // (that config is shared across every page via
        // SharedDesignConfigProvider — see pages/abstract.tsx's own doc
        // comment on its siteHeaderConfig — so setting it there would leak
        // the feature into every other consumer, exactly the class of bug
        // PLAN-VERTICAL-CARD-STACK.md's revision log already flagged once
        // for this same header). A visibleWhen keyed off this scope's own
        // (always-false-in-practice) copy of navAlignedToSplitEnabled would
        // hide every sub-field here permanently, on every page, regardless
        // of whether the feature is actually active — which is exactly
        // what had happened before this comment was written.
        fields: [
          {
            kind: 'boolean',
            key: 'navAlignedToSplitEnabled',
            label: 'Align nav to split boundary',
            description: 'Off (default): nav stays in its usual padded row, pushed to the far side. On (desktop only): nav moves to start exactly at the header\'s own 38/62 split boundary, with a separator line before the first item and Contact de-chromed to a plain link. Note: /about and /abstract both force this on via their own local override regardless of this toggle\'s value here — see this field\'s own doc comment.',
          },
          {
            kind: 'boolean',
            key: 'navSeparatorVisible',
            label: 'Show separator',
            description: 'On (default): the divider line between the logo and the first nav item is visible. Off: it renders transparent instead of being removed, so the logo/nav spacing stays exactly the same either way.',
          },
          {
            kind: 'color',
            key: 'navSeparatorColor',
            label: 'Separator color',
            visibleWhen: config => config.navSeparatorVisible,
          },
          {
            kind: 'number',
            key: 'navSeparatorHeightMultiplier',
            label: 'Separator height',
            description: 'Multiple of the logo\'s own live-measured height.',
            min: 1,
            max: 4,
            step: 0.1,
            unit: 'x',
          },
          {
            kind: 'number',
            key: 'navContentGapPx',
            label: 'Content gap',
            description: 'Gap from the separator to the first nav item — set to match the wide column\'s own left content inset so the first item lines up with the body text beneath it.',
            min: 8,
            max: 96,
            step: 1,
            unit: 'px',
          },
          {
            kind: 'boolean',
            key: 'navAlignedToPageContainer',
            label: 'Align within PageContainer',
            description: 'Off (default): the split ratio is computed against the header\'s full, unpadded width — correct when the body split is full-bleed (e.g. /about). On: computed against the same padded PageContainer box the header\'s own logo/nav sit inside — correct when the body split is also wrapped in that same PageContainer (e.g. /abstract\'s "bounded" content container).',
          },
          {
            kind: 'boolean',
            key: 'logoAlignedToSplitEnabled',
            label: 'Move logo next to divider',
            description: 'Off (default): logo stays in its usual far-left slot. On (desktop only): logo moves to sit immediately before the separator line, using the same logo/nav gap already used in the default layout — the separator and nav items themselves don\'t move.',
          },
          {
            kind: 'boolean',
            key: 'logoContentGapPaddingEnabled',
            label: 'Apply content gap as logo padding',
            visibleWhen: config => config.logoAlignedToSplitEnabled,
            description: 'On (default): the content gap above is applied as literal padding-right on the logo\'s own content box. Off: that padding is omitted — for a page whose own layout config already owns this box\'s padding-right (e.g. posts-lab\'s own layout panel), so this inline value can\'t silently override it.',
          },
          // headerLeftContentAlign/-VerticalAlign/headerRightContentAlign/
          // -VerticalAlign/headerLeftContentWidthWide/headerRightContentWidthWide
          // moved to SiteHeaderLayout.panel.ts's own dedicated
          // 'Header layout' scope — see that file's own doc comment for why
          // layout concerns don't belong in this 'colors' scope alongside
          // font/wrapper-height fields.
        ],
      },
      {
        kind: 'group',
        label: 'Band texture',
        fields: [
          {
            kind: 'boolean',
            key: 'navBandEnabled',
            label: 'Show gradient band',
            description: 'Wraps the logo and navigation in a live row from the canonical legacy gradient. All legacy color and motion controls remain authoritative.',
          },
          {
            kind: 'number',
            key: 'navBandSourceRow',
            label: 'Source row',
            min: 1,
            max: 16,
            step: 1,
            visibleWhen: config => config.navBandEnabled,
          },
          {
            kind: 'number',
            key: 'navBandScale',
            label: 'Band scale',
            min: 1,
            max: 3,
            step: 0.01,
            unit: 'x',
            visibleWhen: config => config.navBandEnabled,
          },
          {
            kind: 'number',
            key: 'navBandPanXPercent',
            label: 'Position X',
            min: 0,
            max: 100,
            step: 1,
            unit: '%',
            visibleWhen: config => config.navBandEnabled,
          },
          {
            kind: 'number',
            key: 'navBandPanYPercent',
            label: 'Position Y',
            min: 0,
            max: 100,
            step: 1,
            unit: '%',
            visibleWhen: config => config.navBandEnabled,
          },
          {
            kind: 'number',
            key: 'navBandOpacity',
            label: 'Opacity',
            min: 0,
            max: 1,
            step: 0.01,
            visibleWhen: config => config.navBandEnabled,
          },
          {
            kind: 'number',
            key: 'navBandChromaDuck',
            label: 'Inactive duck',
            description: 'Independent final chroma duck for the top wrapper band.',
            min: 0,
            max: 1,
            step: 0.01,
            visibleWhen: config => config.navBandEnabled,
          },
          {
            kind: 'number',
            key: 'navBandSaturation',
            label: 'Saturation',
            description: 'Independent saturation trim applied after sampling the legacy field.',
            min: 0,
            max: 2,
            step: 0.01,
            unit: 'x',
            visibleWhen: config => config.navBandEnabled,
          },
          {
            kind: 'number',
            key: 'navBandBrightness',
            label: 'Brightness',
            description: 'Independent brightness trim applied after sampling the legacy field.',
            min: 0.5,
            max: 1.6,
            step: 0.01,
            unit: 'x',
            visibleWhen: config => config.navBandEnabled,
          },
        ],
      },
    ],
    copy: {
      targetFile: 'experiences/abstract/components/SiteHeader/config/registered.ts',
      targetSymbol: 'DEFAULT_SITE_HEADER_CONFIG',
      targetType: 'SiteHeaderConfig',
      updateStrategy: 'replace_scope',
      completeScope: true,
    },
  });
