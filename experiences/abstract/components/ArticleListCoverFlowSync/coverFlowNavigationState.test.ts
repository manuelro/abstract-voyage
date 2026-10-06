// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function loadWithNavigation(type: 'navigate' | 'reload', name: string) {
  vi.resetModules();
  vi.spyOn(performance, 'getEntriesByType').mockReturnValue([{ type, name }] as unknown as PerformanceEntry[]);
  return import('./coverFlowNavigationState');
}

describe('CoverFlow history selection', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({ key: 'abstract-entry' }, '', '/abstract');
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('keeps the exact article on the original history entry', async () => {
    const state = await loadWithNavigation('navigate', window.location.href);
    state.writeCoverFlowSelection('second-article');
    window.history.replaceState({ key: 'other-entry' }, '', '/posts/example');
    expect(state.readCoverFlowSelection()).toBeUndefined();
    window.history.replaceState({ key: 'abstract-entry' }, '', '/abstract');
    expect(state.readCoverFlowSelection()).toBe('second-article');
  });

  it('starts fresh when the abstract entry reloads', async () => {
    window.sessionStorage.setItem('coverFlowSelection:abstract-entry', 'second-article');
    const state = await loadWithNavigation('reload', window.location.href);
    expect(state.readCoverFlowSelection()).toBeUndefined();
  });

  it('restores after a linked article reloads before Back', async () => {
    window.sessionStorage.setItem('coverFlowSelection:abstract-entry', 'second-article');
    const state = await loadWithNavigation('reload', `${window.location.origin}/posts/example`);
    expect(state.readCoverFlowSelection()).toBe('second-article');
  });
});
