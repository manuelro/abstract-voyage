import type { CSSProperties } from 'react';
import { tailwindTokenCssValue } from '../../../components/Panel/config/tailwindFields';
import { useBreakpointTier } from '../../../components/useBreakpointTier';
import { MinimalModeText } from './AbstractPostDock/components/MinimalModeText';
import {
  DEFAULT_PRACTICES_SECTION_LAYOUT_CONFIG,
  type PracticesSectionLayoutConfig,
} from './PracticesSection.config';

type Props = {
  title: string;
  text: string;
  inkColor: string;
  layout?: PracticesSectionLayoutConfig;
  placement?: 'grid' | 'featured-intro';
  style?: CSSProperties;
};

/** The same title-and-body treatment serves each practice and the wall lead's introduction. */
export function PracticeCard({ title, text, inkColor, layout = DEFAULT_PRACTICES_SECTION_LAYOUT_CONFIG, placement = 'grid', style }: Props) {
  const { tier } = useBreakpointTier();
  const titleSize = tier === 'lg'
    ? tailwindTokenCssValue('fontSize', 'lg', layout.subsectionTitleFontSizeLg)
    : tier === 'md'
      ? tailwindTokenCssValue('fontSize', 'md', layout.subsectionTitleFontSizeMd)
      : tailwindTokenCssValue('fontSize', 'base', layout.subsectionTitleFontSize);
  const bodySize = tier === 'lg'
    ? tailwindTokenCssValue('fontSize', 'lg', layout.bodyFontSizeLg)
    : tier === 'md'
      ? tailwindTokenCssValue('fontSize', 'md', layout.bodyFontSizeMd)
      : tailwindTokenCssValue('fontSize', 'base', layout.bodyFontSize);
  const measureCh = tier === 'lg' ? layout.practiceCardMeasureChLg
    : tier === 'md' ? layout.practiceCardMeasureChMd : layout.practiceCardMeasureCh;
  const configuredBodyOpacity = layout.contentOpacityPercent / 100;
  // The lead sits over a darker gradient than the practice grid. Keep the same
  // panel control while raising its default reading contrast in that placement.
  const bodyOpacity = placement === 'featured-intro'
    ? Math.min(1, configuredBodyOpacity * (0.88 / (DEFAULT_PRACTICES_SECTION_LAYOUT_CONFIG.contentOpacityPercent / 100)))
    : configuredBodyOpacity;
  const emphasisOpacity = Math.min(
    1,
    bodyOpacity / (DEFAULT_PRACTICES_SECTION_LAYOUT_CONFIG.contentOpacityPercent / 100),
  ) * layout.emphasisOpacityPercent / 100;

  return (
    <div data-practice-card="" data-practice-card-placement={placement} className="min-w-0 text-left" style={style}>
      <h3 className="leading-snug tracking-tight" style={{
        color: inkColor,
        fontSize: titleSize,
        fontFamily: tailwindTokenCssValue('fontFamily', 'base', layout.subsectionTitleFontFamily),
        fontWeight: tailwindTokenCssValue('fontWeight', 'base', layout.subsectionTitleFontWeight),
        opacity: layout.titleOpacityPercent / 100,
      }}>{title}</h3>
      <MinimalModeText
        presentation="inherit"
        text={text}
        dimOpacity={bodyOpacity}
        emphasisOpacity={emphasisOpacity}
        highlightedWordFontWeight={tailwindTokenCssValue('fontWeight', 'base', layout.emphasisFontWeight)}
        className="mt-3 leading-relaxed"
        style={{ fontSize: bodySize, maxWidth: `${measureCh}ch` }}
      />
    </div>
  );
}
