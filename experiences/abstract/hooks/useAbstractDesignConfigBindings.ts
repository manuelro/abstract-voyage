import { useMemo } from 'react';

import {
  createConfigScopeBinding,
  type ConfigScopeBinding,
} from '../../../components/Panel/config';
import { PAGE_SURFACE_APPEARANCE_PANEL } from '../../../components/PageSurface.panel';
import { CTA_BUTTON_APPEARANCE_PANEL } from '../../../components/CtaButton/config/panel';
import {
  normalizeCtaButtonConfig,
  withCtaButtonSize,
  withCtaButtonSizeDesktop,
  withComposerSize,
  withComposerSizeDesktop,
  type CtaButtonConfig,
} from '../../../components/CtaButton/config/registered';
import { GLOBAL_TYPOGRAPHY_APPEARANCE_PANEL } from '../../../components/GlobalTypography.panel';
import { LAYOUT_DEBUG_PANEL } from '../../../components/LayoutDebug.panel';
import { useSharedDesignConfig } from '../../../components/SharedDesignConfigProvider';
import { useAbstractDesignConfig } from '../components/AbstractDesignConfigProvider';
import { SITE_HEADER_COLORS_PANEL } from '../components/SiteHeader/config/panel';
import { WORDMARK_PANEL } from '../components/SiteHeader/config/wordmark.panel';
import { MOBILE_NAV_CUBE_PANEL } from '../components/MobileNavCube.panel';
import { FACE_E_TIMELINE_PANEL } from '../components/FaceETimeline.panel';

export type AbstractDesignConfigBindingKey =
  | 'pageSurface'
  | 'ctaButton'
  | 'siteHeader'
  | 'globalTypography'
  | 'layoutDebug'
  | 'wordmark'
  | 'mobileNavCube'
  | 'faceETimeline';

/** The shared scopes each Abstract page actually renders and may edit.
 * 'wordmark' is now bound on every page that renders SiteHeader
 * ('abstract'/'about'/'contact'/'postsLab') — see WordmarkConfig's own doc
 * comment for the parity bug this scope's consolidation fixes. */
export const ABSTRACT_DESIGN_CONFIG_BINDING_KEYS_BY_PAGE = {
  abstract: [
    'pageSurface',
    'ctaButton',
    'siteHeader',
    'globalTypography',
    'layoutDebug',
    'wordmark',
    'mobileNavCube',
    'faceETimeline',
  ],
  about: ['pageSurface', 'siteHeader', 'layoutDebug', 'wordmark'],
  contact: ['pageSurface', 'ctaButton', 'siteHeader', 'layoutDebug', 'wordmark'],
  postsLab: ['siteHeader', 'layoutDebug', 'wordmark'],
  // PLAN-CHIP-FILL-TEXT-INTERACTION-STATES.md Part A — journal.tsx already
  // reads pageSurfaceConfig (useSharedDesignConfig directly) and siteHeader/
  // wordmark (useAbstractDesignConfig, a separate context); globalTypography
  // was the one scope it never adopted, importing the static
  // DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG instead of this live value — meaning
  // tuning "Global typography" from any other page never reached journal's
  // own narrow/wide column ink. Scoped to exactly this one key; the other
  // two reads are pre-existing and not a known gap.
  journal: ['globalTypography'],
} as const satisfies Record<string, ReadonlyArray<AbstractDesignConfigBindingKey>>;

/**
 * Builds global config-panel bindings that apply to an Abstract page.
 * Caller order is preserved; PanelShell/appearance remains the universal
 * responsibility of useConfigPanelBindings.
 */
