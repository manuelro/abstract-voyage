import type { LayoutDebugOverlayLabel } from '../../LayoutDebug';
import type {
  EnumConfigField,
  SelectConfigField,
} from './types';
import {
  TAILWIND_UTILITY_SETS,
  type GeneratedTailwindTokenValue,
  type TailwindBreakpoint,
  type TailwindUtilityName,
} from './tailwindUtilities.generated';

export type {
  TailwindBreakpoint,
  TailwindUtilityName,
} from './tailwindUtilities.generated';

export type TailwindTokenValue<
  TUtility extends TailwindUtilityName,
  TBreakpoint extends TailwindBreakpoint = 'base',
> = GeneratedTailwindTokenValue<TUtility, TBreakpoint>;

type StringKeyOf<TConfig extends object> = Extract<keyof TConfig, string>;

type KeysMatching<TConfig extends object, TValue> = {
  [TKey in StringKeyOf<TConfig>]-?: NonNullable<TConfig[TKey]> extends TValue
    ? TKey
    : never;
}[StringKeyOf<TConfig>];

type TailwindFieldMetadata<
  TConfig extends object,
  TUtility extends TailwindUtilityName,
  TBreakpoint extends TailwindBreakpoint,
  TKey extends KeysMatching<TConfig, TailwindTokenValue<TUtility, TBreakpoint>>,
> = {
  key: TKey;
  label: string;
  description?: string;
  breakpoint?: TBreakpoint;
  visibleWhen?: (config: Readonly<TConfig>) => boolean;
  debugHighlightIds?: ReadonlyArray<LayoutDebugOverlayLabel>;
};

type TailwindFieldFactory<TConfig extends object> = <
  TUtility extends TailwindUtilityName,
  TBreakpoint extends TailwindBreakpoint = 'base',
  TKey extends KeysMatching<TConfig, TailwindTokenValue<TUtility, TBreakpoint>> = KeysMatching<TConfig, TailwindTokenValue<TUtility, TBreakpoint>>,
>(
  utility: TUtility,
  metadata: TailwindFieldMetadata<TConfig, TUtility, TBreakpoint, TKey>,
) => TailwindPanelField<TConfig, TUtility, TBreakpoint, TKey>;

type TailwindPanelField<
  TConfig extends object,
  TUtility extends TailwindUtilityName,
  TBreakpoint extends TailwindBreakpoint,
  TKey extends KeysMatching<TConfig, TailwindTokenValue<TUtility, TBreakpoint>>,
> =
  | EnumConfigField<
    TConfig,
    TKey,
    TailwindTokenValue<TUtility, TBreakpoint>
  >
  | SelectConfigField<
    TConfig,
    TKey,
    TailwindTokenValue<TUtility, TBreakpoint>
  >;

function getUtilitySet<
  TUtility extends TailwindUtilityName,
  TBreakpoint extends TailwindBreakpoint,
>(utility: TUtility, breakpoint: TBreakpoint) {
  return TAILWIND_UTILITY_SETS[utility][breakpoint];
}

export function createTailwindFieldFactory<
  TConfig extends object,
>(): TailwindFieldFactory<TConfig> {
  return ((utility, metadata) => {
    const { breakpoint = 'base', ...fieldMetadata } = metadata;
    const utilitySet = getUtilitySet(utility, breakpoint);
    return {
      ...fieldMetadata,
      kind: utilitySet.control,
      options: utilitySet.options,
    } as unknown as TailwindPanelField<TConfig, TailwindUtilityName, TailwindBreakpoint, never>;
  }) as TailwindFieldFactory<TConfig>;
}

type NormalizeTailwindTokenInput<
  TUtility extends TailwindUtilityName,
  TBreakpoint extends TailwindBreakpoint,
> = {
  utility: TUtility;
  breakpoint: TBreakpoint;
  value: unknown;
  fallback: TailwindTokenValue<TUtility, TBreakpoint>;
};

export function normalizeTailwindToken<
  TUtility extends TailwindUtilityName,
  TBreakpoint extends TailwindBreakpoint,
>({
  utility,
  breakpoint,
  value,
  fallback,
}: NormalizeTailwindTokenInput<TUtility, TBreakpoint>): TailwindTokenValue<TUtility, TBreakpoint> {
  const options = getUtilitySet(utility, breakpoint).options as ReadonlyArray<{ value: string; cssValue: unknown }>;
  if (typeof value !== 'string') return fallback;
  if (options.some(option => option.value === value)) return value as TailwindTokenValue<TUtility, TBreakpoint>;

  // Temporary read bridge for persisted pre-registry arbitrary values. Once
  // stored configs have been rewritten to named tokens, remove these two
  // branches; new authoring never exposes arbitrary classes.
  const prefix = breakpoint === 'base' ? '' : `${breakpoint}:`;
  if (utility === 'fontSize') {
    const match = value.match(/^(?:(md|lg):)?text-\[(9|10|11)px\]$/);
    if (match && (match[1] ? `${match[1]}:` : '') === prefix) {
      const found = options.find(option => typeof option.cssValue === 'string'
        && /^\d*\.?\d+rem$/.test(option.cssValue)
        && Math.round(parseFloat(option.cssValue) * 16) === Number(match[2]));
      if (found) return found.value as TailwindTokenValue<TUtility, TBreakpoint>;
    }
  }
  if (utility === 'maxWidth') {
    const match = value.match(/^(?:(md|lg):)?max-w-\[(\d+)%\]$/);
    if (match && (match[1] ? `${match[1]}:` : '') === prefix) {
      const found = options.find(option => option.cssValue === `${match[2]}%`);
      if (found) return found.value as TailwindTokenValue<TUtility, TBreakpoint>;
    }
  }
  return fallback;
}

export function translateTailwindTokenBreakpoint<
  TUtility extends TailwindUtilityName,
  TFrom extends TailwindBreakpoint,
  TTo extends TailwindBreakpoint,
>(utility: TUtility, from: TFrom, to: TTo, value: TailwindTokenValue<TUtility, TFrom>, fallback: TailwindTokenValue<TUtility, TTo>): TailwindTokenValue<TUtility, TTo> {
  const source = getUtilitySet(utility, from).options as ReadonlyArray<{ value: string }>;
  const destination = getUtilitySet(utility, to).options as ReadonlyArray<{ value: string }>;
  const index = source.findIndex(option => option.value === value);
  return (index >= 0 ? destination[index]?.value : undefined) as TailwindTokenValue<TUtility, TTo> | undefined ?? fallback;
}

/** CSS length/keyword resolved from the same theme entry as a generated class. */
export function tailwindTokenCssValue<
  TUtility extends TailwindUtilityName,
  TBreakpoint extends TailwindBreakpoint,
>(utility: TUtility, breakpoint: TBreakpoint, value: TailwindTokenValue<TUtility, TBreakpoint>): string {
  const options = getUtilitySet(utility, breakpoint).options as ReadonlyArray<{
    value: string;
    cssValue: unknown;
  }>;
  const option = options.find(option => option.value === value);
  if (!option) throw new Error(`Unknown Tailwind token: ${String(value)}`);
  // Tailwind font-size entries carry [fontSize, { lineHeight }]. CSS consumers
  // asking for one length need the first value, not the array's string form.
  return String(Array.isArray(option.cssValue) ? option.cssValue[0] : option.cssValue);
}
