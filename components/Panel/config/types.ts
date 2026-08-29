import type { LayoutDebugOverlayLabel } from '../../LayoutDebug';

export type ConfigScalar = string | number | boolean;

type StringKeyOf<TConfig extends object> = Extract<keyof TConfig, string>;

type ConfigFieldBase<TConfig extends object, TKey extends StringKeyOf<TConfig>> = {
  key: TKey;
  label: string;
  description?: string;
  visibleWhen?: (config: Readonly<TConfig>) => boolean;
  /** Orientation-only: the exact LayoutDebugOverlay `label` string(s) (see
   * components/LayoutDebug.tsx) this field's own value visibly affects.
   * ConfigFieldControl (controlResolver.tsx) uses this to dim every other
   * overlay while this field is hovered, via LayoutDebugHighlightContext
   * (components/LayoutDebugHighlight.tsx) — purely cosmetic, no effect on
   * this field's own behavior, and a no-op on any page that hasn't mounted
   * a LayoutDebugHighlightProvider. Omit for fields with no single clear
   * region (colors, global toggles, etc.) rather than guessing. */
  debugHighlightIds?: ReadonlyArray<LayoutDebugOverlayLabel>;
};

export type BooleanConfigField<
  TConfig extends object,
  TKey extends StringKeyOf<TConfig>,
> = ConfigFieldBase<TConfig, TKey> & {
  kind: 'boolean';
};

export type NumberConfigField<
  TConfig extends object,
  TKey extends StringKeyOf<TConfig>,
> = ConfigFieldBase<TConfig, TKey> & {
  kind: 'number';
  min: number;
  max: number;
  step: number;
  unit?: string;
  integer?: boolean;
  /** Explicit ascending list of the only allowed values, for scales that
   * aren't uniformly spaced (e.g. Tailwind's own spacing scale) — see
   * Knob's own doc comment. Overrides `step`'s uniform behavior; `min`/`max`
   * are ignored in favor of the list's own first/last entries when set. */
  steps?: ReadonlyArray<number>;
};

export type EnumConfigField<
  TConfig extends object,
  TKey extends StringKeyOf<TConfig>,
  TValue extends string,
> = ConfigFieldBase<TConfig, TKey> & {
  kind: 'enum';
  options: ReadonlyArray<{ label: string; value: TValue }>;
};

/**
 * Same shape as `EnumConfigField` (a fixed list of {label, value} options),
 * rendered as a native `<select>` (see `Select` in components/Panel/index.tsx)
 * instead of SegmentedControl's button row. Use this over `enum` once the
 * option count runs past SegmentedControl's practical ceiling (~6-8) — e.g.
 * Tailwind's own spacing scale, which has ~34 steps.
 */
export type SelectConfigField<
  TConfig extends object,
  TKey extends StringKeyOf<TConfig>,
  TValue extends string,
> = ConfigFieldBase<TConfig, TKey> & {
  kind: 'select';
  options: ReadonlyArray<{ label: string; value: TValue }>;
};

export type ColorConfigField<
  TConfig extends object,
  TKey extends StringKeyOf<TConfig>,
> = ConfigFieldBase<TConfig, TKey> & {
  kind: 'color';
};

/**
 * A button that computes an arbitrary multi-key patch and applies it on
 * click — the generic primitive behind PolymorphicLayoutConfig's own
 * "sync colors across breakpoints" buttons, deliberately not named after
 * that one use case so any future "apply a computed patch" need (a preset,
 * a bulk-tier sync, …) reuses this instead of growing a second bespoke
 * mechanism. `key` is a stable DOM identity only (matches every other
 * field's own `data-config-field-key` convention) — unlike every other
 * field kind, it is *not* a real property of `TConfig` and is never read
 * from or validated against `defaultValue` (see `defineConfigScope.ts`'s
 * own field-flattening, which skips `kind: 'action'` entries entirely
 * rather than treating them as a leaf that must resolve to a real default).
 */
