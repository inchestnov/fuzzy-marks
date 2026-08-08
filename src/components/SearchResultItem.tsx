import { useEffect, useRef } from 'react'
import type { BookmarkDocument } from '@/types'
import { matchRanges } from '@/search/highlight'
import { Favicon } from './Favicon'
import { HighlightedText } from './HighlightedText'
import { Kbd } from './Kbd'
import { formatRelativeTime } from './relativeTime'

interface SearchResultItemProps {
  document: BookmarkDocument
  tokens: string[]
  selected: boolean
  onSelect: () => void
  onOpen: () => void
}

/** "Bookmark" / "History" plus whichever secondary detail applies, always in muted secondary color per spec — never accent-tinted, so it stays informative without competing with the title. */
function describeSource(document: BookmarkDocument): string {
  if (document.source === 'history') {
    const time = document.dateAdded ? formatRelativeTime(document.dateAdded) : undefined
    return time ? `History · ${time}` : 'History'
  }
  if (document.source === 'tab') {
    return 'Open tab'
  }
  const breadcrumb = document.path ? document.path.split(' / ').join(' › ') : null
  return breadcrumb ? `Bookmark · ${breadcrumb}` : 'Bookmark'
}

export function SearchResultItem({ document, tokens, selected, onSelect, onOpen }: SearchResultItemProps) {
  const ref = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (selected) {
      ref.current?.scrollIntoView({ block: 'nearest' })
    }
  }, [selected])

  return (
    <button
      ref={ref}
      type="button"
      onMouseEnter={onSelect}
      onClick={onOpen}
      className={`group relative flex w-full animate-row-in items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-100 ${
        selected ? 'bg-[var(--color-surface-selected)]' : 'hover:bg-[var(--color-surface)]'
      }`}
    >
      <span
        aria-hidden
        className={`absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-full bg-[var(--color-accent)] transition-opacity duration-150 ${
          selected ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <Favicon url={document.url} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] leading-tight text-[var(--color-text)]">
          <HighlightedText text={document.name} ranges={matchRanges(document.name, tokens)} />
        </div>
        <div className="mt-0.5 flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 truncate text-[12px] text-[var(--color-text-muted)]">
            {describeSource(document)}
          </span>
          <span className="min-w-0 truncate text-[12px] text-[var(--color-text-muted)] opacity-70">
            <HighlightedText text={document.url} ranges={matchRanges(document.url, tokens)} />
          </span>
        </div>
      </div>
      {selected && <Kbd>↵</Kbd>}
    </button>
  )
}
