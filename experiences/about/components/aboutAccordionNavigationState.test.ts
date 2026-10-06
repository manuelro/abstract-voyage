// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const selection = { activeIndex: 2, expandedSlideIds: [2] };

async function loadWithNavigation(type: 'navigate' | 'reload', name: string) {
  vi.resetModules();
  vi.spyOn(performance, 'getEntriesByType').mockReturnValue([{ type, name }] as unknown as PerformanceEntry[]);
  return import('./aboutAccordionNavigationState');
}

describe('about accordion history selection', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({ key: 'about-entry' }, '', '/about');
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('restores the same history entry after client navigation', async () => {
    const state = await loadWithNavigation('navigate', window.location.href);
    state.writeAboutAccordionSelection(selection);
    window.history.replaceState({ key: 'new-entry' }, '', '/contact');
    expect(state.readAboutAccordionSelection()).toEqual({});
    window.history.replaceState({ key: 'about-entry' }, '', '/about');
    expect(state.readAboutAccordionSelection()).toEqual(selection);
  });

  it('starts fresh when the about entry itself reloads', async () => {
    window.sessionStorage.setItem('aboutAccordionSelection:about-entry', JSON.stringify(selection));
    const state = await loadWithNavigation('reload', window.location.href);
    expect(state.readAboutAccordionSelection()).toEqual({});
    expect(window.sessionStorage.getItem('aboutAccordionSelection:about-entry')).toBeNull();
  });

  it('keeps the selection after a linked page reloads and Back returns', async () => {
    window.sessionStorage.setItem('aboutAccordionSelection:about-entry', JSON.stringify(selection));
    const state = await loadWithNavigation('reload', `${window.location.origin}/contact`);
    expect(state.readAboutAccordionSelection()).toEqual(selection);
  });
});
