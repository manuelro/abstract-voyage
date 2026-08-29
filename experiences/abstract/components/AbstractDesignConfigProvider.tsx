import React, { createContext, useContext, useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';

import {
  DEFAULT_SITE_HEADER_CONFIG,
  type SiteHeaderConfig,
} from './SiteHeader/config/registered';
import {
  DEFAULT_WORDMARK_CONFIG,
  type WordmarkConfig,
} from './SiteHeader/config/wordmark';

type AbstractDesignConfigState = {
  siteHeaderConfig: SiteHeaderConfig;
  setSiteHeaderConfig: Dispatch<SetStateAction<SiteHeaderConfig>>;
  /** The wordmark's own color/adaptive/intro-animation config — one shared
   * instance every Abstract-family page reads from, the same mechanism
   * siteHeaderConfig above already uses. This is what gives /about and
   * /abstract genuine wordmark parity: both bind the exact same live state,
   * not just the same default value independently seeded per page (see
   * WordmarkConfig's own doc comment for the bug this fixes). */
  wordmarkConfig: WordmarkConfig;
  setWordmarkConfig: Dispatch<SetStateAction<WordmarkConfig>>;
};

const AbstractDesignConfigContext = createContext<AbstractDesignConfigState | null>(null);

/** Owns live design state that is shared by Abstract pages, but not by other experiences. */
export function AbstractDesignConfigProvider({ children }: { children: ReactNode }) {
  const [siteHeaderConfig, setSiteHeaderConfig] = useState<SiteHeaderConfig>(() => ({
    ...DEFAULT_SITE_HEADER_CONFIG,
  }));
  const [wordmarkConfig, setWordmarkConfig] = useState<WordmarkConfig>(() => ({
    ...DEFAULT_WORDMARK_CONFIG,
  }));

  const value = useMemo<AbstractDesignConfigState>(() => ({
    siteHeaderConfig,
    setSiteHeaderConfig,
    wordmarkConfig,
    setWordmarkConfig,
  }), [siteHeaderConfig, wordmarkConfig]);

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
