import { cloneElement, isValidElement, useEffect, useMemo } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { createGradientTextureSource } from '../../../helpers/gradientTextureSurface';

/**
 * Shared Storybook decorator for any component whose gradient fill/border
 * mode needs a live `gradientSource` prop — a canvas-backed texture source
 * with its own animation loop, not a static value `extraArgs` could ever
 * express. Extracted from `CtaButton/stories/component.stories.tsx`'s own hand-authored
 * `GradientStory` (identical canvas-painting logic) so every generated
 * file needing this shares one implementation instead of each duplicating
 * ~30 lines of animation code. The hand-authored `CtaButton/stories/component.stories.tsx`
 * itself is deliberately left as-is — adopting this shared version there
 * is a separate, optional, human choice, not something this automation
 * does on its own.
 *
 * Clones the rendered story element to inject `gradientSource` onto it,
 * matching `GradientStory`'s own mechanism exactly (Storybook decorators
 * receive the already-rendered story as `children`, not a component to
 * invoke, so wrapping in an extra DOM node can't add the prop — only
 * `cloneElement` can).
 */
export function GradientTextureSourceDecorator({ children }: { children: ReactNode }) {
  const source = useMemo(() => createGradientTextureSource(), []);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 500;
    source.setCanvas(canvas);
    let frame = 0;
    const render = (time: number) => {
      const context = canvas.getContext('2d');
      if (context) {
        const phase = Math.sin(time / 1800) * 90;
        const gradient = context.createLinearGradient(phase, 0, canvas.width + phase, canvas.height);
        gradient.addColorStop(0, '#ff00a8');
        gradient.addColorStop(0.36, '#6d33ff');
        gradient.addColorStop(0.68, '#35e5ed');
        gradient.addColorStop(1, '#eeff00');
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
        source.notify();
      }
      frame = window.requestAnimationFrame(render);
    };
    frame = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(frame);
  }, [source]);

  return isValidElement(children)
    ? cloneElement(children as ReactElement<{ gradientSource: typeof source }>, {
      gradientSource: source,
    })
    : null;
}
