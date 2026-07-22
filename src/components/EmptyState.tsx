interface EmptyStateProps {
  hasQuery: boolean
  hasBookmarks: boolean
}

export function EmptyState({ hasQuery, hasBookmarks }: EmptyStateProps) {
  if (!hasBookmarks) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-1 px-6 text-center">
        <p className="text-[13px] text-[var(--color-text)]">No bookmarks yet</p>
        <p className="text-[12px] text-[var(--color-text-muted)]">
          Save a page to your browser's bookmarks and it'll show up here.
        </p>
      </div>
    )
  }

  if (hasQuery) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-1 px-6 text-center">
        <p className="text-[13px] text-[var(--color-text)]">No matches</p>
        <p className="text-[12px] text-[var(--color-text-muted)]">
          Try a shorter or different search term.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 px-6 text-center">
      <p className="text-[13px] text-[var(--color-text)]">Start typing to scout your bookmarks</p>
      <p className="text-[12px] text-[var(--color-text-muted)]">
        Search by name, URL, or folder — typos are fine.
      </p>
    </div>
  )
}
