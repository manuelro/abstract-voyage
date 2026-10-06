import { createContext, useContext, type ReactNode } from 'react';
import type { PageContent, SiteContent } from './pageContent.schema';

type ContentContextValue = { site: SiteContent; page: PageContent };
const ContentContext = createContext<ContentContextValue | null>(null);

export function SiteContentProvider({ site, page, children }: ContentContextValue & { children: ReactNode }) {
  return <ContentContext.Provider value={{ site, page }}>{children}</ContentContext.Provider>;
}

export function usePageContent<T extends PageContent>(): T {
  const value = useContext(ContentContext);
  if (!value) throw new Error('usePageContent must be used inside SiteContentProvider.');
  return value.page as T;
}
