const WORDS_PER_MINUTE = 200

/** Keeps article cards and article pages on the same reading-time calculation. */
export function getReadingTimeMinutes(content: string) {
  const wordCount = content.replace(/[#_*`>\\-]/g, ' ').split(/\s+/).filter(Boolean).length
  return wordCount ? Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE)) : null
}
