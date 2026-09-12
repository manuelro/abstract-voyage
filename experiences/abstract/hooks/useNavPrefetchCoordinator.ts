import { useRef } from 'react';
import type { NextRouter } from 'next/router';

export type NavPrefetchStatus = 'idle' | 'warming' | 'ready' | 'failed';

type RequestIdleCallbackHandle = number;
type RequestIdleCallbackFn = (
  callback: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void,
  options?: { timeout: number },
) => RequestIdleCallbackHandle;

const IDLE_TIMEOUT_MS = 2000;

function isConnectionConstrained(): boolean {
  if (typeof navigator === 'undefined') return false;
  const connection = (navigator as unknown as {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  if (!connection) return false;
  if (connection.saveData === true) return true;
  return connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
}

/** Deduplicated warming coordinator for MobileNavCube's Face E destinations.
 * Idle warming and burger-intent warming share the same per-href status map
 * so neither path re-issues a `router.prefetch()` already in flight or done. */
export function createNavPrefetchCoordinator(router: NextRouter) {
  const status = new Map<string, NavPrefetchStatus>();
  let idleHandle: RequestIdleCallbackHandle | null = null;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;

  const warm = async (href: string): Promise<void> => {
    const current = status.get(href);
    if (current === 'warming' || current === 'ready') return;
    status.set(href, 'warming');
    try {
      await router.prefetch(href);
      status.set(href, 'ready');
    } catch {
      status.set(href, 'failed');
    }
  };

  const warmAll = (hrefs: ReadonlyArray<string>) => Promise.allSettled(hrefs.map(warm));

  const cancelIdle = () => {
    if (idleHandle !== null) {
      const cancelIdleCallback = (window as unknown as {
        cancelIdleCallback?: (handle: RequestIdleCallbackHandle) => void;
      }).cancelIdleCallback;
      cancelIdleCallback?.(idleHandle);
      idleHandle = null;
    }
    if (idleTimer !== null) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  };

  const scheduleIdleWarm = (hrefs: ReadonlyArray<string>) => {
    if (typeof window === 'undefined' || isConnectionConstrained()) return;
    cancelIdle();
    const run = () => { void warmAll(hrefs); };
    const requestIdleCallback = (window as unknown as {
      requestIdleCallback?: RequestIdleCallbackFn;
    }).requestIdleCallback;
    if (requestIdleCallback) {
      idleHandle = requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS });
    } else {
      idleTimer = setTimeout(run, IDLE_TIMEOUT_MS);
    }
  };

  const warmIntent = (hrefs: ReadonlyArray<string>) => { void warmAll(hrefs); };

  const dispose = cancelIdle;

  return { scheduleIdleWarm, warmIntent, dispose };
}

export type NavPrefetchCoordinator = ReturnType<typeof createNavPrefetchCoordinator>;

export function useNavPrefetchCoordinator(router: NextRouter): NavPrefetchCoordinator {
  const coordinatorRef = useRef<NavPrefetchCoordinator | null>(null);
  if (!coordinatorRef.current) {
    coordinatorRef.current = createNavPrefetchCoordinator(router);
  }
  return coordinatorRef.current;
}