export function useAbstractDesignConfigBindings(
  keys: ReadonlyArray<AbstractDesignConfigBindingKey>,
): ReadonlyArray<ConfigScopeBinding> {
  const {
    pageSurfaceConfig,
    setPageSurfaceConfig,
    ctaButtonConfig,
    setCtaButtonConfig,
    globalTypographyConfig,
    setGlobalTypographyConfig,
    layoutDebugConfig,
    setLayoutDebugConfig,
    mobileNavCubeConfig,
    setMobileNavCubeConfig,
    faceETimelineConfig,
    setFaceETimelineConfig,
  } = useSharedDesignConfig();
  const {
    siteHeaderConfig, setSiteHeaderConfig, wordmarkConfig, setWordmarkConfig,
  } = useAbstractDesignConfig();

  return useMemo(() => {
    if (process.env.NODE_ENV !== 'production' && new Set(keys).size !== keys.length) {
      throw new Error('Abstract design config binding keys must be unique');
    }

    return keys.map((key): ConfigScopeBinding => {
      switch (key) {
        case 'pageSurface':
          return createConfigScopeBinding({
            definition: PAGE_SURFACE_APPEARANCE_PANEL,
            value: pageSurfaceConfig,
            onChange: setPageSurfaceConfig,
            global: true,
          });
        case 'ctaButton':
          return createConfigScopeBinding({
            definition: CTA_BUTTON_APPEARANCE_PANEL,
            value: ctaButtonConfig,
            // updateField/updateFields (binding.ts) spread the change onto
            // the already-fully-materialized ctaButtonConfig, so every
            // size-bound key (fontSize/paddingX/.../minWidthPx, and their
            // sizeDesktop/*Desktop tier counterparts — plus the composer's
            // own parallel composerSize/composerFontSize/... bundle) is
            // always "explicitly present" from normalizeCtaButtonConfig's
            // point of view even though nobody but the Size preset actually
            // set it — picking a new Button size OR Composer size (either
            // tab, either bundle) would otherwise silently keep the old
            // size's stale values. withCtaButtonSize/withCtaButtonSizeDesktop/
            // withComposerSize/withComposerSizeDesktop each strip exactly
            // their own changed tier's keys so its preset can resolve them
            // again; any combination can fire in the same change if a caller
            // ever sets more than one at once via updateFields.
            onChange: next => setCtaButtonConfig((prev) => {
              const sizeChanged = next.size !== prev.size;
              const sizeDesktopChanged = next.sizeDesktop !== prev.sizeDesktop;
              const composerSizeChanged = next.composerSize !== prev.composerSize;
              const composerSizeDesktopChanged = next.composerSizeDesktop !== prev.composerSizeDesktop;
              if (!sizeChanged && !sizeDesktopChanged && !composerSizeChanged && !composerSizeDesktopChanged) {
                return next;
              }
              let patched: Partial<CtaButtonConfig> = next;
              if (sizeChanged) patched = withCtaButtonSize(patched, next.size);
              if (sizeDesktopChanged) patched = withCtaButtonSizeDesktop(patched, next.sizeDesktop);
              if (composerSizeChanged) patched = withComposerSize(patched, next.composerSize);
              if (composerSizeDesktopChanged) {
                patched = withComposerSizeDesktop(patched, next.composerSizeDesktop);
              }
              return normalizeCtaButtonConfig(patched);
            }),
            global: true,
          });
        case 'siteHeader':
          return createConfigScopeBinding({
            definition: SITE_HEADER_COLORS_PANEL,
            value: siteHeaderConfig,
            onChange: setSiteHeaderConfig,
            global: true,
          });
        case 'globalTypography':
          return createConfigScopeBinding({
            definition: GLOBAL_TYPOGRAPHY_APPEARANCE_PANEL,
            value: globalTypographyConfig,
            onChange: setGlobalTypographyConfig,
            global: true,
          });
        case 'layoutDebug':
          return createConfigScopeBinding({
            definition: LAYOUT_DEBUG_PANEL,
            value: layoutDebugConfig,
            onChange: setLayoutDebugConfig,
            global: true,
          });
        case 'wordmark':
          return createConfigScopeBinding({
            definition: WORDMARK_PANEL,
            value: wordmarkConfig,
            onChange: setWordmarkConfig,
            global: true,
          });
        case 'mobileNavCube':
          return createConfigScopeBinding({
            definition: MOBILE_NAV_CUBE_PANEL,
            value: mobileNavCubeConfig,
            onChange: setMobileNavCubeConfig,
            global: true,
          });
        case 'faceETimeline':
          return createConfigScopeBinding({
            definition: FACE_E_TIMELINE_PANEL,
            value: faceETimelineConfig,
            onChange: setFaceETimelineConfig,
            global: true,
          });
      }
    });
  }, [
    keys,
    pageSurfaceConfig,
    setPageSurfaceConfig,
    ctaButtonConfig,
    setCtaButtonConfig,
    siteHeaderConfig,
    setSiteHeaderConfig,
    globalTypographyConfig,
    setGlobalTypographyConfig,
    layoutDebugConfig,
    setLayoutDebugConfig,
    wordmarkConfig,
    setWordmarkConfig,
    mobileNavCubeConfig,
    setMobileNavCubeConfig,
    faceETimelineConfig,
    setFaceETimelineConfig,
  ]);
}
