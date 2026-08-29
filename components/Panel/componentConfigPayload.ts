export type ComponentConfigPayload = {
  component: string;
  scope: string;
  targetFile: string;
  targetSymbol: string;
  targetType: string;
  config: Record<string, string | number | boolean>;
  updateStrategy?: 'replace_scope' | 'merge';
  completeScope?: boolean;
};

function formatScalar(value: string | number | boolean): string {
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '0';
    return Number(value.toFixed(4)).toString();
  }
  return `'${value.replace(/'/g, "''")}'`;
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
