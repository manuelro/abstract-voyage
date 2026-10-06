import { describe, expect, it } from 'vitest';
import {
  createTailwindFieldFactory,
  normalizeTailwindToken,
  tailwindTokenCssValue,
  type TailwindTokenValue,
} from './tailwindFields';
import { TAILWIND_UTILITY_SETS } from './tailwindUtilities.generated';

type DemoConfig = {
  padding: TailwindTokenValue<'paddingY'>;
  tabletPadding: TailwindTokenValue<'paddingY', 'md'>;
  titleWeight: TailwindTokenValue<'fontWeight'>;
  unrelated: 'left' | 'right';
};

const tailwindField = createTailwindFieldFactory<DemoConfig>();

describe('Tailwind-backed config fields', () => {
  it('exposes the complete resolved scales and centralized control kinds', () => {
    expect(TAILWIND_UTILITY_SETS.paddingY.base.options).toHaveLength(35);
    expect(TAILWIND_UTILITY_SETS.gap.base.options).toHaveLength(35);
    expect(TAILWIND_UTILITY_SETS.fontSize.base.options).toHaveLength(16);
    expect(TAILWIND_UTILITY_SETS.fontSize.lg.options[0]).toMatchObject({
      label: 'lg:text-4xs (9px)', value: 'lg:text-4xs',
    });
    expect(TAILWIND_UTILITY_SETS.fontSize.lg.options[15]).toMatchObject({
      label: 'lg:text-9xl (128px)', value: 'lg:text-9xl',
    });
    expect(TAILWIND_UTILITY_SETS.fontWeight.base.options).toHaveLength(9);
    expect(TAILWIND_UTILITY_SETS.fontFamily.base.options.map(option => [option.label, option.value])).toEqual([
      ['SANS', 'font-sans'], ['SERIF', 'font-serif'],
    ]);
    expect(TAILWIND_UTILITY_SETS.borderTopWidth.base.options).toHaveLength(5);
    expect(TAILWIND_UTILITY_SETS.paddingY.base.control).toBe('select');
    expect(TAILWIND_UTILITY_SETS.borderTopWidth.base.control).toBe('enum');
  });

  it('generates identical token membership for base, md, and lg', () => {
    for (const utility of Object.values(TAILWIND_UTILITY_SETS)) {
      const base = utility.base.options.map(option => option.value);
      const md = utility.md.options.map(option => option.value.replace(/^md:/, ''));
      const lg = utility.lg.options.map(option => option.value.replace(/^lg:/, ''));
      expect(md).toEqual(base);
      expect(lg).toEqual(base);
      expect(new Set(base).size).toBe(base.length);
    }
  });

  it('builds an ordinary Panel field from the generated registry', () => {
    const field = tailwindField('paddingY', {
      key: 'padding',
      label: 'Padding',
    });

    expect(field).toEqual({
      kind: 'select',
      key: 'padding',
      label: 'Padding',
      options: TAILWIND_UTILITY_SETS.paddingY.base.options,
    });
  });

  it('uses breakpoint-specific literal values', () => {
    const field = tailwindField('paddingY', {
      breakpoint: 'md',
      key: 'tabletPadding',
      label: 'Tablet padding',
    });

    expect(field.options?.[0]?.value).toBe('md:py-0');
    expect(field.options?.every(option => option.value.startsWith('md:'))).toBe(true);
  });

  it('normalizes valid values and rejects the wrong utility or breakpoint', () => {
    expect(normalizeTailwindToken({
      utility: 'paddingY',
      breakpoint: 'base',
      value: 'py-20',
      fallback: 'py-4',
    })).toBe('py-20');

    expect(normalizeTailwindToken({
      utility: 'paddingY',
      breakpoint: 'base',
      value: 'md:py-20',
      fallback: 'py-4',
    })).toBe('py-4');

    expect(normalizeTailwindToken({
      utility: 'paddingY',
      breakpoint: 'base',
      value: 'px-20',
      fallback: 'py-4',
    })).toBe('py-4');
  });

  it('returns a usable CSS length for font-size tokens with line-height metadata', () => {
    expect(tailwindTokenCssValue('fontSize', 'base', 'text-base')).toBe('1rem');
    expect(tailwindTokenCssValue('fontSize', 'base', 'text-lg')).toBe('1.125rem');
  });

  it('statically rejects keys whose values do not match the utility', () => {
    // @ts-expect-error unrelated does not accept paddingY tokens.
    tailwindField('paddingY', { key: 'unrelated', label: 'Wrong key' });
    expect(true).toBe(true);
  });
});
