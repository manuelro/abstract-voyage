/** One source-heading format for every editorial quote variant. */
export function formatQuoteSourceHeading(
  title: string,
  period: string,
  showTitle = true,
  showPeriod = true,
): string {
  const visibleTitle = showTitle ? title.trim() : '';
  const visiblePeriod = showPeriod ? period.trim() : '';
  if (visibleTitle && visiblePeriod) return `${visibleTitle} (${visiblePeriod})`;
  return visibleTitle || visiblePeriod;
}
