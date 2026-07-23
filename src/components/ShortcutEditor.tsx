import { useEffect, useState } from 'react'
import { getConfiguredShortcut, openShortcutSettingsPage, tokenizeShortcut } from '@/shortcuts'
import { Kbd } from './Kbd'

/**
 * Displays the shortcut that opens Scauta. Chrome gives extensions no API
 * to rebind their own command, so "editing" here means linking out to
 * chrome://extensions/shortcuts rather than an in-app control — named
 * ShortcutEditor because it's the one place in the UI that owns the whole
 * shortcut-configuration concern, not because it can rebind it directly.
 */
export function ShortcutEditor() {
  const [shortcut, setShortcut] = useState('...')

  useEffect(() => {
    void getConfiguredShortcut().then(setShortcut)
  }, [])

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        {tokenizeShortcut(shortcut).map((token, index) => (
          <Kbd key={index}>{token}</Kbd>
        ))}
      </div>
      <button
        type="button"
        onClick={openShortcutSettingsPage}
        className="text-[12px] text-[var(--color-accent)] hover:underline"
      >
        Change in Chrome settings ↗
      </button>
    </div>
  )
}
