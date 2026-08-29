import { useMemo } from 'react';

import {
  createConfigScopeBinding,
  type ConfigScopeBinding,
} from '../../../components/Panel/config';
import { PAGE_SURFACE_APPEARANCE_PANEL } from '../../../components/PageSurface.panel';
import { CTA_BUTTON_APPEARANCE_PANEL } from '../../../components/CtaButton/config/panel';
import { GLOBAL_TYPOGRAPHY_APPEARANCE_PANEL } from '../../../components/GlobalTypography.panel';
import { LAYOUT_DEBUG_PANEL } from '../../../components/LayoutDebug.panel';
import { useSharedDesignConfig } from '../../../components/SharedDesignConfigProvider';
import { useAbstractDesignConfig } from '../components/AbstractDesignConfigProvider';
import { SITE_HEADER_COLORS_PANEL } from '../components/SiteHeader/config/panel';
import { WORDMARK_PANEL } from '../components/SiteHeader/config/wordmark.panel';

export type AbstractDesignConfigBindingKey =
  | 'pageSurface'
  | 'ctaButton'
  | 'siteHeader'
  | 'globalTypography'
  | 'layoutDebug'
  | 'wordmark';

/** The shared scopes each Abstract page actually renders and may edit.
 * 'wordmark' is now bound on every page that renders SiteHeader
 * ('abstract'/'about'/'contact'/'postsLab') — see WordmarkConfig's own doc
 * comment for the parity bug this scope's consolidation fixes. */
export const ABSTRACT_DESIGN_CONFIG_BINDING_KEYS_BY_PAGE = {
  abstract: ['pageSurface', 'ctaButton', 'siteHeader', 'globalTypography', 'layoutDebug', 'wordmark'],
  about: ['pageSurface', 'siteHeader', 'layoutDebug', 'wordmark'],
  contact: ['pageSurface', 'ctaButton', 'siteHeader', 'layoutDebug', 'wordmark'],
  postsLab: ['siteHeader', 'layoutDebug', 'wordmark'],
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
            onChange: setCtaButtonConfig,
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
  ]);
}
