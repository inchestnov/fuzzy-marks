export interface MatchRange {
  start: number
  end: number
}

/**
 * Finds where each token occurs in `text`, in order, mirroring the engine's
 * ordered-substring match (see searchEngine.ts). A token missing from this
 * particular field is skipped — not every token needs to live in every
 * field (e.g. "kub" might only be in the path) — rather than aborting the
 * scan for the rest.
 */
export function matchRanges(text: string, tokens: string[]): MatchRange[] {
  const lower = text.toLowerCase()
  const ranges: MatchRange[] = []
  let cursor = 0
  for (const token of tokens) {
    if (!token) continue
    const index = lower.indexOf(token, cursor)
    if (index === -1) continue
    ranges.push({ start: index, end: index + token.length })
    cursor = index + token.length
  }
  return ranges
}
