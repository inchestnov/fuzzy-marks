import type { ReactNode } from 'react'
import type { MatchRange } from '@/search/highlight'

/** Renders `text` with the given match ranges wrapped in a soft accent highlight. */
export function HighlightedText({ text, ranges }: { text: string; ranges: MatchRange[] }) {
  if (ranges.length === 0) return <>{text}</>

  const parts: ReactNode[] = []
  let cursor = 0
  ranges.forEach(({ start, end }, index) => {
    if (start > cursor) parts.push(text.slice(cursor, start))
    parts.push(
      <span key={index} className="rounded-sm bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
        {text.slice(start, end)}
      </span>,
    )
    cursor = end
  })
  if (cursor < text.length) parts.push(text.slice(cursor))

  return <>{parts}</>
}
