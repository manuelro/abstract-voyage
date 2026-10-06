import type { ConfigFieldAction } from '../../../../../components/Panel/config';
import type { ConfigFieldDefinition, ConfigFieldGroup } from '../../../../../components/Panel/config/types';
import { defineConfigScope } from '../../../../../components/Panel/config';
import { createTailwindFieldFactory } from '../../../../../components/Panel/config/tailwindFields';
import {
  DEFAULT_SITE_HEADER_CONFIG,
  type SiteHeaderConfig,
} from './registered';

export const SITE_HEADER_COLORS_SCOPE_ID =
  'SiteHeader/colors' as const;

const tailwindHeaderField = createTailwindFieldFactory<SiteHeaderConfig>();

// Familiar CSS timing names keep the authoring surface readable while the
// runtime continues to receive standards-compliant timing-function values.
const INTRO_EASING_OPTIONS = [
  { label: 'ease', value: 'ease' },
  { label: 'easeIn', value: 'ease-in' },
  { label: 'easeOut', value: 'ease-out' },
  { label: 'easeInOut', value: 'ease-in-out' },
  { label: 'linear', value: 'linear' },
] as const;

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
  'headerLeftContentAlignWide',
  'headerLeftContentAlignLg',
  'headerLeftContentVerticalAlign',
  'headerLeftContentVerticalAlignWide',
  'headerLeftContentVerticalAlignLg',
  'headerLeftContentWidth',
  'headerLeftContentWidthWide',
  'headerLeftContentWidthLg',
  'headerLeftContentInnerAlign',
  'headerLeftContentInnerAlignWide',
  'headerLeftContentInnerAlignLg',
  'headerRightContentAlign',
  'headerRightContentAlignWide',
  'headerRightContentAlignLg',
  'headerRightContentVerticalAlign',
  'headerRightContentVerticalAlignWide',
  'headerRightContentVerticalAlignLg',
  'headerRightContentWidth',
  'headerRightContentWidthWide',
  'headerRightContentWidthLg',
  'headerRightContentInnerAlign',
  'headerRightContentInnerAlignWide',
  'headerRightContentInnerAlignLg',
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
  // logoColor/logoSurfaceOffset: moved to the shared Wordmark panel
  // (config/wordmark.panel.ts) — see registered.ts's own doc comment on
  // these two fields. Still listed here (rather than removed from
  // SiteHeaderConfig outright) purely as the legacy-fallback value a page
  // that hasn't migrated to `wordmarkConfig` still gets (SiteHeader.tsx's
  // own effectiveWordmarkConfig shim) — never panel-editable on this scope
  // anymore.
  'logoColor',
  'logoSurfaceOffset',
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
export const SITE_HEADER_COLOR_FIELDS: ReadonlyArray<
  ConfigFieldDefinition<SiteHeaderConfig> | ConfigFieldGroup<SiteHeaderConfig> | ConfigFieldAction<SiteHeaderConfig>
