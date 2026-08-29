import { defineConfigScope } from '../../Panel/config';
import {
  DEFAULT_CTA_BUTTON_CONFIG,
  type CtaButtonConfig,
} from './registered';

export const CTA_BUTTON_APPEARANCE_SCOPE_ID = 'CtaButton/appearance' as const;

export const CTA_BUTTON_APPEARANCE_PANEL = defineConfigScope<CtaButtonConfig>({
  id: CTA_BUTTON_APPEARANCE_SCOPE_ID,
  component: 'CtaButton',
  scope: 'appearance',
  title: 'CTA button',
  createdAt: '2026-07-19',
  summary: 'Surface · gradient border · proximity motion · easing',
  defaultOpen: false,
  defaultValue: DEFAULT_CTA_BUTTON_CONFIG,
  fields: [
    {
      kind: 'group',
      label: 'Surface',
      fields: [
        {
          kind: 'enum',
          key: 'backgroundMode',
          label: 'Background',
          options: [
            { label: 'TRANSPARENT', value: 'transparent' },
            { label: 'SOLID', value: 'solid' },
            { label: 'GRADIENT', value: 'gradient' },
          ],
        },
        {
          kind: 'enum',
          key: 'backgroundColorMode',
          label: 'Background source',
          description: 'Auto derives from the surfaceColor prop; Custom uses the color below.',
          options: [
            { label: 'AUTO', value: 'auto' },
            { label: 'CUSTOM', value: 'custom' },
          ],
          visibleWhen: config => config.backgroundMode === 'solid',
        },
        {
          kind: 'color',
          key: 'backgroundColor',
          label: 'Background color',
          visibleWhen: config => config.backgroundMode === 'solid' && config.backgroundColorMode === 'custom',
        },
        {
          kind: 'enum',
          key: 'textColorMode',
          label: 'Text source',
          description: 'Auto picks a darker or brighter tint of surfaceColor for contrast; Custom uses the color below.',
          options: [
            { label: 'AUTO', value: 'auto' },
            { label: 'CUSTOM', value: 'custom' },
          ],
        },
        {
          kind: 'color',
          key: 'textColor',
          label: 'Text color',
          visibleWhen: config => config.textColorMode === 'custom',
        },
        {
          kind: 'enum',
          key: 'radius',
          label: 'Radius',
          description: 'Uses Tailwind radius tokens.',
          options: [
            { label: 'none', value: 'rounded-none' },
            { label: 'md', value: 'rounded-md' },
            { label: 'lg', value: 'rounded-lg' },
            { label: 'xl', value: 'rounded-xl' },
            { label: '2xl', value: 'rounded-2xl' },
            { label: 'full', value: 'rounded-full' },
          ],
        },
      ],
    },
    {
      kind: 'group',
      label: 'Auto surface colors',
      fields: [
        {
          kind: 'number',
          key: 'autoBackgroundLightenAmount',
          label: 'Background lighten amount',
          description: 'How much lighter (positive) or darker (negative) than the surface the resting background is, while Background source is Auto. 0 renders the surface color verbatim.',
          min: -1,
          max: 1,
          step: 0.01,
          visibleWhen: config => config.backgroundColorMode === 'auto',
        },
        {
          kind: 'number',
          key: 'autoBorderLightenAmount',
          label: 'Border lighten amount',
          description: 'How much lighter (positive) or darker (negative) than the surface the resting border is, while Border source is Auto.',
          min: -1,
          max: 1,
          step: 0.01,
          visibleWhen: config => config.borderColorMode === 'auto',
        },
        {
          kind: 'number',
          key: 'autoBackgroundHoverLightenAmount',
          label: 'Background hover lighten amount',
          description: 'Additional lighten (positive) or darken (negative) applied to the background on hover, on top of whatever the resting background resolved to.',
          min: -1,
          max: 1,
          step: 0.01,
          visibleWhen: config => config.backgroundColorMode === 'auto',
        },
        {
          kind: 'number',
          key: 'autoBorderHoverLightenAmount',
          label: 'Border hover lighten amount',
          description: 'Additional lighten (positive) or darken (negative) applied to the border on hover, on top of whatever the resting border resolved to.',
          min: -1,
          max: 1,
          step: 0.01,
          visibleWhen: config => config.borderColorMode === 'auto',
        },
        {
          kind: 'number',
          key: 'autoTextMinContrast',
          label: 'Text minimum contrast',
          description: 'Minimum contrast ratio the auto-picked text tint must clear against the surface (decorative-button floor, below WCAG AA body-text 4.5).',
          min: 1,
          max: 21,
          step: 0.1,
          visibleWhen: config => config.textColorMode === 'auto',
        },
      ],
    },
    {
      kind: 'group',
      label: 'Size',
      fields: [
        {
          kind: 'enum',
          key: 'size',
          label: 'Size',
          description: 'Resolves a coherent font-size, padding, and min-height/width bundle (see CTA_BUTTON_SIZE_PRESETS). MD reproduces this component\'s original, only size.',
          options: [
            { label: 'SM', value: 'sm' },
            { label: 'MD', value: 'md' },
            { label: 'LG', value: 'lg' },
          ],
        },
      ],
    },
    {
      kind: 'group',
      label: 'Hover palette',
      fields: [
        {
          kind: 'boolean',
          key: 'hoverColorsEnabled',
          label: 'Override colors on hover',
          description: 'Crossfades gradient pixels into the configured hover palette.',
        },
        {
          kind: 'color',
          key: 'hoverBackgroundColor',
          label: 'Hover background',
          description: 'Only used while Background source is Custom — Auto lightens the resolved background automatically (see Auto surface colors below).',
          visibleWhen: config => config.hoverColorsEnabled && config.backgroundColorMode === 'custom',
        },
        {
          kind: 'color',
          key: 'hoverBorderColor',
          label: 'Hover border',
          description: 'Only used while Border source is Custom — Auto lightens the resolved border automatically (see Auto surface colors below).',
          visibleWhen: config => config.hoverColorsEnabled && config.borderColorMode === 'custom',
        },
        {
          kind: 'color',
          key: 'hoverTextColor',
          label: 'Hover text',
          description: 'Only used while Text source is Custom — Auto keeps the same text color on hover.',
          visibleWhen: config => config.hoverColorsEnabled && config.textColorMode === 'custom',
        },
      ],
    },
    {
      kind: 'group',
      label: 'Border',
      fields: [
        {
          kind: 'enum',
          key: 'borderMode',
          label: 'Border treatment',
          options: [
            { label: 'NONE', value: 'none' },
            { label: 'SOLID', value: 'solid' },
            { label: 'HEADING GRADIENT', value: 'gradient' },
          ],
        },
        {
          kind: 'enum',
          key: 'borderColorMode',
          label: 'Border source',
          description: 'Auto derives from the surfaceColor prop, lightened; Custom uses the color below.',
          options: [
            { label: 'AUTO', value: 'auto' },
            { label: 'CUSTOM', value: 'custom' },
          ],
          visibleWhen: config => config.borderMode === 'solid',
        },
        {
          kind: 'color',
          key: 'borderColor',
          label: 'Border color',
          visibleWhen: config => config.borderMode === 'solid' && config.borderColorMode === 'custom',
        },
        {
          kind: 'enum',
          key: 'borderWidth',
          label: 'Border width',
          description: 'Uses Tailwind border-width tokens.',
          options: [
            { label: 'border-0', value: 'border-0' },
            { label: 'border', value: 'border' },
            { label: 'border-2', value: 'border-2' },
            { label: 'border-4', value: 'border-4' },
          ],
        },
        {
          kind: 'number',
          key: 'gradientScale',
          label: 'Gradient scale',
          min: 1,
          max: 3,
          step: 0.05,
          unit: 'x',
          visibleWhen: config => config.borderMode === 'gradient' || config.backgroundMode === 'gradient',
        },
        {
          kind: 'number',
          key: 'gradientPanXPercent',
          label: 'Gradient horizontal position',
          min: 0,
          max: 100,
          step: 1,
          unit: '%',
          visibleWhen: config => config.borderMode === 'gradient' || config.backgroundMode === 'gradient',
        },
        {
          kind: 'number',
          key: 'gradientPanYPercent',
          label: 'Gradient vertical position',
          min: 0,
          max: 100,
          step: 1,
          unit: '%',
          visibleWhen: config => config.borderMode === 'gradient' || config.backgroundMode === 'gradient',
        },
      ],
    },
    {
      kind: 'group',
      label: 'Proximity response',
      fields: [
        { kind: 'number', key: 'proximityRadiusPx', label: 'Awareness radius', min: 80, max: 640, step: 8, unit: 'px', integer: true },
        {
          kind: 'enum',
          key: 'proximityEasing',
          label: 'Distance easing',
          options: [
            { label: 'LINEAR', value: 'linear' },
            { label: 'SMOOTHSTEP', value: 'smoothstep' },
            { label: 'SMOOTHERSTEP', value: 'smootherstep' },
            { label: 'EASE OUT CUBIC', value: 'ease-out-cubic' },
          ],
        },
        { kind: 'number', key: 'proximityAttackMs', label: 'Approach attack', min: 16, max: 600, step: 1, unit: 'ms', integer: true },
        { kind: 'number', key: 'proximityReleaseMs', label: 'Departure release', min: 16, max: 1000, step: 1, unit: 'ms', integer: true },
        { kind: 'number', key: 'proximityLiftPx', label: 'Maximum lift', min: 0, max: 24, step: 0.5, unit: 'px', description: 'Visual lift reached at hover elevation — see Elevation shadow engine below for the physical model this now drives.' },
        { kind: 'number', key: 'proximityScale', label: 'Maximum scale', min: 1, max: 1.08, step: 0.001, unit: 'x' },
      ],
    },
    {
      kind: 'group',
      label: 'Pointer tilt',
      fields: [
        {
          kind: 'boolean',
          key: 'tiltEnabled',
          label: 'Enable subtle 3D tilt',
          description: 'Responds to mouse and pen pointer position; touch and reduced-motion modes remain static.',
        },
        {
          kind: 'boolean',
          key: 'tiltYEnabled',
          label: 'Tilt on vertical (Y) axis',
          description: 'Also rotate toward/away from the pointer vertically (rotateX), not just left/right. Disable to keep the horizontal tilt only.',
          visibleWhen: config => config.tiltEnabled,
        },
        {
          kind: 'number',
          key: 'tiltMaxDegrees',
          label: 'Maximum tilt',
          min: 0,
          max: 10,
          step: 0.25,
          unit: 'deg',
          visibleWhen: config => config.tiltEnabled,
        },
        {
          kind: 'number',
          key: 'tiltPerspectivePx',
          label: 'Perspective depth',
          min: 320,
          max: 1600,
          step: 20,
          unit: 'px',
          integer: true,
          visibleWhen: config => config.tiltEnabled,
        },
        {
          kind: 'number',
          key: 'tiltResponseMs',
          label: 'Tilt response',
          min: 16,
          max: 500,
          step: 1,
          unit: 'ms',
          integer: true,
          visibleWhen: config => config.tiltEnabled,
        },
      ],
    },
    {
      kind: 'group',
      label: 'Pond-surface bounce',
      fields: [
        {
          kind: 'number',
          key: 'pressCompressPx',
          label: 'Press compress depth',
          description: 'How far below resting elevation a click dips while React to interaction (below) is off — this is what a click looks like instead of no reaction at all. Release settles back via the spring below, free to overshoot past resting before it settles.',
          min: 0,
          max: 40,
          step: 0.5,
          unit: 'px',
          visibleWhen: config => !config.elevationReactionEnabled,
        },
        {
          kind: 'number',
          key: 'pressBounceStiffness',
          label: 'Bounce stiffness',
          description: 'Spring stiffness for the release settle — higher snaps back faster and oscillates quicker.',
          min: 40,
          max: 600,
          step: 5,
          visibleWhen: config => !config.elevationReactionEnabled,
        },
        {
          kind: 'number',
          key: 'pressBounceDamping',
          label: 'Bounce damping',
          description: 'Spring damping for the release settle — higher decays the bounce faster (fewer visible oscillations); lower rings out longer.',
          min: 2,
          max: 60,
          step: 1,
          visibleWhen: config => !config.elevationReactionEnabled,
        },
      ],
    },
    {
      kind: 'group',
      label: 'Elevation shadow engine',
      fields: [
        {
          kind: 'boolean',
          key: 'shadowEngineEnabled',
          label: 'Enable elevation shadow engine',
          description: 'Physically-derived layered shadow (contact + near-field + projected) driven by one virtual elevation value. Disabled falls back to a static shadow.',
        },
      ],
    },
    {
      kind: 'group',
      label: 'Elevation',
      fields: [
        { kind: 'number', key: 'shadowElevationMinPx', label: 'Minimum elevation', min: 0, max: 8, step: 0.5, unit: 'px' },
        { kind: 'number', key: 'shadowElevationRestingPx', label: 'Resting elevation', min: 0, max: 20, step: 0.5, unit: 'px' },
        {
          kind: 'boolean',
          key: 'elevationReactionEnabled',
          label: 'React to interaction',
          description: 'Disable to pin elevation at Resting elevation for every interaction state — hover, press, and focus alike. The shadow engine still renders; it just never receives a different elevation. The focus-visible ring is unaffected and remains the accessibility indicator.',
        },
        {
          kind: 'number',
          key: 'shadowElevationHoverPx',
          label: 'Hover elevation',
          min: 0,
          max: 48,
          step: 0.5,
          unit: 'px',
          visibleWhen: config => config.elevationReactionEnabled,
        },
        {
          kind: 'number',
          key: 'shadowElevationFocusPx',
          label: 'Focus elevation',
          min: 2,
          max: 48,
          step: 0.5,
          unit: 'px',
          description: 'Focus-visible uses this (or the live hover blend, whichever is higher) — the ring below remains the primary focus indicator.',
          visibleWhen: config => config.elevationReactionEnabled,
        },
        {
          kind: 'number',
          key: 'shadowElevationPressedPx',
          label: 'Pressed elevation',
          min: 0,
          max: 16,
          step: 0.5,
          unit: 'px',
          visibleWhen: config => config.elevationReactionEnabled,
        },
        { kind: 'number', key: 'shadowElevationMaxPx', label: 'Maximum elevation', min: 12, max: 80, step: 1, unit: 'px', description: 'Ceiling for the development elevation override below.' },
      ],
    },
    {
      kind: 'group',
      label: 'Virtual light',
      fields: [
        { kind: 'number', key: 'shadowLightXPercent', label: 'Light horizontal position', min: 0, max: 100, step: 1, unit: '%', description: 'Page-relative; 50 = horizontally centered.' },
        { kind: 'number', key: 'shadowLightYPx', label: 'Light vertical position', min: -600, max: 200, step: 5, unit: 'px', description: 'Document-relative; negative sits above the top of the composition.' },
        { kind: 'number', key: 'shadowLightHeightPx', label: 'Light height', min: 24, max: 320, step: 2, unit: 'px', description: 'Virtual altitude above the receiving plane — governs how quickly displacement and softness grow with elevation.' },
        { kind: 'number', key: 'shadowLightRadiusPx', label: 'Light radius', min: 8, max: 320, step: 2, unit: 'px', description: 'Apparent size of the area light — the primary softness/penumbra control.' },
        { kind: 'number', key: 'shadowLightDirectIntensity', label: 'Direct intensity', min: 0, max: 4, step: 0.05, description: 'Relative to ambient intensity, controls shadow contrast.' },
        { kind: 'number', key: 'shadowLightAmbientIntensity', label: 'Ambient intensity', min: 0, max: 4, step: 0.05, description: 'Fills the shadowed area; higher reduces contrast.' },
      ],
    },
    {
      kind: 'group',
      label: 'Shadow response',
      fields: [
        { kind: 'number', key: 'shadowProjectedStrength', label: 'Projected strength', min: 0, max: 1, step: 0.01 },
        { kind: 'number', key: 'shadowProjectedFalloff', label: 'Projected density falloff', min: 0.2, max: 4, step: 0.05 },
        { kind: 'number', key: 'shadowContactStrength', label: 'Contact strength', min: 0, max: 1, step: 0.01 },
        { kind: 'number', key: 'shadowContactFalloff', label: 'Contact falloff', min: 0.2, max: 4, step: 0.05 },
        { kind: 'number', key: 'shadowContactDecayElevationPx', label: 'Contact decay elevation', min: 4, max: 80, step: 1, unit: 'px', description: 'Elevation at which the contact/ambient-occlusion term reaches zero.' },
        { kind: 'number', key: 'shadowNearFieldStrength', label: 'Near-field transition strength', min: 0, max: 1, step: 0.01 },
        { kind: 'number', key: 'shadowMaxBlurPx', label: 'Maximum blur', min: 8, max: 160, step: 2, unit: 'px' },
        { kind: 'number', key: 'shadowMaxDisplacementPx', label: 'Maximum displacement', min: 4, max: 100, step: 1, unit: 'px' },
        { kind: 'number', key: 'shadowMaxProjectedScale', label: 'Maximum projected scale', min: 1, max: 1.8, step: 0.01, unit: 'x' },
        { kind: 'color', key: 'shadowColor', label: 'Shadow color' },
      ],
    },
    {
      kind: 'group',
      label: 'Debug & development',
      fields: [
        {
          kind: 'boolean',
          key: 'shadowDebugMode',
          label: 'Debug overlay',
          description: 'Dev-only readout of light/CTA geometry, elevation, direction, offsets, penumbra, and density.',
        },
        {
          kind: 'boolean',
          key: 'shadowDevElevationOverrideEnabled',
          label: 'Force elevation (dev)',
          description: 'Overrides all interaction-driven elevation with a fixed value, for continuously inspecting the full range.',
        },
        {
          kind: 'number',
          key: 'shadowDevElevationOverridePx',
          label: 'Forced elevation',
          min: 0,
          max: 80,
          step: 0.5,
          unit: 'px',
          visibleWhen: config => config.shadowDevElevationOverrideEnabled,
        },
      ],
    },
    {
      kind: 'group',
      label: 'State easing',
      fields: [
        { kind: 'number', key: 'stateTransitionMs', label: 'Hover enter duration', min: 0, max: 600, step: 5, unit: 'ms', integer: true },
        {
          kind: 'enum',
          key: 'stateEasing',
          label: 'Hover enter easing',
          options: [
            { label: 'LINEAR', value: 'linear' },
            { label: 'STANDARD', value: 'standard' },
            { label: 'EXPRESSIVE', value: 'expressive' },
            { label: 'VISCOUS', value: 'viscous' },
            { label: 'GENTLE', value: 'gentle' },
          ],
        },
        { kind: 'number', key: 'stateExitTransitionMs', label: 'Hover exit duration', min: 0, max: 900, step: 5, unit: 'ms', integer: true },
        {
          kind: 'enum',
          key: 'stateExitEasing',
          label: 'Hover exit easing',
          options: [
            { label: 'LINEAR', value: 'linear' },
            { label: 'STANDARD', value: 'standard' },
            { label: 'EXPRESSIVE', value: 'expressive' },
            { label: 'VISCOUS', value: 'viscous' },
            { label: 'GENTLE', value: 'gentle' },
          ],
        },
        { kind: 'number', key: 'pressTransitionMs', label: 'Press duration', min: 0, max: 300, step: 5, unit: 'ms', integer: true },
        {
          kind: 'enum',
          key: 'pressEasing',
          label: 'Press easing',
          options: [
            { label: 'LINEAR', value: 'linear' },
            { label: 'STANDARD', value: 'standard' },
            { label: 'EXPRESSIVE', value: 'expressive' },
            { label: 'VISCOUS', value: 'viscous' },
            { label: 'GENTLE', value: 'gentle' },
          ],
        },
        {
          kind: 'number',
          key: 'colorTransitionRatio',
          label: 'Color transition ratio',
          description: 'Background/border/text color duration as a fraction of the hover enter/exit (scale + shadow) duration.',
          min: 0.05,
          max: 1,
          step: 0.02,
        },
        {
          kind: 'enum',
          key: 'colorEasing',
          label: 'Color easing',
          options: [
            { label: 'LINEAR', value: 'linear' },
            { label: 'STANDARD', value: 'standard' },
            { label: 'EXPRESSIVE', value: 'expressive' },
            { label: 'VISCOUS', value: 'viscous' },
            { label: 'GENTLE', value: 'gentle' },
            { label: 'GAUSSIAN', value: 'gaussian' },
          ],
        },
      ],
    },
  ],
  // These 5 remain real, tested config fields (explicit per-instance
  // overrides on top of whatever `size` resolves — see
  // normalizeCtaButtonConfig) plus the 2 that are purely size-preset-driven
  // (minHeightPx/minWidthPx, never had their own panel control even before
  // `size` existed) — just not rendered as their own controls now that
  // `size` is the single coherent knob for all of them together.
  hiddenKeys: [
    'fontSize', 'paddingX', 'paddingXDesktop', 'paddingY', 'paddingYDesktop',
    'minHeightPx', 'minWidthPx',
  ],
  // Named states worth their own generated Storybook story (see
  // components/Panel/config/generateStorybookStories.ts) rather than only
  // being reachable via the Playground's live Controls — each one is a
  // structurally distinct mode, not just a different value of a field the
  // Playground already covers. See AGENTS.md's "Storybook (SB8)
  // documentation automation" for what this list is and isn't for.
  documentedStates: [
    {
      name: 'PondBounce',
      description: 'elevationReactionEnabled: false — the click no longer '
        + 'eases directly to a pressed elevation; it dips below resting '
        + 'and settles back via a damped spring, free to overshoot past '
        + 'rest before it stops (see useCardLiftPhysics.ts\'s handlePress/'
        + 'handleRelease). A structurally different interaction, not a '
        + 'different value of an existing control.',
      value: { elevationReactionEnabled: false },
    },
    {
      name: 'GradientBorder',
      description: 'borderMode: gradient — the border is painted from a '
        + 'live canvas texture (paintGradientTextureSurface) rather than a '
        + 'flat CSS border-color, a structurally different rendering path. '
        + 'Requires a gradientSource decorator (see storybookDecorators.tsx) '
        + 'to render correctly; a static config value alone cannot supply '
        + 'the live texture.',
      value: { borderMode: 'gradient' },
    },
  ],
  copy: {
    targetFile: 'components/CtaButton/config/registered.ts',
    targetSymbol: 'DEFAULT_CTA_BUTTON_CONFIG',
    targetType: 'CtaButtonConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});
