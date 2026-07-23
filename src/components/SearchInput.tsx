import { useEffect, useRef } from 'react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
}

export function SearchInput({ value, onChange }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

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
    </div>
  )
}
