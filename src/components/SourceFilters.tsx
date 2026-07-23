interface SourceFiltersProps {
  bookmarksEnabled: boolean
  onBookmarksChange: (checked: boolean) => void
  bookmarksInputRef: (el: HTMLInputElement | null) => void
  historyEnabled: boolean
  onHistoryChange: (checked: boolean) => void
  historyInputRef: (el: HTMLInputElement | null) => void
  tabsEnabled: boolean
  onTabsChange: (checked: boolean) => void
  tabsInputRef: (el: HTMLInputElement | null) => void
}

function SourceCheckbox({
  label,
  checked,
  onChange,
  inputRef,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  inputRef: (el: HTMLInputElement | null) => void
}) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-3 w-3 cursor-pointer appearance-none rounded-full border border-[var(--color-text-muted)] checked:border-[var(--color-accent)] checked:bg-[var(--color-accent)]"
      />
      {label}
    </label>
  )
}

export function SourceFilters({
  bookmarksEnabled,
  onBookmarksChange,
  bookmarksInputRef,
  historyEnabled,
  onHistoryChange,
  historyInputRef,
  tabsEnabled,
  onTabsChange,
  tabsInputRef,
}: SourceFiltersProps) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-1.5 opacity-60 transition-opacity focus-within:opacity-100">
      <div className="flex items-center gap-3">
        <SourceCheckbox
          label="Bookmarks"
          checked={bookmarksEnabled}
          onChange={onBookmarksChange}
          inputRef={bookmarksInputRef}
        />
        <SourceCheckbox
          label="History"
          checked={historyEnabled}
          onChange={onHistoryChange}
          inputRef={historyInputRef}
        />
        <SourceCheckbox label="Tabs" checked={tabsEnabled} onChange={onTabsChange} inputRef={tabsInputRef} />
      </div>
      <span className="text-[10px] text-[var(--color-text-muted)]">Press Tab to change settings</span>
    </div>
  )
}
