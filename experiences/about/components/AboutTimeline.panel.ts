import { defineConfigScope } from '../../../components/Panel/config';
import type { ConfigScopeEntry } from '../../../components/Panel/config/types';
import {
  GAP_OPTIONS,
  PADDING_TOP_OPTIONS,
  PADDING_TOP_WIDE_OPTIONS,
  PADDING_TOP_LG_OPTIONS,
  PADDING_RIGHT_OPTIONS,
  PADDING_RIGHT_WIDE_OPTIONS,
  PADDING_RIGHT_LG_OPTIONS,
  PADDING_BOTTOM_OPTIONS,
  PADDING_BOTTOM_WIDE_OPTIONS,
  PADDING_BOTTOM_LG_OPTIONS,
  PADDING_LEFT_OPTIONS,
  PADDING_LEFT_WIDE_OPTIONS,
  PADDING_LEFT_LG_OPTIONS,
  MARGIN_TOP_OPTIONS,
  MARGIN_TOP_WIDE_OPTIONS,
  MARGIN_TOP_LG_OPTIONS,
  MARGIN_RIGHT_OPTIONS,
  MARGIN_RIGHT_WIDE_OPTIONS,
  MARGIN_RIGHT_LG_OPTIONS,
  MARGIN_BOTTOM_OPTIONS,
  MARGIN_BOTTOM_WIDE_OPTIONS,
  MARGIN_BOTTOM_LG_OPTIONS,
  MARGIN_LEFT_OPTIONS,
  MARGIN_LEFT_WIDE_OPTIONS,
  MARGIN_LEFT_LG_OPTIONS,
} from '../../../components/tailwindSpacingScale';
import { FONT_SIZE_OPTIONS, FONT_WEIGHT_OPTIONS, MAX_WIDTH_OPTIONS } from '../../../components/tailwindTypographyScale';
import {
  DEFAULT_ABOUT_TIMELINE_CONFIG,
  CATEGORY_SEPARATOR_OPTIONS,
  MARKER_SIZE_OPTIONS,
  RULE_WEIGHT_OPTIONS,
  type AboutTimelineConfig,
} from './AboutTimeline.config';

export const ABOUT_TIMELINE_SCOPE_ID = 'AboutTimeline/appearance' as const;

// Local to this scope, same "each panel.ts keeps its own copy" convention
// AboutMobileAccordion.panel.ts already follows.
const MOTION_EASING_OPTIONS = [
  { label: 'LINEAR', value: 'linear' },
  { label: 'STANDARD', value: 'standard' },
  { label: 'EXPRESSIVE', value: 'expressive' },
  { label: 'VISCOUS', value: 'viscous' },
  { label: 'GENTLE', value: 'gentle' },
] as const;

const whenCustomMarkerColor = (config: Readonly<AboutTimelineConfig>) => (
  config.markerColorMode === 'custom'
);
const whenRuleVisible = (config: Readonly<AboutTimelineConfig>) => config.ruleVisible;
const whenMarkerGradientEnabled = (config: Readonly<AboutTimelineConfig>) => config.markerGradientEnabled;
const whenRowCategoryEnabled = (config: Readonly<AboutTimelineConfig>) => config.rowCategoryEnabled;

/**
 * CMP-04 (about-IA-timeline-copy-rework) — same scope/registry pattern as
 * `AboutMobileAccordion.panel.ts`: single-page consumer, registered in
 * `pages/aboutConfigPanels.ts`.
 *
 * Every spacing/sizing field below uses `kind: 'select'` over a literal
 * Tailwind class catalog (`components/tailwindSpacingScale.ts`/
 * `tailwindTypographyScale.ts`, or this component's own local
 * `MARKER_SIZE_OPTIONS`/`RULE_WEIGHT_OPTIONS`) — never `kind: 'number'` with
 * a raw px value — matching the shape `AboutMobileAccordion.panel.ts`'s own
 * `affordancePadding`/`affordanceBorderThicknessClassName`/
 * `affordanceDimensionClassName` fields already use one file over. Opacity,
 * duration, and contrast-ratio fields stay `kind: 'number'` — see
 * `AboutTimeline.config.ts`'s own doc comment for why those three are the
 * genuine, sitewide-consistent exceptions.
 */
