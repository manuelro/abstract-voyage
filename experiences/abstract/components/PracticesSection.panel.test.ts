import { describe, expect, it } from 'vitest';
import { getConfigScopeFieldKeys } from '../../../components/Panel/config';
import { DEFAULT_PRACTICES_SECTION_LAYOUT_CONFIG } from './PracticesSection.config';
import { PRACTICES_SECTION_LAYOUT_PANEL } from './PracticesSection.panel';

const responsiveKeys = [
  ['labelFontSize', 'sectionTitleFontSize', 'subsectionTitleFontSize', 'leadFontSize', 'bodyFontSize', 'subtextFontSize', 'ctaFontSize', 'sectionPaddingTop', 'sectionPaddingBottom', 'titleGroupGap', 'gridToDividerGap', 'dividerToDetailsGap', 'industryGap', 'ctaGap', 'paragraphMaxWidth', 'practiceCardMeasureCh', 'columnGap', 'rowGap'],
  ['labelFontSizeMd', 'sectionTitleFontSizeMd', 'subsectionTitleFontSizeMd', 'leadFontSizeMd', 'bodyFontSizeMd', 'subtextFontSizeMd', 'ctaFontSizeMd', 'sectionPaddingTopMd', 'sectionPaddingBottomMd', 'titleGroupGapMd', 'gridToDividerGapMd', 'dividerToDetailsGapMd', 'industryGapMd', 'ctaGapMd', 'paragraphMaxWidthMd', 'practiceCardMeasureChMd', 'columnGapMd', 'rowGapMd'],
  ['labelFontSizeLg', 'sectionTitleFontSizeLg', 'subsectionTitleFontSizeLg', 'leadFontSizeLg', 'bodyFontSizeLg', 'subtextFontSizeLg', 'ctaFontSizeLg', 'sectionPaddingTopLg', 'sectionPaddingBottomLg', 'titleGroupGapLg', 'gridToDividerGapLg', 'dividerToDetailsGapLg', 'industryGapLg', 'ctaGapLg', 'paragraphMaxWidthLg', 'practiceCardMeasureChLg', 'columnGapLg', 'rowGapLg'],
];

describe('Practices section panel', () => {
  it('covers every config value exactly once across the device tabs', () => {
    const entry = PRACTICES_SECTION_LAYOUT_PANEL.fields[0];
    expect(entry.kind).toBe('tabs');
    if (entry.kind !== 'tabs') return;

    expect(entry.tabs.map(tab => tab.id)).toEqual(['all-sizes', 'mobile', 'tablet', 'desktop']);
    const keys = getConfigScopeFieldKeys(PRACTICES_SECTION_LAYOUT_PANEL.fields);
    expect(keys).toHaveLength(Object.keys(DEFAULT_PRACTICES_SECTION_LAYOUT_CONFIG).length);
    expect([...keys].sort()).toEqual(Object.keys(DEFAULT_PRACTICES_SECTION_LAYOUT_CONFIG).sort());

    const keysByTab = entry.tabs.map(tab => tab.fields.flatMap(group => (
      group.kind === 'group' ? group.fields.flatMap(field => 'key' in field ? [field.key] : []) : []
    )));
    keysByTab.slice(1).forEach((tabKeys, index) => {
      expect(tabKeys.sort()).toEqual([...responsiveKeys[index]].sort());
    });
    const sharedKeys = keysByTab[0];
    expect(sharedKeys).toHaveLength(keys.length - responsiveKeys.flat().length);
    expect(sharedKeys.filter(key => responsiveKeys.flat().includes(key))).toEqual([]);
  });
});
