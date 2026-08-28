// Posts lab page layout — thin re-export onto the shared, promoted
// PolymorphicLayoutConfig
// (experiences/abstract/components/PolymorphicLayout.config.ts). See
// PLAN-SPLIT-COLUMN-LAYOUT-ENRICHMENT-EXTRACTION.md: the full type,
// defaults, and normalize logic that used to live in this file were
// relocated there so a future page can adopt the same shape without
// depending on a posts-lab-specific file.
//
// PLAN-POLYMORPHIC-LAYOUT-PAGE-CONFIG-PARITY.md: posts-lab's own
// default-value instance used to be DEFAULT_POLYMORPHIC_LAYOUT_CONFIG
// itself, re-exported verbatim under an alias — meaning posts-lab had no
// config of its own at all, and any future change to the shared library
// default would have silently changed posts-lab's own rendered layout too
// (the exact drift PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md's "never spread/
// reuse a shared DEFAULT_..._CONFIG as a page's own value" warns against,
// just via re-export instead of spread). Now points at
// POST_LAB_POLYMORPHIC_LAYOUT_CONFIG (PolymorphicLayout.pageConfigs.ts) —
// posts-lab's own genuine, independent, satisfies-checked instance,
// co-located there with /abstract's and /about's — under the same original
// export name, so this file's own consumers (pages/posts-lab/[slug].tsx,
// postLab.panel.ts, postLab.panel.test.tsx) need no import changes.
export {
  normalizePolymorphicLayoutConfig as normalizePostLabPageLayoutConfig,
  type PolymorphicLayoutConfig as PostLabPageLayoutConfig,
  type PolymorphicLayoutContentContainerAlign,
  CONTENT_ALIGN_MARGIN_CLASS_WIDE,
} from '../../experiences/abstract/components/PolymorphicLayout.config'
export { POST_LAB_POLYMORPHIC_LAYOUT_CONFIG as DEFAULT_POST_LAB_PAGE_LAYOUT_CONFIG } from '../../experiences/abstract/components/PolymorphicLayout.pageConfigs'
