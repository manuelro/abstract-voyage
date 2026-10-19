import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ArticleCard } from './ArticleCard';
import { GradientInkSurface, normalizeGradientInkTreatment } from './GradientInkSurface';

describe('GradientInkSurface', () => {
  it('keeps supplied semantic content outside decorative layers', () => {
    const markup = renderToStaticMarkup(
      <div>
        <GradientInkSurface
          backdrop={<canvas />}
          decoration={<span>ornament</span>}
          ink={{ backgroundColor: '#fff', backgroundOpacity: 0.4, foregroundColor: '#123456', blendMode: 'screen' }}
        >
          <p data-gradient-ink-color="">Readable text</p>
        </GradientInkSurface>
      </div>,
    );
    expect(markup).toContain('data-gradient-ink-layer="screen"');
    expect(markup).toContain('--gradient-ink-opacity:0.4');
    expect(markup).toContain('aria-hidden="true"><canvas');
    expect(markup).toContain('aria-hidden="true"><span>ornament</span>');
    expect(markup).toContain('<p data-gradient-ink-color="">Readable text</p>');
  });

  it('allows a vivid mesh with no blended overlay and clamps invalid opacity', () => {
    const markup = renderToStaticMarkup(
      <GradientInkSurface ink={{ backgroundColor: '#fff', backgroundOpacity: 0, foregroundColor: '#000', blendMode: 'screen', blendWhenTransparent: false }}>
        <p>Text</p>
      </GradientInkSurface>,
    );
    expect(markup).toContain('data-gradient-ink-layer="plain"');
    expect(normalizeGradientInkTreatment({ backgroundColor: '#fff', backgroundOpacity: 2, foregroundColor: '#000', blendMode: 'screen' }).backgroundOpacity).toBe(1);
  });

  it('can blend painted glyphs over a fully transparent surface', () => {
    const markup = renderToStaticMarkup(
      <GradientInkSurface ink={{ backgroundColor: '#fff', backgroundOpacity: 0, foregroundColor: '#123456', blendMode: 'multiply', blendWhenTransparent: true }}>
        <p data-gradient-ink-color="">Ink</p>
      </GradientInkSurface>,
    );
    expect(markup).toContain('data-gradient-ink-layer="multiply"');
    expect(markup).toContain('--gradient-ink-opacity:0');
  });

  it('preserves the article card link and plain rendering path', () => {
    const markup = renderToStaticMarkup(
      <ArticleCard title="An article" href="/posts/example" interactive="whole-card" />,
    );
    expect(markup).toContain('href="/posts/example"');
    expect(markup).toContain('data-gradient-ink-layer="off"');
    expect(markup.match(/<a\b/g)).toHaveLength(1);
  });
});
