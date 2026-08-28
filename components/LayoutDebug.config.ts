/**
 * Global, cosmetic-only inspect mode for the split-column layout: overlays
 * vivid, labeled boxes on the layout's columns and content boxes, the same
 * way Chrome DevTools' own element-inspect overlay reveals box boundaries.
 * On by default and additive-only at every render site — see
 * LayoutDebug.tsx's own doc comment for why toggling this can never change
 * layout, only paint an overlay on top of it.
 */
export type LayoutDebugConfig = {
  enabled: boolean;
};

export const DEFAULT_LAYOUT_DEBUG_CONFIG: LayoutDebugConfig = {
  enabled: false,
};

export function normalizeLayoutDebugConfig(
  config: Partial<LayoutDebugConfig> | undefined,
): LayoutDebugConfig {
  return {
    enabled: config?.enabled === true,
  };
}