> = [
  {
    kind: 'enum',
    key: 'colorMode',
    label: 'Header color mode',
    description: 'Nav text/border only now — the logo\'s own color mode lives on the shared "Wordmark" panel instead (see that scope\'s own doc comment for why the two were split apart). Adaptive follows the hero ink tone. Custom applies the colors below. Surface derives both from the page surface color, offset by the amounts below. Column derives from the split column\'s own color underneath each, contrast-checked and offset by the same amounts below.',
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
        description: 'Target WCAG contrast ratio for nav text/nav border against their own split column color. If the target is physically impossible for that background, the highest-contrast black/white endpoint is used. The logo has its own independent copy of this same knob on the "Wordmark" panel.',
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
      {
        kind: 'tabs',
        tabs: [
          {
            id: 'all',
            label: 'ALL SIZES',
            fields: [
              ...SITE_HEADER_COLOR_FIELDS,
              { kind: 'boolean', key: 'navTextUsesWordmarkGradient', label: 'Navigation uses wordmark gradient' },
              { kind: 'group', label: 'Navigation typography', fields: [
                { kind: 'enum', key: 'fontFamily', label: 'Heading font', options: [
                  { label: 'INHERIT', value: 'inherit' }, { label: 'SANS', value: 'sans' }, { label: 'SERIF', value: 'serif' },
                ] },
                { kind: 'boolean', key: 'navUppercase', label: 'All caps' },
                { kind: 'number', key: 'navLetterSpacingEm', label: 'Letter spacing', min: 0, max: 0.3, step: 0.01, unit: 'em' },
                tailwindHeaderField('fontWeight', { key: 'navFontWeight', label: 'Navigation font weight' }),
              ] },
              { kind: 'group', label: 'Contact styling', fields: [
                tailwindHeaderField('paddingX', { key: 'contactPaddingX', label: 'Horizontal padding' }),
                tailwindHeaderField('paddingY', { key: 'contactPaddingY', label: 'Vertical padding' }),
                tailwindHeaderField('borderWidth', { key: 'contactBorderWidth', label: 'Border width' }),
              ] },
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
        label: 'Navigation introduction',
        fields: [
          { kind: 'boolean', key: 'navIntroEnabled', label: 'Enable introductory reveal' },
          { kind: 'number', key: 'navIntroDelayMs', label: 'Delay', min: 0, max: 2000, step: 10, unit: 'ms', visibleWhen: config => config.navIntroEnabled },
          { kind: 'number', key: 'navIntroDurationMs', label: 'Duration', min: 0, max: 2000, step: 10, unit: 'ms', visibleWhen: config => config.navIntroEnabled },
          { kind: 'select', key: 'navIntroEasing', label: 'Easing', options: INTRO_EASING_OPTIONS, visibleWhen: config => config.navIntroEnabled },
          { kind: 'number', key: 'navIntroItemStaggerMs', label: 'Item stagger', min: 0, max: 250, step: 1, unit: 'ms', visibleWhen: config => config.navIntroEnabled },
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
          },
        {
          id: 'mobile',
          label: 'MOBILE (< 768px)',
          fields: [
            { kind: 'group', label: 'Wrapper', fields: [
              tailwindHeaderField('height', { breakpoint: 'base', key: 'height', label: 'Wrapper height' }),
              tailwindHeaderField('paddingX', { breakpoint: 'base', key: 'paddingX', label: 'Horizontal padding' }),
              tailwindHeaderField('paddingY', { breakpoint: 'base', key: 'paddingY', label: 'Vertical padding' }),
              tailwindHeaderField('marginTop', { breakpoint: 'base', key: 'marginTop', label: 'Top margin' }),
              tailwindHeaderField('marginBottom', { breakpoint: 'base', key: 'marginBottom', label: 'Bottom margin' }),
            ] },
            { kind: 'group', label: 'Branding', fields: [
              tailwindHeaderField('width', { breakpoint: 'base', key: 'logoWidth', label: 'Logo width' }),
            ] },
            { kind: 'group', label: 'Navigation', fields: [
              tailwindHeaderField('gap', { breakpoint: 'base', key: 'gap', label: 'Header gap' }),
              tailwindHeaderField('fontSize', { breakpoint: 'base', key: 'navFontSize', label: 'Navigation font size' }),
              tailwindHeaderField('gap', { breakpoint: 'base', key: 'navGap', label: 'Navigation item gap' }),
            ] },

            { kind: 'group', label: 'Mobile flex navigation', fields: [
              { kind: 'boolean', key: 'mobileNavFlexEnabled', label: 'Use flex row' },
              { kind: 'enum', key: 'mobileNavDistribution', label: 'Distribution', visibleWhen: config => config.mobileNavFlexEnabled, options: [
                { label: 'START', value: 'justify-start' }, { label: 'CENTER', value: 'justify-center' },
                { label: 'BETWEEN', value: 'justify-between' }, { label: 'AROUND', value: 'justify-around' },
                { label: 'EVENLY', value: 'justify-evenly' },
              ] },
              tailwindHeaderField('gapX', { key: 'mobileNavItemGap', label: 'Flex item gap', visibleWhen: config => config.mobileNavFlexEnabled }),
              { kind: 'boolean', key: 'mobileNavEqualItemWidth', label: 'Equal item widths', visibleWhen: config => config.mobileNavFlexEnabled },
              { kind: 'enum', key: 'mobileNavDivider', label: 'Divider', visibleWhen: config => config.mobileNavFlexEnabled, options: [
                { label: 'NONE', value: 'none' }, { label: 'PIPE', value: 'pipe' },
                { label: 'DOT', value: 'dot' }, { label: 'RULE', value: 'rule' },
              ] },
              tailwindHeaderField('height', { key: 'mobileNavDividerHeight', label: 'Divider height', visibleWhen: config => config.mobileNavFlexEnabled && config.mobileNavDivider === 'rule' }),
              tailwindHeaderField('width', { key: 'mobileNavDividerWidth', label: 'Divider width', visibleWhen: config => config.mobileNavFlexEnabled && config.mobileNavDivider === 'rule' }),
            ] },
          ] },
        {
          id: 'tablet',
          label: 'TABLET (≥ 768px)',
          fields: [
            { kind: 'group', label: 'Wrapper', fields: [
              tailwindHeaderField('height', { breakpoint: 'md', key: 'heightWide', label: 'Wrapper height' }),
              tailwindHeaderField('paddingX', { breakpoint: 'md', key: 'paddingXWide', label: 'Horizontal padding' }),
              tailwindHeaderField('paddingY', { breakpoint: 'md', key: 'paddingYWide', label: 'Vertical padding' }),
              tailwindHeaderField('marginTop', { breakpoint: 'md', key: 'marginTopWide', label: 'Top margin' }),
              tailwindHeaderField('marginBottom', { breakpoint: 'md', key: 'marginBottomWide', label: 'Bottom margin' }),
            ] },
            { kind: 'group', label: 'Branding', fields: [
              tailwindHeaderField('width', { breakpoint: 'md', key: 'logoWidthWide', label: 'Logo width' }),
            ] },
            { kind: 'group', label: 'Navigation', fields: [
              tailwindHeaderField('gap', { breakpoint: 'md', key: 'gapWide', label: 'Header gap' }),
              tailwindHeaderField('fontSize', { breakpoint: 'md', key: 'navFontSizeWide', label: 'Navigation font size' }),
              tailwindHeaderField('gap', { breakpoint: 'md', key: 'navGapWide', label: 'Navigation item gap' }),
            ] },
          ] },
        {
          id: 'desktop',
          label: 'DESKTOP (≥ 1024px)',
          fields: [
            { kind: 'group', label: 'Wrapper', fields: [
              tailwindHeaderField('height', { breakpoint: 'lg', key: 'heightLg', label: 'Wrapper height' }),
              tailwindHeaderField('paddingX', { breakpoint: 'lg', key: 'paddingXLg', label: 'Horizontal padding' }),
              tailwindHeaderField('paddingY', { breakpoint: 'lg', key: 'paddingYLg', label: 'Vertical padding' }),
              tailwindHeaderField('marginTop', { breakpoint: 'lg', key: 'marginTopLg', label: 'Top margin' }),
              tailwindHeaderField('marginBottom', { breakpoint: 'lg', key: 'marginBottomLg', label: 'Bottom margin' }),
            ] },
            { kind: 'group', label: 'Branding', fields: [
              tailwindHeaderField('width', { breakpoint: 'lg', key: 'logoWidthLg', label: 'Logo width' }),
            ] },
            { kind: 'group', label: 'Navigation', fields: [
              tailwindHeaderField('gap', { breakpoint: 'lg', key: 'gapLg', label: 'Header gap' }),
              tailwindHeaderField('fontSize', { breakpoint: 'lg', key: 'navFontSizeLg', label: 'Navigation font size' }),
              tailwindHeaderField('gap', { breakpoint: 'lg', key: 'navGapLg', label: 'Navigation item gap' }),
            ] },
          ] },
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
