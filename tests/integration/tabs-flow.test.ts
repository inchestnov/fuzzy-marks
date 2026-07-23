import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { installChromeMock, type ChromeMock } from '../mocks/chrome'
import { collectTabs } from '@/tabs/collector'
import { collectBookmarks } from '@/bookmarks/collector'
import { collectHistory } from '@/history/collector'
import { SearchEngine } from '@/search/searchEngine'

describe('tabs collection -> search integration', () => {
  let mock: ChromeMock

  beforeEach(() => {
    mock = installChromeMock()
  })

  afterEach(() => {
    delete (globalThis as { chrome?: unknown }).chrome
  })

  it('collects open tabs from the mocked chrome.tabs.query and finds entries via SearchEngine', async () => {
    mock.tabs.__setTabs([
      { id: 1, url: 'https://grafana.company.com', title: 'Grafana Production Dashboard', windowId: 1 },
      { id: 2, url: 'https://github.com/example/kubernetes', title: 'GitHub Kubernetes Repository', windowId: 1 },
    ])

    const documents = await collectTabs()
    expect(documents).toHaveLength(2)
    expect(documents.every((d) => d.source === 'tab')).toBe(true)
    expect(documents.every((d) => d.path === '')).toBe(true)

    const engine = new SearchEngine(documents)
    expect(engine.search('grafana')[0].document.name).toBe('Grafana Production Dashboard')
    expect(engine.search('git kub')[0].document.name).toBe('GitHub Kubernetes Repository')
  })

  it('skips tabs with no url, and prefixes ids so they cannot collide with bookmark ids', async () => {
    mock.tabs.__setTabs([
      { id: 1, url: '', title: 'New Tab', windowId: 1 },
      { id: 2, url: 'https://example.com/page', title: 'Has URL', windowId: 1 },
    ])

    const documents = await collectTabs()
    expect(documents).toHaveLength(1)
    expect(documents[0].id).toBe('tab:2')
    expect(documents[0].id).not.toBe('2')
  })

  it('falls back to the url as the name when title is empty', async () => {
    mock.tabs.__setTabs([{ id: 1, url: 'https://example.com/untitled', title: '', windowId: 1 }])

    const documents = await collectTabs()
    expect(documents[0].name).toBe('https://example.com/untitled')
  })

  it('merges bookmark, history, and tab documents into one searchable set without id collisions', async () => {
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
    mock.tabs.__setTabs([{ id: 1, url: 'https://news.example.com', title: 'Example News', windowId: 1 }])

    const [bookmarks, history, tabs] = await Promise.all([collectBookmarks(), collectHistory(), collectTabs()])
    const merged = [...bookmarks, ...history, ...tabs]

    const ids = merged.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)

    const engine = new SearchEngine(merged)
    expect(engine.search('kub')[0].document.id).toBe('2')
    expect(engine.search('graf')[0].document.id).toBe('history:2')
    expect(engine.search('news')[0].document.id).toBe('tab:1')
  })
})
