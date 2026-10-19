import {
  DEFAULT_PARENT_QUOTE_SURFACE_CONFIG,
  DEFAULT_QUOTE_SURFACE_CONFIG,
  normalizeQuoteSurfaceConfig,
  parentQuoteKey,
  type ParentQuoteFields,
  type QuoteSurfaceConfig,
} from './config';

/** The parent paints the backdrop; Quote's decorative path suppresses copy and recursion. */
export function resolveParentQuoteConfig(config: ParentQuoteFields): QuoteSurfaceConfig {
  const raw = Object.fromEntries(Object.keys(DEFAULT_QUOTE_SURFACE_CONFIG).map(key => [
    key, config[parentQuoteKey(key as keyof QuoteSurfaceConfig)],
  ])) as Partial<QuoteSurfaceConfig>;
  return normalizeQuoteSurfaceConfig({ ...DEFAULT_PARENT_QUOTE_SURFACE_CONFIG, ...raw });
}
