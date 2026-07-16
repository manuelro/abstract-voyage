export type ContactLoadingLabelMode = 'thinking' | 'submitted-message';
export type ContactLoadingEffectStyle = 'shimmer' | 'pulse' | 'static';

export type ContactExperienceConfig = {
  contentMaxWidthPx: number;
  conversationMaxWidthPx: number;
  desktopColumnGapPx: number;
  opticalOffsetYVh: number;
  mobileInsetPx: number;
  messageMeasureCh: number;
  baseTextSizePx: number;
  conversationTextSizePx: number;
  lineHeight: number;
  mutedTextOpacity: number;
  messageGapPx: number;
  controlGapPx: number;
  actionGapPx: number;
  chipHeightPx: number;
  chipPaddingXPx: number;
  conversationViewportHeightPx: number;
  loadingEffectEnabled: boolean;
  loadingLabelMode: ContactLoadingLabelMode;
  loadingEffectStyle: ContactLoadingEffectStyle;
  loadingShimmerDurationMs: number;
  loadingMinimumVisibleMs: number;
  messageEntryDurationMs: number;
  showProgress: boolean;
  primaryTextColor: string;
  mutedTextColor: string;
  borderColor: string;
  loadingBaseColor: string;
  loadingHighlightColor: string;
  activeChipOpacity: number;
};

export const DEFAULT_CONTACT_EXPERIENCE_CONFIG: ContactExperienceConfig = {
  contentMaxWidthPx: 1180,
  conversationMaxWidthPx: 580,
  desktopColumnGapPx: 88,
  opticalOffsetYVh: -1.5,
  mobileInsetPx: 20,
  messageMeasureCh: 48,
  baseTextSizePx: 16,
  conversationTextSizePx: 18,
  lineHeight: 1.5,
  mutedTextOpacity: 0.64,
  messageGapPx: 20,
  controlGapPx: 12,
  actionGapPx: 10,
  chipHeightPx: 44,
  chipPaddingXPx: 18,
  conversationViewportHeightPx: 360,
  loadingEffectEnabled: true,
  loadingLabelMode: 'thinking',
  loadingEffectStyle: 'shimmer',
  loadingShimmerDurationMs: 1400,
  loadingMinimumVisibleMs: 320,
  messageEntryDurationMs: 240,
  showProgress: true,
  primaryTextColor: '#f7f7f2',
  mutedTextColor: '#d7dbde',
  borderColor: '#ffffff',
  loadingBaseColor: '#8f9497',
  loadingHighlightColor: '#f7f7f2',
  activeChipOpacity: 0.12,
};
