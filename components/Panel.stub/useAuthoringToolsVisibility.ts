// Production stand-in for components/Panel/useAuthoringToolsVisibility.ts,
// substituted in by next.config.js's webpack alias (production builds
// only). Never imported directly — see CONFIG-CHANGE-PROTOCOL.md.
export function useAuthoringToolsVisibility() {
  return {
    showAuthoringTools: false,
    isPanelOpen: false,
    setIsPanelOpen: (_open: boolean) => {},
    togglePanel: () => {},
  }
}
