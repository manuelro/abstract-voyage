export type GlobalHeadingFontFamily = 'sans' | 'serif';

/**
 * Site-wide default for which font family headings render in — not owned by
 * any one page or component. Every heading-bearing component (PageTitle,
 * SectionHeading, FiberHeading, AbstractEditorialHero, SiteHeader)
 * reads this as its own *fallback* whenever its own fontFamily field is
 * 'inherit' (see each component's own .config.ts) — this scope itself never
 * carries a per-component override, and no component's own default value
 * references this object. See AGENTS.md's "Per-page config ownership"
 * section for why a shared default must never itself carry the override/
 * merge shape (SiteHeaderColorOverride/CtaButtonColorOverride) —
 * this scope and each component's 'inherit' sentinel stay permanently
 * decoupled data, joined only by read-time resolution logic.
 */
export type GlobalTypographyConfig = {
  headingFontFamily: GlobalHeadingFontFamily;
};

export const DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG = {
  headingFontFamily: 'serif',
} satisfies GlobalTypographyConfig;

const HEADING_FONT_FAMILIES: ReadonlyArray<GlobalHeadingFontFamily> = ['sans', 'serif'];

const token = <T extends string>(value: string, values: ReadonlyArray<T>, fallback: T) => (
  values.includes(value as T) ? value as T : fallback
);

/** Single normalization path for every runtime and panel-provided value. */
export function normalizeGlobalTypographyConfig(
  config: Partial<GlobalTypographyConfig> | undefined,
): GlobalTypographyConfig {
  const base = { ...DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG, ...(config ?? {}) };
  return {
    headingFontFamily: token(
      base.headingFontFamily, HEADING_FONT_FAMILIES, DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG.headingFontFamily,
    ),
  };
}
