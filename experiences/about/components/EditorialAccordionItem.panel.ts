import { createTailwindFieldFactory } from '../../../components/Panel/config';
import type { ConfigScopeDefinition } from '../../../components/Panel/config/types';
import type { AboutMobileAccordionConfig } from './AboutMobileAccordion.config';

const tailwindHeroAccordionItemField = createTailwindFieldFactory<AboutMobileAccordionConfig>();

export const EDITORIAL_ACCORDION_ITEM_FIELDS = [
    {
      kind: 'tabs',
      tabs: [
        {
          id: 'mobile',
          label: 'MOBILE (< 768px)',
          fields: [
            tailwindHeroAccordionItemField('fontSize', {
              key: 'contentFontSizeClassName',
              label: 'Content font size',
              description: 'Font size for the heading and description on mobile.',
              visibleWhen: config => config.enabled,
            }),
            tailwindHeroAccordionItemField('paddingX', {
              key: 'affordancePaddingX',
              label: 'Preview padding (horizontal)',
              description: 'Horizontal padding for the heading row and description on mobile.',
              visibleWhen: config => config.enabled,
            }),
            tailwindHeroAccordionItemField('paddingY', {
              key: 'affordancePaddingY',
              label: 'Preview padding (vertical)',
              description: 'Vertical padding for the heading row and description on mobile.',
              visibleWhen: config => config.enabled,
            }),
          ],
        },
        {
          id: 'tablet',
          label: 'TABLET (≥ 768px)',
          fields: [
            tailwindHeroAccordionItemField('fontSize', {
              breakpoint: 'md',
              key: 'contentFontSizeClassNameWide',
              label: 'Content font size',
              description: 'Tablet font size for the heading and description.',
              visibleWhen: config => config.enabled,
            }),
            tailwindHeroAccordionItemField('paddingX', {
              breakpoint: 'md',
              key: 'affordancePaddingXWide',
              label: 'Preview padding (horizontal)',
              description: 'Tablet horizontal padding for the heading row and description.',
              visibleWhen: config => config.enabled,
            }),
            tailwindHeroAccordionItemField('paddingY', {
              breakpoint: 'md',
              key: 'affordancePaddingYWide',
              label: 'Preview padding (vertical)',
              description: 'Tablet vertical padding for the heading row and description.',
              visibleWhen: config => config.enabled,
            }),
          ],
        },
        {
          id: 'desktop',
          label: 'DESKTOP (≥ 1024px)',
          fields: [
            tailwindHeroAccordionItemField('fontSize', {
              breakpoint: 'lg',
              key: 'contentFontSizeClassNameLg',
              label: 'Content font size',
              description: 'Desktop font size for the heading and description.',
              visibleWhen: config => config.enabled,
            }),
            tailwindHeroAccordionItemField('paddingX', {
              breakpoint: 'lg',
              key: 'affordancePaddingXLg',
              label: 'Preview padding (horizontal)',
              description: 'Desktop horizontal padding for the heading row and description.',
              visibleWhen: config => config.enabled,
            }),
            tailwindHeroAccordionItemField('paddingY', {
              breakpoint: 'lg',
              key: 'affordancePaddingYLg',
              label: 'Preview padding (vertical)',
              description: 'Desktop vertical padding for the heading row and description.',
              visibleWhen: config => config.enabled,
            }),
          ],
        },
      ],
    },
    {
      kind: 'boolean',
      key: 'headerTextWrapEnabled',
      label: 'Allow header text to wrap',
      description: 'Applies at every breakpoint. Keeps the full editorial headline visible.',
      visibleWhen: config => config.enabled,
    },
  ] satisfies ConfigScopeDefinition<AboutMobileAccordionConfig>['fields'];

export const EDITORIAL_ACCORDION_ITEM_HIDDEN_KEYS = [
    'enabled', 'previewMinHeight', 'maxExpandedItems', 'collapseLeadFraction',
    'transitionMs', 'transitionEasing', 'contentSettleMs',
    'affordanceRotationDurationMs', 'affordanceRotationEasing',
    'affordanceBorderThicknessClassName', 'affordanceCornerRadiusClassName',
    'affordanceDimensionClassName', 'affordanceRotateCollapsedDeg', 'affordanceRotateExpandedDeg',
    'affordanceColorMode', 'affordanceCustomColor',
    'affordanceHoverOpacity', 'affordanceHoverTransitionMs', 'affordanceHoverEasing',
    'affordanceMouseOutTransitionMs', 'affordanceMouseOutEasing',
    'outerBorderColorMode', 'outerBorderSurfaceOffset', 'outerBorderCustomColor', 'outerBorderWidthClassName',
    'innerBorderColorMode', 'innerBorderSurfaceOffset', 'innerBorderCustomColor',
    'innerBorderOpacity', 'innerBorderWidthClassName',
    'textColorMode', 'textSurfaceOffset', 'textCustomColor',
    'openIndicatorEnabled', 'openIndicatorSizeClassName', 'openIndicatorOverlapFraction',
    // Body padding remains part of About's interactive accordion. Static
    // editorial items use the shared heading-row spacing controls above.
    'itemContentPaddingTop', 'itemContentPaddingTopWide',
    'itemContentPaddingRight', 'itemContentPaddingRightWide',
    'itemContentPaddingBottom', 'itemContentPaddingBottomWide',
    'itemContentPaddingLeft', 'itemContentPaddingLeftWide',
  ] satisfies ConfigScopeDefinition<AboutMobileAccordionConfig>['hiddenKeys'];
