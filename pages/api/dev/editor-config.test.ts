import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

import handler from './editor-config';

function createResponse() {
  const state: { body?: unknown; statusCode?: number; headers: Record<string, string> } = {
    headers: {},
  };
  const response = {
    status(code: number) {
      state.statusCode = code;
      return response;
    },
    setHeader(name: string, value: string) {
      state.headers[name] = value;
      return response;
    },
    send(body: unknown) {
      state.body = body;
      return response;
    },
    json(body: unknown) {
      state.body = body;
      return response;
    },
    end() {
      return response;
    },
  };

  return { response: response as unknown as NextApiResponse, state };
}

function createRequest(remoteAddress = '127.0.0.1') {
  return { method: 'GET', socket: { remoteAddress } } as unknown as NextApiRequest;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('editor config endpoint', () => {
  it('is unavailable in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { response, state } = createResponse();

    await handler(createRequest(), response);

    expect(state.statusCode).toBe(404);
  });

  it('rejects non-loopback callers', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { response, state } = createResponse();

    await handler(createRequest('192.0.2.10'), response);

    expect(state.statusCode).toBe(403);
  });

  it('serves the CMS schema to a local development request', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { response, state } = createResponse();

    await handler(createRequest(), response);

    expect(state.statusCode).toBe(200);
    expect(state.headers['Content-Type']).toBe('text/yaml; charset=utf-8');
    expect(state.body).toContain('collections:');
  });
});
