import React, {
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { DEFAULT_CTA_BUTTON_CONFIG, type CtaButtonConfig } from './CtaButton/config/registered';
import { DEFAULT_PAGE_SURFACE_CONFIG, type PageSurfaceConfig } from './PageSurface.config';
import { DEFAULT_PAGE_TITLE_CONFIG, type PageTitleConfig } from './PageTitle.config';
import { DEFAULT_BODY_TEXT_CONFIG, type BodyTextConfig } from './BodyText.config';
import {
  DEFAULT_EDITORIAL_SECTION_CONFIG,
  type EditorialSectionConfig,
} from './EditorialSection.config';
import {
  DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG,
  type GlobalTypographyConfig,
} from './GlobalTypography.config';
import { DEFAULT_LAYOUT_DEBUG_CONFIG, type LayoutDebugConfig } from './LayoutDebug.config';

/**
 * Every page/experience that renders one of these shared components used to
 * hold its own independent `useState` for the same scope — abstract.tsx,
 * contact.tsx, and now about.tsx/design-system.tsx all started from the same
 * *default values*, but tuning one page's panel never reached any other
 * page, defeating the point of a shared, centrally-tunable design system.
 *
 * This one Context (mounted once in pages/_app.tsx, see its own comment)
 * holds the live state for every genuinely cross-page scope instead. A page
 * still keeps its own local `useState` for anything that is genuinely
 * page-local (e.g. ContactExperienceConfig, an about.tsx-specific
 * EditorialSection instance's own copy) — only the scopes below, which are
 * meant to look identical everywhere, move here.
 *
 * Deliberately the smallest viable mechanism: plain React Context + useState,
 * zero new dependencies, matches this codebase's existing all-hooks style.
 * See the design-system normalization plan for why Zustand/Jotai weren't
 * justified for what's still a small, dev-only set of tunable scopes — this
 * can be swapped for one later if the shared-state surface grows much larger
 * or needs cross-tab sync.
 */
type SharedDesignConfigState = {
  pageSurfaceConfig: PageSurfaceConfig;
  setPageSurfaceConfig: Dispatch<SetStateAction<PageSurfaceConfig>>;
  ctaButtonConfig: CtaButtonConfig;
  setCtaButtonConfig: Dispatch<SetStateAction<CtaButtonConfig>>;
  pageTitleConfig: PageTitleConfig;
  setPageTitleConfig: Dispatch<SetStateAction<PageTitleConfig>>;
  bodyTextConfig: BodyTextConfig;
  setBodyTextConfig: Dispatch<SetStateAction<BodyTextConfig>>;
  editorialSectionConfig: EditorialSectionConfig;
  setEditorialSectionConfig: Dispatch<SetStateAction<EditorialSectionConfig>>;
  globalTypographyConfig: GlobalTypographyConfig;
  setGlobalTypographyConfig: Dispatch<SetStateAction<GlobalTypographyConfig>>;
  layoutDebugConfig: LayoutDebugConfig;
  setLayoutDebugConfig: Dispatch<SetStateAction<LayoutDebugConfig>>;
};

const SharedDesignConfigContext = createContext<SharedDesignConfigState | null>(null);

export function SharedDesignConfigProvider({ children }: { children: ReactNode }) {
  const [pageSurfaceConfig, setPageSurfaceConfig] = useState<PageSurfaceConfig>(() => ({
    ...DEFAULT_PAGE_SURFACE_CONFIG,
  }));
  const [ctaButtonConfig, setCtaButtonConfig] = useState<CtaButtonConfig>(() => ({
    ...DEFAULT_CTA_BUTTON_CONFIG,
  }));
  const [pageTitleConfig, setPageTitleConfig] = useState<PageTitleConfig>(() => ({
    ...DEFAULT_PAGE_TITLE_CONFIG,
  }));
  const [bodyTextConfig, setBodyTextConfig] = useState<BodyTextConfig>(() => ({
    ...DEFAULT_BODY_TEXT_CONFIG,
  }));
  const [editorialSectionConfig, setEditorialSectionConfig] =
    useState<EditorialSectionConfig>(() => ({
      ...DEFAULT_EDITORIAL_SECTION_CONFIG,
    }));
  const [globalTypographyConfig, setGlobalTypographyConfig] =
    useState<GlobalTypographyConfig>(() => ({
      ...DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG,
    }));
  const [layoutDebugConfig, setLayoutDebugConfig] = useState<LayoutDebugConfig>(() => ({
    ...DEFAULT_LAYOUT_DEBUG_CONFIG,
  }));

  const value = useMemo<SharedDesignConfigState>(() => ({
    pageSurfaceConfig,
    setPageSurfaceConfig,
    ctaButtonConfig,
    setCtaButtonConfig,
    pageTitleConfig,
    setPageTitleConfig,
    bodyTextConfig,
    setBodyTextConfig,
    editorialSectionConfig,
    setEditorialSectionConfig,
    globalTypographyConfig,
    setGlobalTypographyConfig,
    layoutDebugConfig,
    setLayoutDebugConfig,
  }), [
    pageSurfaceConfig,
    ctaButtonConfig,
    pageTitleConfig,
    bodyTextConfig,
    editorialSectionConfig,
    globalTypographyConfig,
    layoutDebugConfig,
  ]);

  return (
    <SharedDesignConfigContext.Provider value={value}>
      {children}
    </SharedDesignConfigContext.Provider>
  );
}
/** Reads the shared, cross-page design-system config state. Must be rendered
 * under SharedDesignConfigProvider (mounted once in pages/_app.tsx). */
export function useSharedDesignConfig(): SharedDesignConfigState {
  const context = useContext(SharedDesignConfigContext);
  if (!context) {
    throw new Error('useSharedDesignConfig must be used within a SharedDesignConfigProvider');
  }
  return context;
}

/** PanelShell is also rendered by isolated tests and component previews that
 * intentionally sit outside the application provider. Those callers use the
 * authoritative PanelShell defaults; app-mounted shells consume the shared
 * instance through this optional reader. */
export function useOptionalSharedDesignConfig(): SharedDesignConfigState | null {
  return useContext(SharedDesignConfigContext);
}
