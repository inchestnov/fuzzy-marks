import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BookmarkDocument, ScautaSettings, UsageHistory } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'
import { SearchEngine } from '@/search'
import { getDocuments, openBookmark } from '@/popup/scautaClient'
import { getSettings, saveSettings, getUsageHistory, clearUsageHistory } from '@/storage'
import { useTheme } from '@/popup/useTheme'
import { SearchBar } from './SearchBar'
import { ResultsList } from './ResultsList'
import { Footer } from './Footer'
import { SettingsPanel } from './SettingsPanel'

export function App() {
  const [bookmarkDocuments, setBookmarkDocuments] = useState<BookmarkDocument[]>([])
  const [historyDocuments, setHistoryDocuments] = useState<BookmarkDocument[]>([])
  const [usage, setUsage] = useState<UsageHistory>({})
  const [settings, setSettings] = useState<ScautaSettings>(DEFAULT_SETTINGS)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [view, setView] = useState<'search' | 'settings'>('search')
  const [ready, setReady] = useState(false)

  const engineRef = useRef(new SearchEngine([]))

  useTheme(settings.theme)

  useEffect(() => {
    void (async () => {
      const [docsResponse, storedSettings, history] = await Promise.all([
        getDocuments(),
        getSettings(),
        getUsageHistory(),
      ])
      setBookmarkDocuments(docsResponse.documents)
      setHistoryDocuments(docsResponse.historyDocuments)
      setSettings(storedSettings)
      setUsage(history)
      setReady(true)
    })()
  }, [])

  const searchableDocuments = useMemo(
    () => (settings.searchHistoryEnabled ? [...bookmarkDocuments, ...historyDocuments] : bookmarkDocuments),
    [bookmarkDocuments, historyDocuments, settings.searchHistoryEnabled],
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
    (index: number) => {
      const result = results[index]
      if (!result) return
      void openBookmark(result.document.id, result.document.url)
      window.close()
    },
    [results],
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

      if (view !== 'search' || results.length === 0) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex((current) => (current + 1) % results.length)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex((current) => (current - 1 + results.length) % results.length)
      } else if (event.key === 'Enter') {
        event.preventDefault()
        openResult(selectedIndex)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [view, results, selectedIndex, openResult])

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
    <div className="flex h-full flex-col">
      <SearchBar value={query} onChange={setQuery} onSettingsClick={() => setView('settings')} />
      <ResultsList
        results={results}
        selectedIndex={selectedIndex}
        hasQuery={query.trim().length > 0}
        hasDocuments={searchableDocuments.length > 0}
        onSelect={setSelectedIndex}
        onOpen={openResult}
      />
      <Footer resultCount={results.length} />
    </div>
  )
}
