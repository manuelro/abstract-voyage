// Next keeps the history entry's key across Back, but replaces history.state
// itself during route restoration. Store the selection under that key so a
// new /about visit starts independently and Back restores the old entry.
const STORAGE_PREFIX = 'aboutAccordionSelection:';

type Selection = {
  activeIndex?: number;
  expandedSlideIds?: number[];
};

let checkedInitialReload = false;

function storageKey(): string | undefined {
  const key = window.history.state?.key;
  return typeof key === 'string' && key ? `${STORAGE_PREFIX}${key}` : undefined;
}

function clearSelectionOnAboutReload(key: string) {
  if (checkedInitialReload) return;
  checkedInitialReload = true;

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (navigation?.type !== 'reload') return;

  // A reload on a linked page followed by Back still belongs to the old
  // /about entry. Only a document reload *of that entry* starts it fresh.
  const loadedUrl = new URL(navigation.name);
  if (loadedUrl.origin !== window.location.origin
    || loadedUrl.pathname !== window.location.pathname
    || loadedUrl.search !== window.location.search) return;

  window.sessionStorage.removeItem(key);
}

export function readAboutAccordionSelection(): Selection {
  if (typeof window === 'undefined') return {};
  const key = storageKey();
  if (!key) return {};
  try {
    clearSelectionOnAboutReload(key);
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return {};
    const selection = JSON.parse(raw) as Selection;
    return {
      activeIndex: Number.isInteger(selection.activeIndex) && (selection.activeIndex as number) >= 0
        ? selection.activeIndex : undefined,
      expandedSlideIds: Array.isArray(selection.expandedSlideIds)
        ? selection.expandedSlideIds.filter((id): id is number => typeof id === 'number' && Number.isFinite(id))
        : undefined,
    };
  } catch {
    // Storage can be disabled. The accordion remains usable without it.
    return {};
  }
}

export function writeAboutAccordionSelection(update: Selection) {
  if (typeof window === 'undefined') return;
  const key = storageKey();
  if (!key) return;
  try {
    const saved = window.sessionStorage.getItem(key);
    const current = saved ? JSON.parse(saved) as Selection : {};
    window.sessionStorage.setItem(key, JSON.stringify({ ...current, ...update }));
  } catch {
    // Storage can be disabled. The accordion remains usable without it.
  }
}
