export type ComponentConfigPayload = {
  component: string;
  scope: string;
  targetFile: string;
  targetSymbol: string;
  targetType: string;
  // Config values are typed ConfigScalar (string | number | boolean) at the
  // panel-binding boundary, but a scope's own TConfig can legitimately hold
  // a plain number-tuple field (e.g. a cubic-bezier easing array) that slips
  // through that scalar type uncaught at runtime — accepted here too so
  // formatScalar below has something correct to do with it instead of
  // crashing (regression: `value.replace is not a function`, an array
  // reaching the string branch).
  config: Record<string, string | number | boolean | readonly number[]>;
  updateStrategy?: 'replace_scope' | 'merge';
  completeScope?: boolean;
};

function formatScalar(value: string | number | boolean | readonly number[]): string {
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '0';
    return Number(value.toFixed(4)).toString();
  }
  if (Array.isArray(value)) {
    return `[${value.map(entry => formatScalar(entry)).join(', ')}]`;
  }
  return `'${(value as string).replace(/'/g, "''")}'`;
}

export function formatComponentConfigPayload({
  component,
  scope,
  targetFile,
  targetSymbol,
  targetType,
  config,
  updateStrategy = 'replace_scope',
  completeScope = true,
}: ComponentConfigPayload): string {
  const configLines = Object.entries(config).map(
    ([key, value]) => `  ${key}: ${formatScalar(value)}`,
  );

  return [
    '# component-config-update/v1',
    `component: ${component}`,
    `scope: ${scope}`,
    `target_file: ${targetFile}`,
    `target_symbol: ${targetSymbol}`,
    `target_type: ${targetType}`,
    `update_strategy: ${updateStrategy}`,
    `complete_scope: ${completeScope}`,
    '',
    'config:',
    ...configLines,
  ].join('\n');
}