export type ConfigFieldAction<TConfig extends object> = {
  kind: 'action';
  key: string;
  label: string;
  description?: string;
  visibleWhen?: (config: Readonly<TConfig>) => boolean;
  /** Returns the partial patch to merge into the live config on click —
   * applied in one `ConfigScopeBinding.updateFields` call (one `onChange`,
   * one render), not several sequential `updateField` calls. */
  onClick: (config: Readonly<TConfig>) => Partial<TConfig>;
};

export type ConfigFieldDefinition<TConfig extends object> = {
  [TKey in StringKeyOf<TConfig>]:
    TConfig[TKey] extends boolean
      ? BooleanConfigField<TConfig, TKey>
      : TConfig[TKey] extends number
        ? NumberConfigField<TConfig, TKey>
        : TConfig[TKey] extends string
          ? EnumConfigField<TConfig, TKey, Extract<TConfig[TKey], string>>
            | SelectConfigField<TConfig, TKey, Extract<TConfig[TKey], string>>
            | ColorConfigField<TConfig, TKey>
          : never;
}[StringKeyOf<TConfig>];

/**
 * A collapsible sub-zone *within* a `ConfigFieldGroup` — e.g. "Padding" /
 * "Margin" / "Width" inside "Wide column padding & margin"
 * (PLAN-POSTS-LAB-PANEL-TABS.md §11). Deliberately leaf-only (`fields` is
 * `ConfigFieldDefinition`, never another subgroup or group) — the same
 * bounded-depth discipline `ConfigFieldTabs` already applies to itself,
 * here capping the hierarchy at scope → tabs (optional) → group (optional)
 * → subgroup (optional) → field, four levels, no deeper.
 */
export type ConfigFieldSubgroup<TConfig extends object> = {
  kind: 'subgroup';
  label: string;
  /** Default true — every subgroup starts collapsed, uniformly; no
   * property is presumed more important than another by default (§11.2). */
  defaultCollapsed?: boolean;
  fields: ReadonlyArray<ConfigFieldDefinition<TConfig>>;
  visibleWhen?: (config: Readonly<TConfig>) => boolean;
};

export type ConfigFieldGroup<TConfig extends object> = {
  kind: 'group';
  label: string;
  fields: ReadonlyArray<ConfigFieldDefinition<TConfig> | ConfigFieldSubgroup<TConfig> | ConfigFieldAction<TConfig>>;
  visibleWhen?: (config: Readonly<TConfig>) => boolean;
};

/**
 * A device-size (or other coarse-context) switcher over a scope's own
 * fields/groups — PLAN-POSTS-LAB-PANEL-TABS.md's own primitive, built once
 * here per AGENTS.md's "implement a new category once in the shared
 * resolver" rule rather than as a page-specific mechanism. Each tab's own
 * `fields` may itself contain `ConfigFieldGroup` entries (so existing
 * groups like "Wide column padding & margin" nest inside a tab unchanged),
 * but a tab's fields may not contain another `ConfigFieldTabs` — nesting
 * tabs inside tabs is not supported, keeping the hierarchy to exactly
 * scope → tabs (optional) → group (optional) → field.
 */
export type ConfigFieldTabs<TConfig extends object> = {
  kind: 'tabs';
  tabs: ReadonlyArray<{
    id: string;
    /** e.g. "MOBILE (< 768px)" — states the real pixel threshold, not just
     * a word, so the tab itself carries the orientation info a reader needs
     * (PLAN-POSTS-LAB-PANEL-TABS.md recommendation 2.5). */
    label: string;
    fields: ReadonlyArray<ConfigFieldDefinition<TConfig> | ConfigFieldGroup<TConfig> | ConfigFieldAction<TConfig>>;
  }>;
  visibleWhen?: (config: Readonly<TConfig>) => boolean;
};