// Extracted so a second page reusing the same `AboutTimeline` component
// (e.g. /abstract's own registration, experiences/abstract/components/
// AbstractTimeline.panel.ts) can register its own scope id/title/copy
// target against the exact same field list — one real source of truth for
// "what AboutTimelineConfig looks like in a panel," not a second,
// independently-typed-out copy that silently drifts from this one the next
// time a field is added here.
export const ABOUT_TIMELINE_PANEL_FIELDS: ReadonlyArray<ConfigScopeEntry<AboutTimelineConfig>> = [
  {
    kind: 'select',
    key: 'maxWidthClassName',
    label: 'Max width',
    description: 'Caps the whole block\'s own width (description + rows) so it stays legible instead of stretching edge-to-edge on wide viewports/columns.',
    options: MAX_WIDTH_OPTIONS,
  },
  {
    kind: 'select',
    key: 'rowGap',
    label: 'Row gap',
    options: GAP_OPTIONS,
  },
  {
    kind: 'select',
    key: 'markerSizeClassName',
    label: 'Marker size',
    options: MARKER_SIZE_OPTIONS,
  },
  {
    kind: 'boolean',
    key: 'ruleVisible',
    label: 'Show rule',
    description: 'The hairline vertical rule the markers sit on. Off omits it entirely; rows still show their own marker.',
  },
  {
    kind: 'select',
    key: 'ruleWeightClassName',
    label: 'Rule weight',
    description: 'Thickness of the hairline vertical rule the markers sit on.',
    options: RULE_WEIGHT_OPTIONS,
    visibleWhen: whenRuleVisible,
  },
  {
    kind: 'enum',
    key: 'markerColorMode',
    label: 'Marker color source',
    description: '"Accent" (default) tracks the active slide\'s own resolved palette color. "Custom" pins the marker to a fixed color below instead. "Text" matches whatever color the row\'s own title text is currently rendering at — one ink for both.',
    options: [
      { label: 'ACCENT', value: 'accent' },
      { label: 'CUSTOM', value: 'custom' },
      { label: 'TEXT', value: 'text' },
    ],
  },
  {
    kind: 'color',
    key: 'markerCustomColor',
    label: 'Marker custom color',
    visibleWhen: whenCustomMarkerColor,
  },
  {
    kind: 'number',
    key: 'markerIdleOpacity',
    label: 'Marker idle opacity',
    description: 'Opacity of an inactive (hollow) marker outline.',
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    kind: 'number',
    key: 'markerActiveOpacity',
    label: 'Marker active opacity',
    description: 'Opacity of the active (filled) marker.',
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    kind: 'boolean',
    key: 'markerGradientEnabled',
    label: 'Marker gradient mesh',
    description: 'Off (default): the marker fill is the flat marker-color behavior above. On: the marker fill renders the same WebGL gradient mesh the active dock slide / expanded accordion item already use, clipped to the marker\'s own circle. Desktop-only.',
  },
  {
    kind: 'number',
    key: 'markerGradientScale',
    label: 'Marker gradient scale',
    description: 'Only used while "Marker gradient mesh" is on. Counterintuitively, HIGH values (near the max) read as a clean, legible color sweep at the marker\'s small size — LOW values wash out to a flat averaged color instead. Independent of the dock\'s own gradient scale.',
    min: 0.5,
    max: 4,
    step: 0.01,
    visibleWhen: whenMarkerGradientEnabled,
  },
  {
    kind: 'enum',
    key: 'alignment',
    label: 'Alignment',
    description: 'Right moves the marker/rule column to the right edge and right-aligns every row\'s own text — including the description above the rows.',
    options: [
      { label: 'LEFT', value: 'left' },
      { label: 'RIGHT', value: 'right' },
    ],
  },
  {
    kind: 'number',
    key: 'rowTitleMinContrastActive',
    label: 'Row title contrast (active)',
    description: 'WCAG contrast ratio a row\'s own title (caption) must clear against the column\'s own resolved background color while that row is active.',
    min: 1,
    max: 21,
    step: 0.1,
  },
  {
    kind: 'number',
    key: 'rowTitleMinContrastInactive',
    label: 'Row title contrast (inactive)',
    description: 'Same as the active target above, applied while the row is inactive — typically lower, so an inactive title reads as genuinely de-emphasized.',
    min: 1,
    max: 21,
    step: 0.1,
  },
  {
    kind: 'number',
    key: 'rowDescriptionMinContrastActive',
    label: 'Row description contrast (active)',
    description: 'Same active/inactive contrast pair as the title above, applied to a row\'s own supporting line instead.',
    min: 1,
    max: 21,
    step: 0.1,
  },
  {
    kind: 'number',
    key: 'rowDescriptionMinContrastInactive',
    label: 'Row description contrast (inactive)',
    min: 1,
    max: 21,
    step: 0.1,
  },
  {
    kind: 'select',
    key: 'rowTitleFontWeightClassName',
    label: 'Row title font weight',
    description: 'Opt-in — off (font-normal) by default. Applied identically to every row regardless of active/inactive state; never a state signal on its own.',
    options: FONT_WEIGHT_OPTIONS,
  },
  {
    kind: 'select',
    key: 'rowTitleFontSizeClassName',
    label: 'Row title font size',
    options: FONT_SIZE_OPTIONS,
  },
  {
    kind: 'select',
    key: 'rowDescriptionFontSizeClassName',
    label: 'Row description font size',
    options: FONT_SIZE_OPTIONS,
  },
  {
    kind: 'number',
    key: 'rowTitleOpacityActive',
    label: 'Row title opacity (active)',
    description: 'Opacity of a row\'s own title (caption) while that row is active — independent of the supporting line\'s own opacity below.',
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    kind: 'number',
    key: 'rowTitleOpacityInactive',
    label: 'Row title opacity (inactive)',
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    kind: 'number',
    key: 'rowDescriptionOpacityActive',
    label: 'Row description opacity (active)',
    description: 'Opacity of a row\'s own supporting line while that row is active — independent of the title\'s own opacity above.',
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    kind: 'number',
    key: 'rowDescriptionOpacityInactive',
    label: 'Row description opacity (inactive)',
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    kind: 'number',
    key: 'hoverTitleOpacity',
    label: 'Hover title opacity',
    description: 'Opacity the hovered row\'s own title rises to during pointer hover.',
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    kind: 'number',
    key: 'hoverDelayMs',
    label: 'Hover delay',
    description: 'Time the pointer must stay over a row before its hover state takes effect. Leaving early cancels it — no delay on the way out.',
    min: 0,
    max: 2000,
    step: 10,
    unit: 'ms',
    integer: true,
  },
  {
    kind: 'boolean',
    key: 'rowCategoryEnabled',
    label: 'Show row category',
    description: 'Off by default. On reveals a row category beside the title only while the title itself is hovered or keyboard-focused.',
  },
  {
    kind: 'enum',
    key: 'rowCategorySeparator',
    label: 'Category separator',
    options: CATEGORY_SEPARATOR_OPTIONS,
    visibleWhen: whenRowCategoryEnabled,
  },
  {
    kind: 'number',
    key: 'rowCategoryRevealDelayMs',
    label: 'Category reveal delay',
    description: 'Delay before the hover-only category appears beside the title.',
    min: 0,
    max: 2000,
    step: 10,
    unit: 'ms',
    integer: true,
    visibleWhen: whenRowCategoryEnabled,
  },
  // Padding and margin are tiered by breakpoint; the ALL SIZES tab is only
  // for controls that deliberately stay single-value across every
  // breakpoint, such as marker hover opacity.
  //
  // ALL padding AND margin across this scope, tiered by breakpoint — a
  // single MOBILE/TABLET/DESKTOP switcher (operator fix: an earlier
  // version repeated this same switcher 4 times, once per role below,
  // which fragmented one coherent breakpoint concept into four
  // disconnected widgets; a version after that left every margin field
  // single-tier and sitting outside the tabs entirely, which visually
  // read as tab-scoped but wasn't — changing a margin value while one
  // tab was open silently "leaked" onto every other tab, since it was
  // really one shared field the whole time). Margin is now a real
  // per-tier field exactly like padding — every field below is properly
  // scoped to the tab it renders under, so no value can ever leak across
  // tabs. Each tab groups its own tier's fields by which element they
  // affect (row title, row description, the component's own outer box,
  // the lead-in description) — same device-size tab primitive
  // AbstractPostDockLayoutConfig's own minimalMode content-padding tabs
  // use, `kind: 'group'` nested inside each tab exactly as
  // `ConfigFieldTabs`'s own doc comment (components/Panel/config/
  // types.ts) describes.
  {
    kind: 'tabs',
    tabs: [
      {
        id: 'all',
        label: 'ALL SIZES',
        fields: [
          {
            kind: 'number',
            key: 'hoverMarkerOpacity',
            label: 'Hover marker opacity',
            description: 'Opacity the hovered row\'s own marker rises to during pointer hover, once "Hover delay" elapses. One value applies at every breakpoint.',
            min: 0,
            max: 1,
            step: 0.01,
          },
        ],
      },
      {
        id: 'mobile',
        label: 'MOBILE (< 768px)',
        fields: [
          {
            kind: 'group',
            label: 'Row title',
            fields: [
              { kind: 'select', key: 'rowTitlePaddingTopClassName', label: 'Padding top', options: PADDING_TOP_OPTIONS },
              { kind: 'select', key: 'rowTitlePaddingRightClassName', label: 'Padding right', options: PADDING_RIGHT_OPTIONS },
              { kind: 'select', key: 'rowTitlePaddingBottomClassName', label: 'Padding bottom', options: PADDING_BOTTOM_OPTIONS },
              { kind: 'select', key: 'rowTitlePaddingLeftClassName', label: 'Padding left', options: PADDING_LEFT_OPTIONS },
              { kind: 'select', key: 'rowTitleMarginTopClassName', label: 'Margin top', options: MARGIN_TOP_OPTIONS },
              { kind: 'select', key: 'rowTitleMarginRightClassName', label: 'Margin right', options: MARGIN_RIGHT_OPTIONS },
              { kind: 'select', key: 'rowTitleMarginBottomClassName', label: 'Margin bottom', options: MARGIN_BOTTOM_OPTIONS },
              { kind: 'select', key: 'rowTitleMarginLeftClassName', label: 'Margin left', options: MARGIN_LEFT_OPTIONS },
            ],
          },
          {
            kind: 'group',
            label: 'Row description',
            fields: [
              { kind: 'select', key: 'rowDescriptionPaddingTopClassName', label: 'Padding top', options: PADDING_TOP_OPTIONS },
              { kind: 'select', key: 'rowDescriptionPaddingRightClassName', label: 'Padding right', options: PADDING_RIGHT_OPTIONS },
              { kind: 'select', key: 'rowDescriptionPaddingBottomClassName', label: 'Padding bottom', options: PADDING_BOTTOM_OPTIONS },
              { kind: 'select', key: 'rowDescriptionPaddingLeftClassName', label: 'Padding left', options: PADDING_LEFT_OPTIONS },
              { kind: 'select', key: 'rowDescriptionMarginTopClassName', label: 'Margin top', options: MARGIN_TOP_OPTIONS },
              { kind: 'select', key: 'rowDescriptionMarginRightClassName', label: 'Margin right', options: MARGIN_RIGHT_OPTIONS },
              { kind: 'select', key: 'rowDescriptionMarginBottomClassName', label: 'Margin bottom', options: MARGIN_BOTTOM_OPTIONS },
              { kind: 'select', key: 'rowDescriptionMarginLeftClassName', label: 'Margin left', options: MARGIN_LEFT_OPTIONS },
            ],
          },
          {
            kind: 'group',
            label: 'Component',
            fields: [
              { kind: 'select', key: 'paddingTopClassName', label: 'Padding top', options: PADDING_TOP_OPTIONS },
              { kind: 'select', key: 'paddingRightClassName', label: 'Padding right', options: PADDING_RIGHT_OPTIONS },
              { kind: 'select', key: 'paddingBottomClassName', label: 'Padding bottom', options: PADDING_BOTTOM_OPTIONS },
              { kind: 'select', key: 'paddingLeftClassName', label: 'Padding left', options: PADDING_LEFT_OPTIONS },
              { kind: 'select', key: 'marginTopClassName', label: 'Margin top', options: MARGIN_TOP_OPTIONS },
              { kind: 'select', key: 'marginRightClassName', label: 'Margin right', options: MARGIN_RIGHT_OPTIONS },
              { kind: 'select', key: 'marginBottomClassName', label: 'Margin bottom', options: MARGIN_BOTTOM_OPTIONS },
              { kind: 'select', key: 'marginLeftClassName', label: 'Margin left', options: MARGIN_LEFT_OPTIONS },
            ],
          },
          {
            kind: 'group',
            label: 'Description',
            fields: [
              { kind: 'select', key: 'descriptionPaddingTopClassName', label: 'Padding top', options: PADDING_TOP_OPTIONS },
              { kind: 'select', key: 'descriptionPaddingRightClassName', label: 'Padding right', options: PADDING_RIGHT_OPTIONS },
              { kind: 'select', key: 'descriptionPaddingBottomClassName', label: 'Padding bottom', options: PADDING_BOTTOM_OPTIONS },
              { kind: 'select', key: 'descriptionPaddingLeftClassName', label: 'Padding left', options: PADDING_LEFT_OPTIONS },
              { kind: 'select', key: 'descriptionMarginTopClassName', label: 'Margin top', options: MARGIN_TOP_OPTIONS },
              { kind: 'select', key: 'descriptionMarginRightClassName', label: 'Margin right', options: MARGIN_RIGHT_OPTIONS },
              { kind: 'select', key: 'descriptionMarginBottomClassName', label: 'Margin bottom', options: MARGIN_BOTTOM_OPTIONS },
              { kind: 'select', key: 'descriptionMarginLeftClassName', label: 'Margin left', options: MARGIN_LEFT_OPTIONS },
            ],
          },
        ],
      },
      {
        id: 'tablet',
        label: 'TABLET (≥ 768px)',
        fields: [
          {
            kind: 'group',
            label: 'Row title',
            fields: [
              { kind: 'select', key: 'rowTitlePaddingTopWideClassName', label: 'Padding top', options: PADDING_TOP_WIDE_OPTIONS },
              { kind: 'select', key: 'rowTitlePaddingRightWideClassName', label: 'Padding right', options: PADDING_RIGHT_WIDE_OPTIONS },
              { kind: 'select', key: 'rowTitlePaddingBottomWideClassName', label: 'Padding bottom', options: PADDING_BOTTOM_WIDE_OPTIONS },
              { kind: 'select', key: 'rowTitlePaddingLeftWideClassName', label: 'Padding left', options: PADDING_LEFT_WIDE_OPTIONS },
              { kind: 'select', key: 'rowTitleMarginTopWideClassName', label: 'Margin top', options: MARGIN_TOP_WIDE_OPTIONS },
              { kind: 'select', key: 'rowTitleMarginRightWideClassName', label: 'Margin right', options: MARGIN_RIGHT_WIDE_OPTIONS },
              { kind: 'select', key: 'rowTitleMarginBottomWideClassName', label: 'Margin bottom', options: MARGIN_BOTTOM_WIDE_OPTIONS },
              { kind: 'select', key: 'rowTitleMarginLeftWideClassName', label: 'Margin left', options: MARGIN_LEFT_WIDE_OPTIONS },
            ],
          },
          {
            kind: 'group',
            label: 'Row description',
            fields: [
              { kind: 'select', key: 'rowDescriptionPaddingTopWideClassName', label: 'Padding top', options: PADDING_TOP_WIDE_OPTIONS },
              { kind: 'select', key: 'rowDescriptionPaddingRightWideClassName', label: 'Padding right', options: PADDING_RIGHT_WIDE_OPTIONS },
              { kind: 'select', key: 'rowDescriptionPaddingBottomWideClassName', label: 'Padding bottom', options: PADDING_BOTTOM_WIDE_OPTIONS },
              { kind: 'select', key: 'rowDescriptionPaddingLeftWideClassName', label: 'Padding left', options: PADDING_LEFT_WIDE_OPTIONS },
              { kind: 'select', key: 'rowDescriptionMarginTopWideClassName', label: 'Margin top', options: MARGIN_TOP_WIDE_OPTIONS },
              { kind: 'select', key: 'rowDescriptionMarginRightWideClassName', label: 'Margin right', options: MARGIN_RIGHT_WIDE_OPTIONS },
              { kind: 'select', key: 'rowDescriptionMarginBottomWideClassName', label: 'Margin bottom', options: MARGIN_BOTTOM_WIDE_OPTIONS },
              { kind: 'select', key: 'rowDescriptionMarginLeftWideClassName', label: 'Margin left', options: MARGIN_LEFT_WIDE_OPTIONS },
            ],
          },
          {
            kind: 'group',
            label: 'Component',
            fields: [
              { kind: 'select', key: 'paddingTopWideClassName', label: 'Padding top', options: PADDING_TOP_WIDE_OPTIONS },
              { kind: 'select', key: 'paddingRightWideClassName', label: 'Padding right', options: PADDING_RIGHT_WIDE_OPTIONS },
              { kind: 'select', key: 'paddingBottomWideClassName', label: 'Padding bottom', options: PADDING_BOTTOM_WIDE_OPTIONS },
              { kind: 'select', key: 'paddingLeftWideClassName', label: 'Padding left', options: PADDING_LEFT_WIDE_OPTIONS },
              { kind: 'select', key: 'marginTopWideClassName', label: 'Margin top', options: MARGIN_TOP_WIDE_OPTIONS },
              { kind: 'select', key: 'marginRightWideClassName', label: 'Margin right', options: MARGIN_RIGHT_WIDE_OPTIONS },
              { kind: 'select', key: 'marginBottomWideClassName', label: 'Margin bottom', options: MARGIN_BOTTOM_WIDE_OPTIONS },
              { kind: 'select', key: 'marginLeftWideClassName', label: 'Margin left', options: MARGIN_LEFT_WIDE_OPTIONS },
            ],
          },
          {
            kind: 'group',
            label: 'Description',
            fields: [
              { kind: 'select', key: 'descriptionPaddingTopWideClassName', label: 'Padding top', options: PADDING_TOP_WIDE_OPTIONS },
              { kind: 'select', key: 'descriptionPaddingRightWideClassName', label: 'Padding right', options: PADDING_RIGHT_WIDE_OPTIONS },
              { kind: 'select', key: 'descriptionPaddingBottomWideClassName', label: 'Padding bottom', options: PADDING_BOTTOM_WIDE_OPTIONS },
              { kind: 'select', key: 'descriptionPaddingLeftWideClassName', label: 'Padding left', options: PADDING_LEFT_WIDE_OPTIONS },
              { kind: 'select', key: 'descriptionMarginTopWideClassName', label: 'Margin top', options: MARGIN_TOP_WIDE_OPTIONS },
              { kind: 'select', key: 'descriptionMarginRightWideClassName', label: 'Margin right', options: MARGIN_RIGHT_WIDE_OPTIONS },
              { kind: 'select', key: 'descriptionMarginBottomWideClassName', label: 'Margin bottom', options: MARGIN_BOTTOM_WIDE_OPTIONS },
              { kind: 'select', key: 'descriptionMarginLeftWideClassName', label: 'Margin left', options: MARGIN_LEFT_WIDE_OPTIONS },
            ],
          },
        ],
      },
      {
        id: 'desktop',
        label: 'DESKTOP (≥ 1024px)',
        fields: [
          {
            kind: 'group',
            label: 'Row title',
            fields: [
              { kind: 'select', key: 'rowTitlePaddingTopLgClassName', label: 'Padding top', options: PADDING_TOP_LG_OPTIONS },
              { kind: 'select', key: 'rowTitlePaddingRightLgClassName', label: 'Padding right', options: PADDING_RIGHT_LG_OPTIONS },
              { kind: 'select', key: 'rowTitlePaddingBottomLgClassName', label: 'Padding bottom', options: PADDING_BOTTOM_LG_OPTIONS },
              { kind: 'select', key: 'rowTitlePaddingLeftLgClassName', label: 'Padding left', options: PADDING_LEFT_LG_OPTIONS },
              { kind: 'select', key: 'rowTitleMarginTopLgClassName', label: 'Margin top', options: MARGIN_TOP_LG_OPTIONS },
              { kind: 'select', key: 'rowTitleMarginRightLgClassName', label: 'Margin right', options: MARGIN_RIGHT_LG_OPTIONS },
              { kind: 'select', key: 'rowTitleMarginBottomLgClassName', label: 'Margin bottom', options: MARGIN_BOTTOM_LG_OPTIONS },
              { kind: 'select', key: 'rowTitleMarginLeftLgClassName', label: 'Margin left', options: MARGIN_LEFT_LG_OPTIONS },
            ],
          },
          {
            kind: 'group',
            label: 'Row description',
            fields: [
              { kind: 'select', key: 'rowDescriptionPaddingTopLgClassName', label: 'Padding top', options: PADDING_TOP_LG_OPTIONS },
              { kind: 'select', key: 'rowDescriptionPaddingRightLgClassName', label: 'Padding right', options: PADDING_RIGHT_LG_OPTIONS },
              { kind: 'select', key: 'rowDescriptionPaddingBottomLgClassName', label: 'Padding bottom', options: PADDING_BOTTOM_LG_OPTIONS },
              { kind: 'select', key: 'rowDescriptionPaddingLeftLgClassName', label: 'Padding left', options: PADDING_LEFT_LG_OPTIONS },
              { kind: 'select', key: 'rowDescriptionMarginTopLgClassName', label: 'Margin top', options: MARGIN_TOP_LG_OPTIONS },
              { kind: 'select', key: 'rowDescriptionMarginRightLgClassName', label: 'Margin right', options: MARGIN_RIGHT_LG_OPTIONS },
              { kind: 'select', key: 'rowDescriptionMarginBottomLgClassName', label: 'Margin bottom', options: MARGIN_BOTTOM_LG_OPTIONS },
              { kind: 'select', key: 'rowDescriptionMarginLeftLgClassName', label: 'Margin left', options: MARGIN_LEFT_LG_OPTIONS },
            ],
          },
          {
            kind: 'group',
            label: 'Component',
            fields: [
              { kind: 'select', key: 'paddingTopLgClassName', label: 'Padding top', options: PADDING_TOP_LG_OPTIONS },
              { kind: 'select', key: 'paddingRightLgClassName', label: 'Padding right', options: PADDING_RIGHT_LG_OPTIONS },
              { kind: 'select', key: 'paddingBottomLgClassName', label: 'Padding bottom', options: PADDING_BOTTOM_LG_OPTIONS },
              { kind: 'select', key: 'paddingLeftLgClassName', label: 'Padding left', options: PADDING_LEFT_LG_OPTIONS },
              { kind: 'select', key: 'marginTopLgClassName', label: 'Margin top', options: MARGIN_TOP_LG_OPTIONS },
              { kind: 'select', key: 'marginRightLgClassName', label: 'Margin right', options: MARGIN_RIGHT_LG_OPTIONS },
              { kind: 'select', key: 'marginBottomLgClassName', label: 'Margin bottom', options: MARGIN_BOTTOM_LG_OPTIONS },
              { kind: 'select', key: 'marginLeftLgClassName', label: 'Margin left', options: MARGIN_LEFT_LG_OPTIONS },
            ],
          },
          {
            kind: 'group',
            label: 'Description',
            fields: [
              { kind: 'select', key: 'descriptionPaddingTopLgClassName', label: 'Padding top', options: PADDING_TOP_LG_OPTIONS },
              { kind: 'select', key: 'descriptionPaddingRightLgClassName', label: 'Padding right', options: PADDING_RIGHT_LG_OPTIONS },
              { kind: 'select', key: 'descriptionPaddingBottomLgClassName', label: 'Padding bottom', options: PADDING_BOTTOM_LG_OPTIONS },
              { kind: 'select', key: 'descriptionPaddingLeftLgClassName', label: 'Padding left', options: PADDING_LEFT_LG_OPTIONS },
              { kind: 'select', key: 'descriptionMarginTopLgClassName', label: 'Margin top', options: MARGIN_TOP_LG_OPTIONS },
              { kind: 'select', key: 'descriptionMarginRightLgClassName', label: 'Margin right', options: MARGIN_RIGHT_LG_OPTIONS },
              { kind: 'select', key: 'descriptionMarginBottomLgClassName', label: 'Margin bottom', options: MARGIN_BOTTOM_LG_OPTIONS },
              { kind: 'select', key: 'descriptionMarginLeftLgClassName', label: 'Margin left', options: MARGIN_LEFT_LG_OPTIONS },
            ],
          },
        ],
      },
    ],
  },
  {
    kind: 'select',
    key: 'descriptionFontSizeClassName',
    label: 'Description font size',
    options: FONT_SIZE_OPTIONS,
  },
  {
    kind: 'number',
    key: 'descriptionOpacity',
    label: 'Description opacity',
    description: 'Opacity of the lead-in description text above the rows — this element has no active/inactive state.',
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    kind: 'number',
    key: 'descriptionMinContrast',
    label: 'Description minimum contrast',
    description: 'WCAG contrast ratio the description text must clear against the column\'s own resolved background color.',
    min: 1,
    max: 21,
    step: 0.1,
  },
  {
    kind: 'number',
    key: 'transitionDurationMs',
    label: 'Transition duration',
    description: 'Marker fill and row-text opacity transition as the active row changes.',
    min: 0,
    max: 1000,
    step: 10,
    unit: 'ms',
    integer: true,
  },
  {
    kind: 'enum',
    key: 'transitionEasing',
    label: 'Transition easing',
    options: MOTION_EASING_OPTIONS,
  },
];

export const ABOUT_TIMELINE_PANEL = defineConfigScope<AboutTimelineConfig>({
  id: ABOUT_TIMELINE_SCOPE_ID,
  component: 'AboutTimeline',
  scope: 'appearance',
  title: 'Timeline',
  createdAt: '2026-08-30',
  summary: 'Left-column career timeline — row gap, marker, rule, alignment, description',
  defaultOpen: false,
  defaultValue: DEFAULT_ABOUT_TIMELINE_CONFIG,
  fields: ABOUT_TIMELINE_PANEL_FIELDS,
  copy: {
    targetFile: 'experiences/about/components/AboutTimeline.config.ts',
    targetSymbol: 'DEFAULT_ABOUT_TIMELINE_CONFIG',
    targetType: 'AboutTimelineConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});
