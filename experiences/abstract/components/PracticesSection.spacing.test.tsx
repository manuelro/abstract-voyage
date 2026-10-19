import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { useBreakpointTier } from '../../../components/useBreakpointTier';
import { DEFAULT_PRACTICES_SECTION_LAYOUT_CONFIG } from './PracticesSection.config';
import { PracticesSection, type PracticesSectionContent } from './PracticesSection';

vi.mock('../../../components/useBreakpointTier', () => ({ useBreakpointTier: vi.fn() }));
vi.mock('../../../components/useMeasuredElementRect', () => ({
  useMeasuredElementRect: () => ({ ref: () => {}, rect: { width: 500 } }),
}));

const content: PracticesSectionContent = {
  eyebrow: '', heading: 'The Practice', introduction: 'Introduction', subtext: '',
  practices: [1, 2, 3, 4].map(number => ({ title: `Practice ${number}`, description: 'Description' })),
  delivery: { heading: 'Delivery', text: 'Delivery details' },
  industry: { label: 'Industry', title: 'Proof', text: 'Industry details' },
  cta: { label: 'Get in touch', href: '#' },
};

describe('Practices title group gap', () => {
  it.each([
    ['mobile', '0px'],
    ['md', '6rem'],
    ['lg', '2rem'],
  ] as const)('applies the %s value to the practices grid', (tier, expected) => {
    vi.mocked(useBreakpointTier).mockReturnValue({ tier, viewportWidthPx: undefined });
    const html = renderToStaticMarkup(<PracticesSection content={content} inkColor="#000000" layout={{
      ...DEFAULT_PRACTICES_SECTION_LAYOUT_CONFIG,
      titleGroupGap: 'mt-0', titleGroupGapMd: 'md:mt-24', titleGroupGapLg: 'lg:mt-8',
    }} />);
    expect(html).toMatch(new RegExp(`<div class="grid" style="margin-top:${expected}`));
  });

  it.each([
    ['mobile', ['0px', '1rem', '1.5rem', '2rem']],
    ['md', ['2rem', '2.5rem', '3.5rem', '4rem']],
    ['lg', ['3rem', '4rem', '5rem', '6rem']],
  ] as const)('applies the %s gaps between every subgroup', (tier, expected) => {
    vi.mocked(useBreakpointTier).mockReturnValue({ tier, viewportWidthPx: undefined });
    const html = renderToStaticMarkup(<PracticesSection content={content} inkColor="#000000" layout={{
      ...DEFAULT_PRACTICES_SECTION_LAYOUT_CONFIG,
      sectionDividerEnabled: true,
      gridToDividerGap: 'mt-0', gridToDividerGapMd: 'md:mt-8', gridToDividerGapLg: 'lg:mt-12',
      dividerToDetailsGap: 'mt-4', dividerToDetailsGapMd: 'md:mt-10', dividerToDetailsGapLg: 'lg:mt-16',
      industryGap: 'mt-6', industryGapMd: 'md:mt-14', industryGapLg: 'lg:mt-20',
      ctaGap: 'mt-8', ctaGapMd: 'md:mt-16', ctaGapLg: 'lg:mt-24',
    }} />);
    document.body.innerHTML = html;
    const section = document.querySelector('[data-practices-section]');
    const gaps = Array.from(section?.children ?? []).slice(2).map(node => (node as HTMLElement).style.marginTop);
    expect(gaps).toEqual(expected);
  });
});

describe('Practices dividers', () => {
  it('hides both divider systems until each is enabled', () => {
    vi.mocked(useBreakpointTier).mockReturnValue({ tier: 'md', viewportWidthPx: 900 });
    const twoColumns = { columnTargetWidthPx: 200, minColumnWidthPx: 100, maxColumnWidthPx: 300, maxColumnCount: 2 };
    const render = (sectionDividerEnabled: boolean, practiceDividersEnabled: boolean) => {
      document.body.innerHTML = renderToStaticMarkup(<PracticesSection content={content} inkColor="#000000" layout={{
        ...DEFAULT_PRACTICES_SECTION_LAYOUT_CONFIG,
        ...twoColumns,
        sectionDividerEnabled,
        practiceDividersEnabled,
        separatorStyle: 'vertical-and-row',
      }} />);
      const section = document.querySelector('[data-practices-section]') as HTMLElement;
      const grid = section.querySelector('.grid') as HTMLElement;
      return { section, grid };
    };

    const off = render(false, false);
    expect(off.section.querySelector('[data-practices-section-divider]')).toBeNull();
    expect((off.grid.children[1] as HTMLElement).style.borderLeft).toBe('');
    expect((off.grid.children[2] as HTMLElement).style.borderTop).toBe('');
    expect((off.section.children[2] as HTMLElement).style.marginTop).toBe('5rem');

    const sectionOnly = render(true, false);
    expect(sectionOnly.section.querySelector('[data-practices-section-divider]')).not.toBeNull();
    expect((sectionOnly.grid.children[1] as HTMLElement).style.borderLeft).toBe('');

    const cardsOnly = render(false, true);
    expect(cardsOnly.section.querySelector('[data-practices-section-divider]')).toBeNull();
    expect((cardsOnly.grid.children[1] as HTMLElement).style.borderLeft).not.toBe('');

    const on = render(true, true);
    expect(on.section.querySelector('[data-practices-section-divider]')).not.toBeNull();
    expect((on.grid.children[1] as HTMLElement).style.borderLeft).not.toBe('');
    expect((on.grid.children[2] as HTMLElement).style.borderTop).not.toBe('');
  });

  it('does not draw a section divider when there are no detail groups', () => {
    vi.mocked(useBreakpointTier).mockReturnValue({ tier: 'mobile', viewportWidthPx: 390 });
    document.body.innerHTML = renderToStaticMarkup(<PracticesSection content={{
      ...content,
      delivery: { heading: '', text: '' },
      industry: { label: '', title: '', text: '' },
    }} inkColor="#000000" layout={{ ...DEFAULT_PRACTICES_SECTION_LAYOUT_CONFIG, sectionDividerEnabled: true }} />);
    expect(document.querySelector('[data-practices-section-divider]')).toBeNull();
  });
});

