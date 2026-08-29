import type {
  ConfigScalar,
  ConfigScopeBinding,
  DefinedConfigScope,
  RuntimeConfigScopeDefinition,
} from './types';

export function createConfigScopeBinding<TConfig extends object>({
  definition,
  value,
  onChange,
  onReset,
  defaultValue,
  title,
  summary,
  global,
}: {
  definition: DefinedConfigScope<TConfig>;
  value: TConfig;
  onChange: (value: TConfig) => void;
  onReset?: () => void;
  /** Overrides the scope's own registered `defaultValue` for this bound
   * instance only — for a page that ships its own deliberate baseline for
   * one or more fields (e.g. `pages/abstract.tsx`'s
   * `ABSTRACT_SPLIT_COLUMN_CARD_STACK_CONFIG`, which flips
   * `showArrowControlsEnabled` away from the shared scope's own default),
   * rather than the scope's registered `DEFAULT_*_CONFIG`. Both `reset()`
   * and the "COPY DIFF" serializer (`serializeConfigScopeBindingDiff`) read
   * `definition.defaultValue` — without this override, a field a page
   * intentionally starts away from the shared default reads as *already
   * differing* before any operator edit, and — the actual bug this exists
   * to fix — editing it back to the shared default's own value then reads
   * as *no change at all* in the diff, silently dropping a real edit,
   * because the diff is comparing against a baseline the page never
   * actually ships. Pass the same page-owned config object used to seed
   * this binding's own initial `value`, exactly as `onReset` already does
   * for pages that need reset to land somewhere other than the shared
   * default (e.g. `ABSTRACT_POLYMORPHIC_LAYOUT_PANEL`'s own binding on this
   * same page) — this is the equivalent override for diff/reset baseline,
   * not a replacement for `onReset` (still use `onReset` instead when reset
   * needs to do more than restore a static object, e.g. running it back
   * through a normalizer). */
  defaultValue?: TConfig;
  /** Overrides the scope's own title/summary for this bound instance only —
   * for when the same registered scope is legitimately bound more than once
   * on one page against independent state (e.g. two separately-configurable
   * CtaButton instances), so the panel's section list can tell them apart.
   * The shared scope definition (fields, defaults, copy target) is untouched
   * either way — this only relabels how this one binding renders. */
  title?: string;
  summary?: string;
  /** Set true only when `value`/`onChange` come directly from
   * useSharedDesignConfig() (SharedDesignConfigProvider) — never as a guess
   * from the scope's id/component. Renders the panel's light-blue "global"
   * dot next to the section title. See ConfigScopeBinding['global']'s own
   * doc comment for why this can't be inferred from the definition alone. */
  global?: boolean;
}): ConfigScopeBinding {
  const runtimeValue = value as unknown as Readonly<Record<string, ConfigScalar>>;
  const runtimeDefinition = definition as RuntimeConfigScopeDefinition;
  const runtimeDefaultValue = defaultValue as unknown as Readonly<Record<string, ConfigScalar>> | undefined;

  return {
    definition: title === undefined && summary === undefined && runtimeDefaultValue === undefined
      ? runtimeDefinition
      : {
        ...runtimeDefinition,
        title: title ?? runtimeDefinition.title,
        summary: summary ?? runtimeDefinition.summary,
        defaultValue: runtimeDefaultValue ?? runtimeDefinition.defaultValue,
      },
    value: runtimeValue,
    global,
    updateField(key, nextValue) {
      if (!(key in runtimeValue)) {
        throw new Error(`Unknown config key "${key}" for scope "${definition.id}"`);
      }
      onChange({ ...value, [key]: nextValue });
    },
    updateFields(patch) {
      for (const key of Object.keys(patch)) {
        if (!(key in runtimeValue)) {
          throw new Error(`Unknown config key "${key}" for scope "${definition.id}"`);
        }
      }
      onChange({ ...value, ...patch } as TConfig);
    },
    reset() {
      if (onReset) {
        onReset();
        return;
      }
      onChange({ ...(defaultValue ?? definition.defaultValue) } as TConfig);
    },
  };
}
