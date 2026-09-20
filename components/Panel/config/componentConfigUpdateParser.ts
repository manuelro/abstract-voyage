// Inverse of componentConfigPayload.ts's own formatComponentConfigPayload —
// parses a (possibly multi-block) component-config-update/v1 payload back
// into structured data so the "Update diff" endpoint can act on it. Pure
// string-in/data-out (no fs, no `typescript`), so it stays trivially
// unit-testable and safe to import from client code if ever needed, unlike
// applyComponentConfigUpdate.ts's own AST engine next to it.

export type ComponentConfigUpdateScalar = string | number | boolean | readonly number[];

export type ParsedComponentConfigUpdate = {
  component: string;
  scope: string;
  targetFile: string;
  targetSymbol: string;
  targetType: string;
  updateStrategy: 'replace_scope' | 'merge';
  completeScope: boolean;
  knownKeys: readonly string[];
  config: Record<string, ComponentConfigUpdateScalar>;
};

const BLOCK_HEADER_LINE = '# component-config-update/v1';

// Mirrors formatComponentConfigPayload's own formatScalar, in reverse.
// Only ever called on `config:` section values (2-space-indented lines) —
// the header fields (component/scope/target_file/target_symbol/target_type)
// are emitted as bare, unquoted strings by the formatter and are parsed
// directly as raw text instead, never through this function.
function parseScalarValue(raw: string): ComponentConfigUpdateScalar {
  const trimmed = raw.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map(entry => {
      const value = parseScalarValue(entry.trim());
      if (typeof value !== 'number') {
        throw new Error(`Expected a numeric array entry, got "${entry.trim()}"`);
      }
      return value;
    });
  }
  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    // Single-quote escaping is doubled ('' -> '), the same convention
    // formatScalar's own string branch writes and standard YAML uses for
    // single-quoted scalars — not backslash escaping.
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  throw new Error(`Unrecognized config value: "${raw}"`);
}

const HEADER_KEYS = {
  component: 'component',
  scope: 'scope',
  target_file: 'targetFile',
  target_symbol: 'targetSymbol',
  target_type: 'targetType',
  update_strategy: 'updateStrategy',
  complete_scope: 'completeScope',
  known_keys: 'knownKeys',
} as const;

function parseComponentConfigUpdateBlock(block: string): ParsedComponentConfigUpdate {
  const lines = block.split('\n');
  if (lines[0]?.trim() !== BLOCK_HEADER_LINE) {
    throw new Error(`Expected a block starting with "${BLOCK_HEADER_LINE}", got "${lines[0] ?? ''}"`);
  }

  const header: Partial<Record<(typeof HEADER_KEYS)[keyof typeof HEADER_KEYS], string>> = {};
  const config: Record<string, ComponentConfigUpdateScalar> = {};
  let inConfigSection = false;

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === '') continue;
    if (!inConfigSection) {
      if (line.trim() === 'config:') {
        inConfigSection = true;
        continue;
      }
      const headerMatch = line.match(/^([a-z_]+): (.*)$/);
      if (!headerMatch) throw new Error(`Unrecognized header line: "${line}"`);
      const [, rawKey, rawValue] = headerMatch;
      const mappedKey = (HEADER_KEYS as Record<string, string | undefined>)[rawKey];
      if (mappedKey) header[mappedKey as keyof typeof header] = rawValue;
      continue;
    }
    const configMatch = line.match(/^ {2}([A-Za-z0-9_]+): (.*)$/);
    if (!configMatch) throw new Error(`Unrecognized config line: "${line}"`);
    const [, key, rawValue] = configMatch;
    config[key] = parseScalarValue(rawValue);
  }

  const missing = (
    ['component', 'scope', 'targetFile', 'targetSymbol', 'targetType'] as const
  ).filter(key => header[key] === undefined);
  if (missing.length > 0) {
    throw new Error(`Payload block is missing required field(s): ${missing.join(', ')}`);
  }
  if (header.updateStrategy !== undefined
    && header.updateStrategy !== 'replace_scope'
    && header.updateStrategy !== 'merge') {
    throw new Error(`Unrecognized update_strategy: "${header.updateStrategy}"`);
  }

  return {
    component: header.component!,
    scope: header.scope!,
    targetFile: header.targetFile!,
    targetSymbol: header.targetSymbol!,
    targetType: header.targetType!,
    updateStrategy: (header.updateStrategy as 'replace_scope' | 'merge' | undefined) ?? 'replace_scope',
    completeScope: header.completeScope === undefined ? true : header.completeScope === 'true',
    knownKeys: header.knownKeys === undefined || header.knownKeys === ''
      ? []
      : header.knownKeys.split(',').map(key => key.trim()).filter(Boolean),
    config,
  };
}

/** Splits a possibly multi-scope payload (serializeConfigScopeBindings(Diff)
 * joins independent blocks with a blank line) back into one block per
 * scope, then parses each independently — a failure in one scope's own
 * block never prevents the others from parsing. */
export function parseComponentConfigUpdatePayloads(text: string): ParsedComponentConfigUpdate[] {
  const blocks = text
    .split(new RegExp(`(?=^${BLOCK_HEADER_LINE}$)`, 'm'))
    .map(block => block.trim())
    .filter(block => block.length > 0);
  return blocks.map(parseComponentConfigUpdateBlock);
}
