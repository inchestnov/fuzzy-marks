export function Kbd({ children }: { children: string }) {
  return (
    <kbd className="font-data rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1 py-0.5 text-[10px] text-[var(--color-text-muted)]">
      {children}
    </kbd>
  )
}
