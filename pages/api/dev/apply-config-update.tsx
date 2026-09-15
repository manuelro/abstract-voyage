import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseComponentConfigUpdatePayloads } from '../../../components/Panel/config/componentConfigUpdateParser';
import { applyComponentConfigUpdateToSource } from '../../../components/Panel/config/applyComponentConfigUpdate';

const PROJECT_ROOT = process.cwd();

const LOCALHOST_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

type ApplyResultEntry = {
  targetSymbol: string;
  targetFile: string;
  ok: boolean;
  changedKeys?: string[];
  unmatchedKeys?: string[];
  unmentionedExistingKeys?: string[];
  error?: string;
};

/**
 * Applies one or more component-config-update/v1 payload blocks straight to
 * their target source files — the server-side half of the panel's own
 * "Update diff" button (components/Panel/index.tsx's PanelStandardHeaderActions).
 * Writes real files on disk; guarded on two independent axes (never
 * production, never a non-loopback caller) since neither should ever be
 * necessary for its one real use case — a developer's own local `next dev`
 * with the settings panel open in the same browser.
 *
 * Each block is applied independently: one scope's target_symbol not being
 * found (or a field mismatch) does not prevent the others from writing.
 * applyComponentConfigUpdateToSource itself never partially writes a single
 * file — either every field in one block's config: resolves, or that file is
 * left untouched and its entry reports the mismatch.
 */
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

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { payload } = (req.body ?? {}) as { payload?: unknown };
  if (typeof payload !== 'string' || payload.trim().length === 0) {
    res.status(400).json({ error: 'Request body must be { payload: string } (a component-config-update/v1 payload).' });
    return;
  }

  let parsedPayloads;
  try {
    parsedPayloads = parseComponentConfigUpdatePayloads(payload);
  } catch (error) {
    res.status(400).json({ error: `Failed to parse payload: ${(error as Error).message}` });
    return;
  }
  if (parsedPayloads.length === 0) {
    res.status(400).json({ error: 'No component-config-update/v1 blocks found in payload.' });
    return;
  }

  const results: ApplyResultEntry[] = [];
  for (const parsed of parsedPayloads) {
    const resolvedPath = path.resolve(PROJECT_ROOT, parsed.targetFile);
    // Guard against a payload's target_file escaping the project root (e.g.
    // a stray leading `../`) before ever touching the filesystem with it.
    if (!resolvedPath.startsWith(PROJECT_ROOT + path.sep)) {
      results.push({
        targetSymbol: parsed.targetSymbol,
        targetFile: parsed.targetFile,
        ok: false,
        error: 'target_file resolves outside the project root; refusing to write.',
      });
      continue;
    }

    try {
      const sourceText = await fs.readFile(resolvedPath, 'utf8');
      const applied = applyComponentConfigUpdateToSource(sourceText, parsed);
      if (!applied.ok || applied.updatedSource === undefined) {
        results.push({
          targetSymbol: parsed.targetSymbol,
          targetFile: parsed.targetFile,
          ok: false,
          unmatchedKeys: applied.unmatchedKeys,
          error: applied.error,
        });
        continue;
      }
      await fs.writeFile(resolvedPath, applied.updatedSource, 'utf8');
      results.push({
        targetSymbol: parsed.targetSymbol,
        targetFile: parsed.targetFile,
        ok: true,
        changedKeys: applied.changedKeys,
        unmentionedExistingKeys: applied.unmentionedExistingKeys.length > 0
          ? applied.unmentionedExistingKeys
          : undefined,
      });
    } catch (error) {
      results.push({
        targetSymbol: parsed.targetSymbol,
        targetFile: parsed.targetFile,
        ok: false,
        error: (error as Error).message,
      });
    }
  }

  const allOk = results.every(result => result.ok);
  res.status(allOk ? 200 : 207).json({ ok: allOk, results });
}
