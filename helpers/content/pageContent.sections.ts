const DIRECTIVE = /^<!--\s*(?:block|section):([a-z][a-z0-9-]*)\s*-->\s*$/;

/**
 * Parses the intentionally restricted Markdown body format used by static
 * pages. Directives name independently-rendered paragraph blocks; ordinary
 * Markdown is limited to paragraphs and the inline syntax rendered by
 * renderEmphasisText.
 */
export function parseContentSections(source: string, sourceName: string): Record<string, string> {
  const sections: Record<string, string> = {};
  let activeId: string | undefined;
  let lines: string[] = [];
  const commit = () => {
    if (!activeId) return;
    const body = lines.join('\n').trim();
    if (!body) throw new Error(`${sourceName}: section "${activeId}" is empty.`);
    if (sections[activeId]) throw new Error(`${sourceName}: section "${activeId}" is duplicated.`);
    sections[activeId] = body;
  };
  for (const line of source.replace(/\r\n/g, '\n').split('\n')) {
    const directive = line.match(DIRECTIVE);
    if (directive) {
      commit();
      activeId = directive[1];
      lines = [];
    } else if (activeId) lines.push(line);
    else if (line.trim()) throw new Error(`${sourceName}: content must be introduced by a block or section directive.`);
  }
  commit();
  return sections;
}
