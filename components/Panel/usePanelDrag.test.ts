import { describe, expect, it } from 'vitest';
import { recoverPanelOffsetIntoViewport, VISIBLE_MARGIN_PX } from './usePanelDrag';

describe('recoverPanelOffsetIntoViewport', () => {
  const viewport = { width: 1000, height: 700 };

  it('keeps an already reachable panel exactly where the user placed it', () => {
    expect(recoverPanelOffsetIntoViewport(
      { x: 80, y: -40 },
      { left: 300, right: 636, top: 120, bottom: 520, width: 336, height: 400 },
      viewport,
    )).toEqual({ x: 80, y: -40 });
  });

  it('nudges every overflowing edge back within the safe viewport inset', () => {
    expect(recoverPanelOffsetIntoViewport(
      { x: 180, y: 120 },
      { left: 820, right: 1156, top: 540, bottom: 740, width: 336, height: 200 },
      viewport,
    )).toEqual({
      x: 180 - (1156 - (viewport.width - VISIBLE_MARGIN_PX)),
      y: 120 - (740 - (viewport.height - VISIBLE_MARGIN_PX)),
    });
  });

  it('anchors an oversized panel to the safe top-left instead of oscillating', () => {
    expect(recoverPanelOffsetIntoViewport(
      { x: 0, y: 0 },
      { left: -70, right: 1050, top: -30, bottom: 870, width: 1120, height: 900 },
      viewport,
    )).toEqual({ x: 70 + VISIBLE_MARGIN_PX, y: 30 + VISIBLE_MARGIN_PX });
  });
});
