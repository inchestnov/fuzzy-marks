import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BookmarkDocument, ScautaSettings, UsageHistory } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'
import { SearchEngine } from '@/search'
import { getDocuments, openBookmark } from '@/popup/scautaClient'
import { getSettings, saveSettings, getUsageHistory, clearUsageHistory, getLastQuery, saveLastQuery } from '@/storage'
import { useTheme } from '@/popup/useTheme'
import { SearchBar } from './SearchBar'
import { ResultsList } from './ResultsList'
import { Footer } from './Footer'
import { SettingsPanel } from './SettingsPanel'

export function App() {
  const [documents, setDocuments] = useState<BookmarkDocument[]>([])
  const [usage, setUsage] = useState<UsageHistory>({})
  const [settings, setSettings] = useState<ScautaSettings>(DEFAULT_SETTINGS)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [view, setView] = useState<'search' | 'settings'>('search')
  const [ready, setReady] = useState(false)

  const engineRef = useRef(new SearchEngine([]))
  const queryDebounceRef = useRef<ReturnType<typeof setTimeout>>()

  useTheme(settings.theme)

  useEffect(() => {
    void (async () => {
      const [docsResponse, storedSettings, history, lastQuery] = await Promise.all([
        getDocuments(),
        getSettings(),
        getUsageHistory(),
        getLastQuery(),
      ])
      engineRef.current.setDocuments(docsResponse.documents)
      setDocuments(docsResponse.documents)
      setSettings(storedSettings)
      setUsage(history)
      setQuery(lastQuery)
      setReady(true)
    })()
  }, [])

  const results = useMemo(() => {
    if (!ready) return []
    return engineRef.current.search(query, {
      limit: settings.maxResults,
      usage: settings.historyEnabled ? usage : {},
    })
  }, [query, documents, usage, settings.maxResults, settings.historyEnabled, ready])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query, results.length])

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)
    clearTimeout(queryDebounceRef.current)
    queryDebounceRef.current = setTimeout(() => {
      void saveLastQuery(value)
    }, 250)
  }, [])

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
      <SearchBar value={query} onChange={handleQueryChange} onSettingsClick={() => setView('settings')} />
      <ResultsList
        results={results}
        selectedIndex={selectedIndex}
        hasQuery={query.trim().length > 0}
        hasBookmarks={documents.length > 0}
        onSelect={setSelectedIndex}
        onOpen={openResult}
      />
      <Footer resultCount={results.length} />
    </div>
  )
}
