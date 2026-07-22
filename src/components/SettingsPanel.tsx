import { useEffect, useState } from 'react'
import type { ScautaSettings, ThemePreference } from '@/types'
import { getConfiguredShortcut, openShortcutSettingsPage } from '@/shortcuts'

interface SettingsPanelProps {
  settings: ScautaSettings
  onChange: (settings: ScautaSettings) => void
  onClearHistory: () => void
  onClose: () => void
}

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export function SettingsPanel({ settings, onChange, onClearHistory, onClose }: SettingsPanelProps) {
  const [shortcut, setShortcut] = useState('...')

  useEffect(() => {
    void getConfiguredShortcut().then(setShortcut)
  }, [])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <h1 className="text-[13.5px] font-medium text-[var(--color-text)]">Settings</h1>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-2 py-1 text-[12px] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
        >
          Done
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <section className="space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
            Shortcut
          </div>
          <div className="flex items-center justify-between">
            <span className="font-data rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[12px] text-[var(--color-text)]">
              {shortcut}
            </span>
            <button
              type="button"
              onClick={openShortcutSettingsPage}
              className="text-[12px] text-[var(--color-accent)] hover:underline"
            >
              Change in Chrome settings ↗
            </button>
          </div>
        </section>

        <section className="space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
            Search
          </div>
          <label className="flex items-center justify-between text-[13px] text-[var(--color-text)]">
            Search browsing history
            <input
              type="checkbox"
              checked={settings.searchHistoryEnabled}
              onChange={(event) => onChange({ ...settings, searchHistoryEnabled: event.target.checked })}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
          </label>
          <label className="flex items-center justify-between text-[13px] text-[var(--color-text)]">
            Track usage history
            <input
              type="checkbox"
              checked={settings.historyEnabled}
              onChange={(event) => onChange({ ...settings, historyEnabled: event.target.checked })}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
          </label>
          <label className="flex items-center justify-between text-[13px] text-[var(--color-text)]">
            Max results
            <input
              type="number"
              min={3}
              max={20}
              value={settings.maxResults}
              onChange={(event) =>
                onChange({
                  ...settings,
                  maxResults: Math.min(20, Math.max(3, Number(event.target.value) || 3)),
                })
              }
              className="w-16 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-right text-[13px] text-[var(--color-text)] outline-none"
            />
          </label>
          <button
            type="button"
            onClick={onClearHistory}
            className="text-[12px] text-[var(--color-accent)] hover:underline"
          >
            Clear usage history
          </button>
        </section>

        <section className="space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
            Theme
          </div>
          <div className="flex gap-2">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ ...settings, theme: option.value })}
                className={`rounded-md border px-3 py-1.5 text-[12px] transition-colors ${
                  settings.theme === option.value
                    ? 'border-[var(--color-accent)] bg-[var(--color-surface-selected)] text-[var(--color-text)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