/**
 * A macro-level switch *above* the device-size tabs — e.g. "HEADER" /
 * "CONTENT" (PLAN-POSTS-LAB-PANEL-TABS.md §12), styled as boxed pill
 * buttons (reusing `.panelButton`, the same visual language as the panel
 * shell's own COPY/COPY DIFF/RESET row) rather than `TabStrip`'s
 * underline — two different navigational levels using identical styling
 * risks a reader not registering they're different axes. An area's own
 * `fields` may contain a `ConfigFieldTabs` entry (so each area keeps its
 * full device-tab structure), but not another `ConfigFieldAreas` — the
 * same one-way nesting discipline `ConfigFieldTabs` already applies to
 * itself, extended one level higher: scope → areas (optional) → tabs
 * (optional) → group (optional) → subgroup (optional) → field, five
 * levels, no deeper.
 */
export type ConfigFieldAreas<TConfig extends object> = {
  kind: 'areas';
  areas: ReadonlyArray<{
    id: string;
    label: string;
    fields: ReadonlyArray<ConfigFieldDefinition<TConfig> | ConfigFieldGroup<TConfig> | ConfigFieldTabs<TConfig>>;
  }>;
  visibleWhen?: (config: Readonly<TConfig>) => boolean;
};

export type ConfigScopeEntry<TConfig extends object> =
  | ConfigFieldDefinition<TConfig>
  | ConfigFieldGroup<TConfig>
  | ConfigFieldTabs<TConfig>
  | ConfigFieldAreas<TConfig>
  | ConfigFieldAction<TConfig>;

export type ConfigScopeCopyMetadata = {
  targetFile: string;
  targetSymbol: string;
  targetType: string;
  updateStrategy?: 'replace_scope' | 'merge';
  completeScope?: boolean;
};

/**
 * A named, valuable state — a partial config value a human decided is
 * qualitatively distinct enough to earn its own generated Storybook story
 * (see components/Panel/config/generateStorybookStories.ts), rather than
 * just being reachable via the Playground story's live Controls. Authoring
 * this list is ordinary config-panel work (no different in kind from
 * writing a field's label/description); it does not by itself generate or
 * touch any Storybook file — see AGENTS.md's "Storybook (SB8) documentation
 * automation" section for the explicit-trigger rule governing that.
 */
export type DocumentedConfigState<TConfig extends object> = {
  /** Becomes the generated story's export name — keep it a valid JS
   * identifier (e.g. `PondBounce`, not `pond bounce`). */
  name: string;
  description?: string;
  value: Partial<TConfig>;
};

export type ConfigScopeDefinition<TConfig extends object> = {
  id: string;
  component: string;
  scope: string;
  title: string;
  summary?: string;
  /** ISO 8601 date (e.g. '2026-08-07') this scope was authored — drives the
   * config panel's "order by most recently added" sort
   * (PLAN-CONFIG-PANEL-SEARCH-AND-ORDERING.md 4.2). Backfilled for existing
   * scopes from each file's real first-commit date
   * (`git log --follow --diff-filter=A --format=%as`), not guessed — a new
   * scope's own createdAt is just "today," written by whoever authors it. */
  createdAt: string;
  defaultOpen?: boolean;
  defaultValue: Readonly<TConfig>;
  fields: ReadonlyArray<ConfigScopeEntry<TConfig>>;
  hiddenKeys?: ReadonlyArray<StringKeyOf<TConfig>>;
  documentedStates?: ReadonlyArray<DocumentedConfigState<TConfig>>;
  copy: ConfigScopeCopyMetadata;
};

export type RuntimeConfigFieldDefinition = {
  kind: 'boolean' | 'number' | 'enum' | 'select' | 'color';
  key: string;
  label: string;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  steps?: ReadonlyArray<number>;
  unit?: string;
  integer?: boolean;
  options?: ReadonlyArray<{ label: string; value: string }>;
  visibleWhen?: (config: Readonly<Record<string, ConfigScalar>>) => boolean;
  debugHighlightIds?: ReadonlyArray<LayoutDebugOverlayLabel>;
};

