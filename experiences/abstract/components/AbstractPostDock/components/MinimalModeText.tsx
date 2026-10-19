import { forwardRef, type ComponentPropsWithoutRef, type CSSProperties } from 'react';
import { renderEmphasisText, stripEmphasisMarkup } from '../../../../../helpers/textEmphasis';
import { abstractPostDockActiveOpacityStyle } from '../helpers/activeOpacityReveal';
import styles from './MinimalModeText.module.css';

export interface MinimalModeTextProps extends Omit<ComponentPropsWithoutRef<'p'>, 'children' | 'dangerouslySetInnerHTML'> {
  /** Plain copy is dimmed; wrap a phrase in **double asterisks** to highlight it. */
  text: string;
  /** Opacity of unmarked text. */
  dimOpacity: number;
  /** Opacity of **highlighted words** and links. */
  emphasisOpacity: number;
  fontSize?: CSSProperties['fontSize'];
  tracking?: CSSProperties['letterSpacing'];
  lineHeight?: CSSProperties['lineHeight'];
  tint?: CSSProperties['color'];
  highlightedWordFontWeight?: CSSProperties['fontWeight'];
  fontFamily?: CSSProperties['fontFamily'];
  /** Embedded paragraphs inherit their host's typography and ink. */
  presentation?: 'dock' | 'inherit';
  isActive?: boolean;
  transitionMs?: number;
  easingCss?: string;
  /** The dock supplies its responsive font-size and width utilities. */
  className?: string;
  style?: CSSProperties;
}

/** Editorial text shared by the minimal dock slide and quote paragraphs. */
export const MinimalModeText = forwardRef<HTMLParagraphElement, MinimalModeTextProps>(function MinimalModeText({
  text,
  dimOpacity,
  emphasisOpacity,
  fontSize,
  tracking,
  lineHeight,
  tint,
  highlightedWordFontWeight,
  fontFamily,
  presentation = 'dock',
  isActive = true,
  transitionMs = 0,
  easingCss = 'ease',
  className = '',
  style,
  ...paragraphProps
}, ref) {
  // Keep an unmarked quote as one text node. Its CSS gradient clips to the
  // paragraph's glyphs, exactly as it did before this shared renderer.
  const plainInheritedText = presentation === 'inherit'
    && dimOpacity === 1
    && emphasisOpacity === 1
    && stripEmphasisMarkup(text) === text;
  return (
    <p
      {...paragraphProps}
      ref={ref}
      className={`${presentation === 'dock' ? 'relative z-10 m-0 text-white [text-wrap:balance] transition-opacity' : ''} ${className}`.trim()}
      style={{
        ...(presentation === 'dock' ? abstractPostDockActiveOpacityStyle({ isActive, transitionMs, easingCss }) : {}),
        fontSize,
        letterSpacing: tracking,
        lineHeight,
        color: tint,
        fontFamily,
        '--minimal-mode-highlight-weight': highlightedWordFontWeight,
        ...(presentation === 'dock' ? { textShadow: 'var(--about-dock-text-shadow, none)' } : {}),
        ...style,
      } as CSSProperties}
    >
      {plainInheritedText ? text : renderEmphasisText(text, dimOpacity, emphasisOpacity, styles.highlighted)}
    </p>
  );
});
