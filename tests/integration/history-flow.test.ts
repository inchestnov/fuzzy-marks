import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { installChromeMock, type ChromeMock } from '../mocks/chrome'
import { collectHistory } from '@/history/collector'
import { collectBookmarks } from '@/bookmarks/collector'
import { SearchEngine } from '@/search/searchEngine'

describe('history collection -> search integration', () => {
  let mock: ChromeMock

  beforeEach(() => {
    mock = installChromeMock()
  })

  afterEach(() => {
    delete (globalThis as { chrome?: unknown }).chrome
  })

  it('collects history from the mocked chrome.history.search and finds entries via SearchEngine', async () => {
    mock.history.__setItems([
      { id: '101', title: 'Grafana Production Dashboard', url: 'https://grafana.company.com', lastVisitTime: 1_700_000_000_000 },
      { id: '102', title: 'GitHub Kubernetes Repository', url: 'https://github.com/example/kubernetes', lastVisitTime: 1_700_000_001_000 },
    ])

    const documents = await collectHistory()
    expect(documents).toHaveLength(2)
    expect(documents.every((d) => d.source === 'history')).toBe(true)
    expect(documents.every((d) => d.path === '')).toBe(true)

    const engine = new SearchEngine(documents)
    expect(engine.search('grafana')[0].document.name).toBe('Grafana Production Dashboard')
    expect(engine.search('git kub')[0].document.name).toBe('GitHub Kubernetes Repository')
  })

  it('skips history entries with no url, and prefixes ids so they cannot collide with bookmark ids', async () => {
    mock.history.__setItems([
      { id: '1', title: 'No URL entry' },
      { id: '2', title: 'Has URL', url: 'https://example.com/page' },
    ])

    const documents = await collectHistory()
    expect(documents).toHaveLength(1)
    expect(documents[0].id).toBe('history:2')
    expect(documents[0].id).not.toBe('2')
  })

  it('merges bookmark and history documents into one searchable set without id collisions', async () => {
    mock.bookmarks.__setTree([
      {
        id: '0',
        title: '',
        children: [
          {
            id: '1',
            title: 'Bar',
            parentId: '0',
            children: [{ id: '2', title: 'Kubernetes Dashboard', url: 'https://k8s.example.com', parentId: '1' }],
          },
        ],
      },
    ])
    mock.history.__setItems([{ id: '2', title: 'Grafana Production Dashboard', url: 'https://grafana.company.com' }])

    const [bookmarks, history] = await Promise.all([collectBookmarks(), collectHistory()])
    const merged = [...bookmarks, ...history]

    const ids = merged.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)

    const engine = new SearchEngine(merged)
    expect(engine.search('kub')[0].document.id).toBe('2')
    expect(engine.search('graf')[0].document.id).toBe('history:2')
  })
})
