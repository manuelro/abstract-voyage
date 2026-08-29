import { useState } from 'react';

/**
 * The one real implementation of "is this a non-production build, and is
 * this page's own settings panel currently open" — identical boilerplate
 * on every PolymorphicLayout-consuming page before this hook existed
 * (PLAN-DEDUPLICATE-PAGE-SHELL-LOGIC.md §5).
 */
export function useAuthoringToolsVisibility() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  return {
    showAuthoringTools: process.env.NODE_ENV !== 'production',
    isPanelOpen,
    setIsPanelOpen,
    togglePanel: () => setIsPanelOpen(open => !open),
  };
}
