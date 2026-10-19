import matter from 'gray-matter';

/** Update the wall's authored column cap without reformatting its copy. */
export function applyWallColumnCapToYaml(source: string, value: number): string {
  if (!Number.isInteger(value) || value < 280 || value > 800) {
    throw new Error('Wall maxColumnWidthPx must be an integer from 280 to 800.');
  }

  const manifest = matter(source).data as { layout?: { maxColumnWidthPx?: unknown } };
  if (typeof manifest?.layout?.maxColumnWidthPx !== 'number') {
    throw new Error('content/wall.md is missing layout.maxColumnWidthPx.');
  }

  const lines = source.split('\n');
  const layoutIndex = lines.findIndex(line => /^layout:\s*$/.test(line));
  if (layoutIndex < 0) throw new Error('content/wall.md is missing its layout block.');
  let fieldIndex = -1;
  for (let index = layoutIndex + 1; index < lines.length; index += 1) {
    if (lines[index].trim() !== '' && !/^\s/.test(lines[index])) break;
    if (/^  maxColumnWidthPx:\s*\d+\s*(?:#.*)?$/.test(lines[index])) {
      fieldIndex = index;
      break;
    }
  }
  if (fieldIndex < 0) throw new Error('Could not locate layout.maxColumnWidthPx in content/wall.md.');
  lines[fieldIndex] = lines[fieldIndex].replace(/^(  maxColumnWidthPx:\s*)\d+/, (_, prefix: string) => `${prefix}${value}`);
  return lines.join('\n');
}
