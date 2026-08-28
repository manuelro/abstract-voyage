import React, { createContext, useContext, useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';

import {
  DEFAULT_SITE_HEADER_CONFIG,
  type SiteHeaderConfig,
} from './SiteHeader/config/registered';

type AbstractDesignConfigState = {
  siteHeaderConfig: SiteHeaderConfig;
  setSiteHeaderConfig: Dispatch<SetStateAction<SiteHeaderConfig>>;
};

const AbstractDesignConfigContext = createContext<AbstractDesignConfigState | null>(null);

/** Owns live design state that is shared by Abstract pages, but not by other experiences. */
export function AbstractDesignConfigProvider({ children }: { children: ReactNode }) {
  const [siteHeaderConfig, setSiteHeaderConfig] = useState<SiteHeaderConfig>(() => ({
    ...DEFAULT_SITE_HEADER_CONFIG,
  }));

  const value = useMemo<AbstractDesignConfigState>(() => ({
    siteHeaderConfig,
    setSiteHeaderConfig,
  }), [siteHeaderConfig]);

  return (
    <AbstractDesignConfigContext.Provider value={value}>
      {children}
    </AbstractDesignConfigContext.Provider>
  );
}

export function useAbstractDesignConfig(): AbstractDesignConfigState {
  const context = useContext(AbstractDesignConfigContext);
  if (!context) {
    throw new Error('useAbstractDesignConfig must be used within an AbstractDesignConfigProvider');
  }
  return context;
}
