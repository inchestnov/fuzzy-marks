import { useEffect, useRef, useState } from 'react'
import type { ScautaSettings, ThemePreference } from '@/types'
import { getConfiguredShortcut, tokenizeShortcut } from '@/shortcuts'
import { Kbd } from './Kbd'
import { ShortcutEditor } from './ShortcutEditor'
import { ToggleSwitch } from './ToggleSwitch'
import { Tooltip } from './Tooltip'

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

const CLEAR_CONFIRMATION_MS = 1500

export function SettingsPanel({ settings, onChange, onClearHistory, onClose }: SettingsPanelProps) {
  const [cleared, setCleared] = useState(false)
  const [shortcut, setShortcut] = useState<string | null>(null)
  const clearTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(clearTimeoutRef.current), [])

  useEffect(() => {
    void getConfiguredShortcut().then(setShortcut)
  }, [])

  function handleClearHistory() {
    onClearHistory()
    setCleared(true)
    clearTimeout(clearTimeoutRef.current)
    clearTimeoutRef.current = setTimeout(() => setCleared(false), CLEAR_CONFIRMATION_MS)
  }

  return (
    <div className="flex h-full animate-fade-in flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <h1 className="text-[14px] font-medium text-[var(--color-text)]">Settings</h1>
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
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
            Shortcut
            <Tooltip text="Opens Scauta's search from anywhere in the browser." />
          </div>
          <ShortcutEditor />
        </section>

        <section className="space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
            Shortcuts
          </div>

          <div className="space-y-2 text-[13px] text-[var(--color-text)]">
            {shortcut && (
              <div className="flex items-center justify-between">
                <span>Open Scout</span>
                <div className="flex items-center gap-1">
                  {tokenizeShortcut(shortcut).map((token, index) => (
                    <Kbd key={index}>{token}</Kbd>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span>Navigate</span>
              <div className="flex items-center gap-1">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Open in current tab</span>
              <Kbd>Enter</Kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Open in new tab</span>
              <div className="flex items-center gap-1">
                <Kbd>Shift</Kbd>
                <Kbd>Enter</Kbd>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
            Search
          </div>

          <div className="flex items-center justify-between text-[14px] text-[var(--color-text)]">
            <span className="flex items-center gap-1.5">
              Track usage history
              <Tooltip text="Boost results you open often or recently, so they rank higher next time." />
            </span>
            <ToggleSwitch
              checked={settings.historyEnabled}
              onChange={(checked) => onChange({ ...settings, historyEnabled: checked })}
              ariaLabel="Track usage history"
            />
          </div>

          <div className="flex items-center justify-between text-[14px] text-[var(--color-text)]">
            <span className="flex items-center gap-1.5">
              Max results
              <Tooltip text="How many results to show at once, from 3 to 20." />
            </span>
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
              className="w-16 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-right text-[12px] text-[var(--color-text)] outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-muted)]">
              Frequency and recency data used for ranking
              <Tooltip text="Erases all recorded open counts and recency. Doesn't touch your bookmarks or browser history." />
            </span>
            <button
              type="button"
              onClick={handleClearHistory}
              className={`rounded-md border px-3 py-1.5 text-[12px] transition-colors ${
                cleared
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface)]'
              }`}
            >
              {cleared ? 'Cleared ✓' : 'Clear usage history'}
            </button>
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
            Theme
            <Tooltip text="Match your system appearance, or force light/dark." />
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
