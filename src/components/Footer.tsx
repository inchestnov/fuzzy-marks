interface FooterProps {
  resultCount: number
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="font-data rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1 py-0.5 text-[10px] text-[var(--color-text-muted)]">
      {children}
    </kbd>
  )
}

export function Footer({ resultCount }: FooterProps) {
  return (
    <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-2 text-[11px] text-[var(--color-text-muted)]">
      <span>
        Scauta · {resultCount} {resultCount === 1 ? 'result' : 'results'}
      </span>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> Navigate
        </span>
        <span className="flex items-center gap-1">
          <Kbd>↵</Kbd> Open
        </span>
        <span className="flex items-center gap-1">
          <Kbd>esc</Kbd> Close
        </span>
      </div>
    </div>
  )
}