export type RuntimeConfigFieldAction = {
  kind: 'action';
  key: string;
  label: string;
  description?: string;
  visibleWhen?: (config: Readonly<Record<string, ConfigScalar>>) => boolean;
  onClick: (config: Readonly<Record<string, ConfigScalar>>) => Record<string, ConfigScalar>;
};

export type RuntimeConfigFieldSubgroup = {
  kind: 'subgroup';
  label: string;
  defaultCollapsed?: boolean;
  fields: ReadonlyArray<RuntimeConfigFieldDefinition>;
  visibleWhen?: (config: Readonly<Record<string, ConfigScalar>>) => boolean;
};

export type RuntimeConfigFieldGroup = {
  kind: 'group';
  label: string;
  fields: ReadonlyArray<RuntimeConfigFieldDefinition | RuntimeConfigFieldSubgroup | RuntimeConfigFieldAction>;
  visibleWhen?: (config: Readonly<Record<string, ConfigScalar>>) => boolean;
};

export type RuntimeConfigFieldTabs = {
  kind: 'tabs';
  tabs: ReadonlyArray<{
    id: string;
    label: string;
    fields: ReadonlyArray<RuntimeConfigFieldDefinition | RuntimeConfigFieldGroup | RuntimeConfigFieldAction>;
  }>;
  visibleWhen?: (config: Readonly<Record<string, ConfigScalar>>) => boolean;
};

export type RuntimeConfigFieldAreas = {
  kind: 'areas';
  areas: ReadonlyArray<{
    id: string;
    label: string;
    fields: ReadonlyArray<RuntimeConfigFieldDefinition | RuntimeConfigFieldGroup | RuntimeConfigFieldTabs>;
  }>;
  visibleWhen?: (config: Readonly<Record<string, ConfigScalar>>) => boolean;
};

export type RuntimeDocumentedConfigState = {
  name: string;
  description?: string;
  value: Readonly<Record<string, ConfigScalar>>;
};

export type RuntimeConfigScopeDefinition = {
  id: string;
  component: string;
  scope: string;
  title: string;
  summary?: string;
  createdAt: string;
  defaultOpen?: boolean;
  defaultValue: Readonly<Record<string, ConfigScalar>>;
  fields: ReadonlyArray<
    RuntimeConfigFieldDefinition
    | RuntimeConfigFieldGroup
    | RuntimeConfigFieldTabs
    | RuntimeConfigFieldAreas
    | RuntimeConfigFieldAction
  >;
  hiddenKeys?: ReadonlyArray<string>;
  documentedStates?: ReadonlyArray<RuntimeDocumentedConfigState>;
  copy: ConfigScopeCopyMetadata;
};

export type DefinedConfigScope<TConfig extends object> =
  ConfigScopeDefinition<TConfig> & RuntimeConfigScopeDefinition;

export type ConfigScopeBinding = {
  definition: RuntimeConfigScopeDefinition;
  value: Readonly<Record<string, ConfigScalar>>;
  updateField: (key: string, value: ConfigScalar) => void;
  /** Multi-key sibling to `updateField` — merges every key in `patch` into
   * the live value in one `onChange` call (one render) instead of several
   * sequential single-field updates. Backs `kind: 'action'` fields; also
   * available to any future caller that needs an atomic multi-field write. */
  updateFields: (patch: Readonly<Record<string, ConfigScalar>>) => void;
  reset: () => void;
  /** True when `value`/`onChange` for THIS binding are sourced from
   * SharedDesignConfigProvider (components/SharedDesignConfigProvider.tsx)
   * — i.e. editing it has real cross-page repercussions, not just a
   * same-schema coincidence. A property of the binding, not the scope
   * definition: the same registered scope (e.g. CtaButton/appearance) can
   * be bound both globally (the shared instance) and locally (an
   * independent per-page instance, e.g. design-system.tsx's own "pond
   * bounce" CTA) on the very same page, so this can never be a fact baked
   * into the definition itself. */
  global?: boolean;
};
