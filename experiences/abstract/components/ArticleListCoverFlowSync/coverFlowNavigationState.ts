const STORAGE_PREFIX = 'coverFlowSelection:';
let checkedInitialReload = false;

function storageKey(): string | undefined {
  const key = window.history.state?.key;
  return typeof key === 'string' && key ? `${STORAGE_PREFIX}${key}` : undefined;
}

export function readCoverFlowSelection(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const key = storageKey();
  if (!key) return undefined;
  try {
    if (!checkedInitialReload) {
      checkedInitialReload = true;
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (navigation?.type === 'reload') {
        const loadedUrl = new URL(navigation.name);
        if (loadedUrl.origin === window.location.origin
          && loadedUrl.pathname === window.location.pathname
          && loadedUrl.search === window.location.search) {
          window.sessionStorage.removeItem(key);
        }
      }
    }
    return window.sessionStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

export function writeCoverFlowSelection(slug: string) {
  if (typeof window === 'undefined') return;
  const key = storageKey();
  if (!key) return;
  try {
    window.sessionStorage.setItem(key, slug);
  } catch {
    // Storage may be disabled; ordinary carousel navigation still works.
  }
}
