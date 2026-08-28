'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Orientation-only hover bridge between a config panel's own field controls
 * and LayoutDebug.tsx's own overlay boxes — two separate React subtrees
 * (the panel and the page content) that share this page-mounted provider as
 * their nearest common ancestor instead of prop-drilling or reaching into
 * SharedDesignConfigProvider (that provider is for persisted/exportable
 * config values; this is transient interaction state with no default to
 * validate, so it doesn't belong in the defineConfigScope machinery).
 *
 * `hoveredIds` holds the LayoutDebugOverlay `label` string(s) (see that
 * component's own doc comment) the currently-hovered field's own
 * `debugHighlightIds` names — empty means "no field hovered," which is the
 * steady state almost always in effect. A field with no `debugHighlightIds`
 * never touches this at all.
 */
type LayoutDebugHighlightContextValue = {
  hoveredIds: ReadonlyArray<string>;
  setHoveredIds: (ids: ReadonlyArray<string>) => void;
};

const LayoutDebugHighlightContext = createContext<LayoutDebugHighlightContextValue | null>(null);

const EMPTY_IDS: ReadonlyArray<string> = [];

export function LayoutDebugHighlightProvider({ children }: { children: ReactNode }) {
  const [hoveredIds, setHoveredIds] = useState<ReadonlyArray<string>>(EMPTY_IDS);
  const value = useMemo(() => ({ hoveredIds, setHoveredIds }), [hoveredIds]);
  return (
    <LayoutDebugHighlightContext.Provider value={value}>
      {children}
    </LayoutDebugHighlightContext.Provider>
  );
}

/** Returns null (never highlighted/dimmed) when no provider is mounted —
 * same graceful-degrade shape as useOptionalSharedDesignConfig, so
 * LayoutDebugOverlay can render on any page whether or not that page has
 * opted into this feature. */
export function useLayoutDebugHighlight(): LayoutDebugHighlightContextValue | null {
  return useContext(LayoutDebugHighlightContext);
}

export { EMPTY_IDS as EMPTY_LAYOUT_DEBUG_HIGHLIGHT_IDS };
