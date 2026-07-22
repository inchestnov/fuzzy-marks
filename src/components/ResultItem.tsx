import { useEffect, useRef } from 'react'
import type { BookmarkDocument } from '@/types'
import { Favicon } from './Favicon'

interface ResultItemProps {
  document: BookmarkDocument
  selected: boolean
  onSelect: () => void
  onOpen: () => void
}

export function ResultItem({ document, selected, onSelect, onOpen }: ResultItemProps) {
  const ref = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (selected) {
      ref.current?.scrollIntoView({ block: 'nearest' })
    }
  }, [selected])

  const breadcrumb = document.path ? document.path.split(' / ').join(' › ') : null

  return (
    <button
      ref={ref}
      type="button"
      onMouseEnter={onSelect}
      onClick={onOpen}
      className={`group flex w-full items-center gap-3 border-l-2 px-4 py-2.5 text-left transition-colors ${
        selected
          ? 'border-[var(--color-accent)] bg-[var(--color-surface-selected)]'
          : 'border-transparent hover:bg-[var(--color-surface)]'
      }`}
    >
      <Favicon url={document.url} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] leading-tight text-[var(--color-text)]">
          {document.name}
        </div>
        <div className="mt-0.5 flex min-w-0 items-baseline gap-2">
          {breadcrumb && (
            <span className="font-data shrink-0 truncate text-[11px] text-[var(--color-accent)] opacity-80">
              {breadcrumb}
            </span>
          )}
          <span className="font-data min-w-0 truncate text-[11px] text-[var(--color-text-muted)]">
            {document.url}
          </span>
        </div>
      </div>
      {selected && (
        <span className="font-data shrink-0 text-[11px] text-[var(--color-text-muted)]">↵</span>
      )}
    </button>
  )
}
