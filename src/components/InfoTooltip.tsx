export function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex normal-case">
      <span
        tabIndex={0}
        role="img"
        aria-label={text}
        className="flex h-3.5 w-3.5 shrink-0 cursor-help items-center justify-center rounded-full border border-[var(--color-text-muted)] text-[9px] leading-none text-[var(--color-text-muted)] outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]"
      >
        i
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-[calc(100%+6px)] z-10 w-48 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-[11px] font-normal leading-snug text-[var(--color-text)] opacity-0 shadow-panel transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  )
}
