import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type PageCapabilityRuntime = { introStartAt: number | null | undefined };
const PageCapabilityRuntimeContext = createContext<PageCapabilityRuntime>({ introStartAt: undefined });

/** Shared lifecycle source for registered component capabilities. */
export function PageCapabilityRuntimeProvider({ children }: { children: ReactNode }) {
  const [introStartAt, setIntroStartAt] = useState<number | null>(null);
  useEffect(() => {
    let secondFrame: number | undefined;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => setIntroStartAt(Date.now()));
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame !== undefined) window.cancelAnimationFrame(secondFrame);
    };
  }, []);
  return <PageCapabilityRuntimeContext.Provider value={{ introStartAt }}>{children}</PageCapabilityRuntimeContext.Provider>;
}

export function usePageCapabilityRuntime() {
  return useContext(PageCapabilityRuntimeContext);
}
