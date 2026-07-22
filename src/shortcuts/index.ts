/**
 * Chrome does not allow extensions to rebind keyboard shortcuts
 * programmatically — the user must do it via chrome://extensions/shortcuts.
 * This module reads the currently configured shortcut for display in the
 * settings panel, and offers a one-click link to the browser's own page.
 */

const OPEN_SEARCH_COMMAND = '_execute_action'

export async function getConfiguredShortcut(): Promise<string> {
  const commands = await chrome.commands.getAll()
  const command = commands.find((c) => c.name === OPEN_SEARCH_COMMAND)
  return command?.shortcut || 'Not set'
}

export function openShortcutSettingsPage(): void {
  void chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })
}
