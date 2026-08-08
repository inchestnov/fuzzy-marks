import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BookmarkDocument, ScautaSettings, UsageHistory } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'
import { SearchEngine } from '@/search'
import { getDocuments, openBookmark } from '@/popup/scautaClient'
import { getSettings, saveSettings, getUsageHistory, clearUsageHistory } from '@/storage'
import { useTheme } from '@/popup/useTheme'
import { SearchInput } from './SearchInput'
import { SourceFilters } from './SourceFilters'
import { SearchResults } from './SearchResults'
import { SettingsPanel } from './SettingsPanel'

export function App() {
  const [bookmarkDocuments, setBookmarkDocuments] = useState<BookmarkDocument[]>([])
  const [historyDocuments, setHistoryDocuments] = useState<BookmarkDocument[]>([])
  const [tabDocuments, setTabDocuments] = useState<BookmarkDocument[]>([])
  const [usage, setUsage] = useState<UsageHistory>({})
  const [settings, setSettings] = useState<ScautaSettings>(DEFAULT_SETTINGS)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [view, setView] = useState<'search' | 'settings'>('search')
  const [ready, setReady] = useState(false)

  const engineRef = useRef(new SearchEngine([]))
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const bookmarksCheckboxRef = useRef<HTMLInputElement | null>(null)
  const historyCheckboxRef = useRef<HTMLInputElement | null>(null)
  const tabsCheckboxRef = useRef<HTMLInputElement | null>(null)

  useTheme(settings.theme)

  useEffect(() => {
    void (async () => {
      const [docsResponse, storedSettings, history] = await Promise.all([
        getDocuments(),
        getSettings(),
        getUsageHistory(),
      ])
      // Defensive: chrome.runtime.sendMessage resolves to undefined (not a
      // rejection) if the background listener never calls sendResponse, so
      // docsResponse itself could in principle be malformed here.
      setBookmarkDocuments(docsResponse?.documents ?? [])
      setHistoryDocuments(docsResponse?.historyDocuments ?? [])
      setTabDocuments(docsResponse?.tabDocuments ?? [])
      setSettings(storedSettings)
      setUsage(history)
      setReady(true)
    })()
  }, [])

  const searchableDocuments = useMemo(
    () => [
      ...(settings.searchBookmarksEnabled ? bookmarkDocuments : []),
      ...(settings.searchHistoryEnabled ? historyDocuments : []),
      ...(settings.searchTabsEnabled ? tabDocuments : []),
    ],
    [
      bookmarkDocuments,
      historyDocuments,
      tabDocuments,
      settings.searchBookmarksEnabled,
      settings.searchHistoryEnabled,
      settings.searchTabsEnabled,
    ],
  )

  const results = useMemo(() => {
    if (!ready) return []
    // Rebuilding the engine here (rather than in a separate effect) keeps it
    // synchronous with this computation — a useEffect runs a render behind,
    // which meant toggling "search history" showed stale results for one tick.
    engineRef.current.setDocuments(searchableDocuments)
    return engineRef.current.search(query, {
      limit: settings.maxResults,
      usage: settings.historyEnabled ? usage : {},
    })
  }, [query, searchableDocuments, usage, settings.maxResults, settings.historyEnabled, ready])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query, results.length])

  const updateSettings = useCallback((next: ScautaSettings) => {
    setSettings(next)
    void saveSettings(next)
  }, [])

  const handleClearHistory = useCallback(() => {
    setUsage({})
    void clearUsageHistory()
  }, [])

  const openResult = useCallback(
    (index: number, newTab = false) => {
      const result = results[index]
      if (!result) return
      void openBookmark(result.document.id, result.document.url, newTab, settings.searchTabsEnabled)
      window.close()
    },
    [results, settings.searchTabsEnabled],
  )

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (view === 'settings') {
          setView('search')
        } else {
          window.close()
        }
        return
      }

      if (view !== 'search') return

      const focusOrder = [bookmarksCheckboxRef.current, historyCheckboxRef.current, tabsCheckboxRef.current]

      if (event.key === 'Tab') {
        event.preventDefault()
        const currentIndex = focusOrder.findIndex((el) => el === document.activeElement)
        const step = event.shiftKey ? -1 : 1
        const nextIndex = (currentIndex + step + focusOrder.length) % focusOrder.length
        focusOrder[nextIndex]?.focus()
        return
      }

      // Typing (including Backspace) while a source checkbox is focused
      // (reached via Tab) should resume editing the search box instead of
      // being swallowed by the checkbox — the user shouldn't have to click
      // back into the input.
      if (
        focusOrder.includes(document.activeElement as HTMLInputElement | null) &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        (event.key.length === 1 || event.key === 'Backspace')
      ) {
        event.preventDefault()
        searchInputRef.current?.focus()
        if (event.key === 'Backspace') {
          setQuery((current) => current.slice(0, -1))
        } else {
          setQuery((current) => current + event.key)
        }
        return
      }

      if (event.key === 'Enter') {
        const activeElement = document.activeElement
        if (activeElement === bookmarksCheckboxRef.current) {
          event.preventDefault()
          updateSettings({ ...settings, searchBookmarksEnabled: !settings.searchBookmarksEnabled })
          return
        }
        if (activeElement === historyCheckboxRef.current) {
          event.preventDefault()
          updateSettings({ ...settings, searchHistoryEnabled: !settings.searchHistoryEnabled })
          return
        }
        if (activeElement === tabsCheckboxRef.current) {
          event.preventDefault()
          updateSettings({ ...settings, searchTabsEnabled: !settings.searchTabsEnabled })
          return
        }
      }

      if (results.length === 0) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        // Arrow navigation always means "I'm picking a result" — pull focus
        // back off a checkbox so a following Enter opens the result instead
        // of re-toggling whichever checkbox last had focus.
        searchInputRef.current?.focus()
        setSelectedIndex((current) => (current + 1) % results.length)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        searchInputRef.current?.focus()
        setSelectedIndex((current) => (current - 1 + results.length) % results.length)
      } else if (event.key === 'Enter') {
        event.preventDefault()
        openResult(selectedIndex, event.ctrlKey || event.metaKey)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [view, results, selectedIndex, openResult, settings, updateSettings])

  if (view === 'settings') {
    return (
      <SettingsPanel
        settings={settings}
        onChange={updateSettings}
        onClearHistory={handleClearHistory}
        onClose={() => setView('search')}
      />
    )
  }

  return (
    <div className="flex h-full animate-fade-in flex-col">
      <SearchInput
        value={query}
        onChange={setQuery}
        resultCount={results.length}
        onSettingsClick={() => setView('settings')}
        inputRef={searchInputRef}
      />
      <SourceFilters
        bookmarksEnabled={settings.searchBookmarksEnabled}
        onBookmarksChange={(checked) => updateSettings({ ...settings, searchBookmarksEnabled: checked })}
        bookmarksInputRef={(el) => (bookmarksCheckboxRef.current = el)}
        historyEnabled={settings.searchHistoryEnabled}
        onHistoryChange={(checked) => updateSettings({ ...settings, searchHistoryEnabled: checked })}
        historyInputRef={(el) => (historyCheckboxRef.current = el)}
        tabsEnabled={settings.searchTabsEnabled}
        onTabsChange={(checked) => updateSettings({ ...settings, searchTabsEnabled: checked })}
        tabsInputRef={(el) => (tabsCheckboxRef.current = el)}
      />
      <SearchResults
        results={results}
        selectedIndex={selectedIndex}
        hasQuery={query.trim().length > 0}
        hasDocuments={searchableDocuments.length > 0}
        onSelect={setSelectedIndex}
        onOpen={openResult}
      />
    </div>
  )
}