describe('Practices typography', () => {
  it('applies tablet sizes to every visible text role, including optional copy', () => {
    vi.mocked(useBreakpointTier).mockReturnValue({ tier: 'md', viewportWidthPx: 820 });
    document.body.innerHTML = renderToStaticMarkup(<PracticesSection content={{
      ...content, eyebrow: 'Eyebrow', subtext: 'Optional subtext',
    }} inkColor="#000000" layout={{
      ...DEFAULT_PRACTICES_SECTION_LAYOUT_CONFIG,
      labelFontSizeMd: 'md:text-lg',
      sectionTitleFontSizeMd: 'md:text-4xl',
      subsectionTitleFontSizeMd: 'md:text-3xl',
      leadFontSizeMd: 'md:text-2xl',
      bodyFontSizeMd: 'md:text-sm',
      subtextFontSizeMd: 'md:text-xl',
      ctaFontSizeMd: 'md:text-xs',
    }} />);
    const section = document.querySelector('[data-practices-section]')!;
    const sizeOf = (copy: string) => Array.from(section.querySelectorAll<HTMLElement>('h2, h3, p, a'))
      .find(element => element.textContent?.trim() === copy)?.style.fontSize;
    expect(sizeOf('Eyebrow')).toBe('1.125rem');
    expect(sizeOf('Industry')).toBe('1.125rem');
    expect(sizeOf('The Practice')).toBe('2.25rem');
    expect(sizeOf('Delivery')).toBe('2.25rem');
    expect(sizeOf('Practice 1')).toBe('1.875rem');
    expect(sizeOf('Proof')).toBe('1.875rem');
    expect(sizeOf('Introduction')).toBe('1.5rem');
    expect(sizeOf('Delivery details')).toBe('1.5rem');
    expect(sizeOf('Description')).toBe('0.875rem');
    expect(sizeOf('Industry details')).toBe('0.875rem');
    expect(sizeOf('Optional subtext')).toBe('1.25rem');
    expect(sizeOf('Get in touch')).toBe('0.75rem');
  });
});

describe('Practices emphasis', () => {
  it('applies configured emphasis weight and opacity to cards and delivery copy', () => {
    vi.mocked(useBreakpointTier).mockReturnValue({ tier: 'md', viewportWidthPx: 820 });
    document.body.innerHTML = renderToStaticMarkup(<PracticesSection content={{
      ...content,
      practices: [{ title: 'Practice', description: 'Make **priorities hold up under scrutiny**.' }],
      delivery: { heading: 'Delivery', text: 'So **nothing is lost in handoffs**.' },
    }} inkColor="#000000" layout={{
      ...DEFAULT_PRACTICES_SECTION_LAYOUT_CONFIG,
      emphasisFontWeight: 'font-black', emphasisOpacityPercent: 50,
    }} />);
    const section = document.querySelector('[data-practices-section]')!;
    const paragraphs = [section.querySelector('.grid p')!, Array.from(section.querySelectorAll('p')).find(node => node.textContent?.includes('nothing is lost in handoffs'))!];
    for (const paragraph of paragraphs) {
      const spans = paragraph.querySelectorAll('span');
      expect((spans[0] as HTMLElement).style.opacity).toBe('0.65');
      expect((spans[1] as HTMLElement).style.opacity).toBe('0.5');
      expect((paragraph as HTMLElement).style.getPropertyValue('--minimal-mode-highlight-weight')).toBe('900');
    }
  });

  it.each([
    [0, '0', '0'],
    [65, '0.65', '1'],
    [100, '1', '1'],
  ] as const)('keeps Content opacity meaningful at %i%% while highlighting selected phrases', (percent, dim, emphasis) => {
    vi.mocked(useBreakpointTier).mockReturnValue({ tier: 'mobile', viewportWidthPx: 390 });
    document.body.innerHTML = renderToStaticMarkup(<PracticesSection content={{
      ...content,
      practices: [{ title: 'Practice', description: 'Make **priorities hold up under scrutiny**.' }],
      delivery: { heading: 'Delivery', text: 'So **nothing is lost in handoffs**.' },
    }} inkColor="#000000" layout={{ ...DEFAULT_PRACTICES_SECTION_LAYOUT_CONFIG, contentOpacityPercent: percent }} />);
    const section = document.querySelector('[data-practices-section]')!;
    const card = section.querySelector('.grid p')!;
    const delivery = Array.from(section.querySelectorAll('p')).find(node => node.textContent?.includes('nothing is lost in handoffs'))!;
    for (const paragraph of [card, delivery]) {
      const spans = paragraph.querySelectorAll('span');
      expect((paragraph as HTMLElement).style.opacity).toBe('');
      expect((spans[0] as HTMLElement).style.opacity).toBe(dim);
      expect((spans[1] as HTMLElement).style.opacity).toBe(emphasis);
      expect(paragraph.textContent).not.toContain('**');
    }
  });
});
