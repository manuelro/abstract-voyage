import { afterEach, describe, expect, it, vi } from 'vitest';

import { getStaticProps } from './admin';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('editor production exclusion', () => {
  it('prerenders the editor only outside production', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    await expect(getStaticProps({} as never)).resolves.toEqual({ props: {} });
  });

  it('returns notFound in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    await expect(getStaticProps({} as never)).resolves.toEqual({ notFound: true });
  });
});
