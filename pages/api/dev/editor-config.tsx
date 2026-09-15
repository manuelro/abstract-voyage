import fs from 'node:fs/promises';
import path from 'node:path';
import type { NextApiRequest, NextApiResponse } from 'next';

const LOCALHOST_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const CONFIG_PATH = path.join(process.cwd(), 'editor', 'decap.config.yml');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).end();
    return;
  }

  const remoteAddress = req.socket.remoteAddress ?? '';
  if (!LOCALHOST_ADDRESSES.has(remoteAddress)) {
    res.status(403).json({ error: 'This endpoint only accepts requests from localhost.' });
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const config = await fs.readFile(CONFIG_PATH, 'utf8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
    res.status(200).send(config);
  } catch {
    res.status(500).json({ error: 'Unable to read the local editor configuration.' });
  }
}
