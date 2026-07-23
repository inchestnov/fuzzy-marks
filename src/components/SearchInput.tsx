import { useEffect, type RefObject } from 'react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  resultCount: number
  onSettingsClick: () => void
  inputRef: RefObject<HTMLInputElement>
}

export function SearchInput({ value, onChange, resultCount, onSettingsClick, inputRef }: SearchInputProps) {
  useEffect(() => {
    inputRef.current?.focus()
  }, [inputRef])

  return (
    <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-5 py-3.5">
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]"
        fill="none"
      >
        <circle cx="8.5" cy="8.5" r="6" stroke="currentColor" strokeWidth="1.6" />
        <path d="M13.2 13.2 17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search bookmarks..."
        spellCheck={false}
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
      />
      <span className="shrink-0 text-[11px] text-[var(--color-text-muted)]">
        {resultCount} {resultCount === 1 ? 'result' : 'results'}
      </span>
      <button
        type="button"
        onClick={onSettingsClick}
        aria-label="Settings"
        className="flex shrink-0 items-center justify-center rounded-md p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
          <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M16.2 10.9c.03-.3.05-.6.05-.9s-.02-.6-.05-.9l1.4-1.1a.5.5 0 0 0 .12-.64l-1.3-2.26a.5.5 0 0 0-.6-.22l-1.65.66a6.5 6.5 0 0 0-1.56-.9l-.25-1.75a.5.5 0 0 0-.5-.44H8.64a.5.5 0 0 0-.5.44l-.25 1.75c-.56.2-1.09.5-1.56.9l-1.65-.66a.5.5 0 0 0-.6.22L2.78 7.36a.5.5 0 0 0 .12.64l1.4 1.1c-.03.3-.05.6-.05.9s.02.6.05.9l-1.4 1.1a.5.5 0 0 0-.12.64l1.3 2.26c.13.22.4.31.6.22l1.65-.66c.47.4 1 .7 1.56.9l.25 1.75c.04.25.25.44.5.44h2.62c.25 0 .46-.19.5-.44l.25-1.75c.56-.2 1.09-.5 1.56-.9l1.65.66c.2.09.47 0 .6-.22l1.3-2.26a.5.5 0 0 0-.12-.64l-1.4-1.1Z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  )
}
