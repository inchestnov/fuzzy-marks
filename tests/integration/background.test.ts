import { afterEach, describe, expect, it, vi } from 'vitest'
import { installChromeMock, type ChromeMock } from '../mocks/chrome'
import type { GetDocumentsResponse, ScautaMessage } from '@/types'

/**
 * background/index.ts registers all its listeners as top-level side effects
 * on import, so each test must reset modules, install a fresh chrome mock,
 * and only then dynamically import the module under test.
 */
async function loadBackground(): Promise<ChromeMock> {
  vi.resetModules()
  const mock = installChromeMock()
  await import('@/background')
  return mock
}

function sampleTree(): unknown[] {
  return [
    {
      id: '0',
      title: '',
      children: [
        {
          id: '1',
          title: 'Bookmarks Bar',
          parentId: '0',
          children: [
            { id: '2', title: 'Example Site', url: 'https://example.com', parentId: '1' },
            { id: '3', title: 'Grafana Dashboard', url: 'https://grafana.company.com', parentId: '1' },
          ],
        },
      ],
    },
  ]
}

/** Grabs the listener the module registered via chrome.runtime.onMessage.addListener. */
function getMessageListener(mock: ChromeMock) {
  const addListener = mock.runtime.onMessage.addListener as ReturnType<typeof vi.fn>
  expect(addListener).toHaveBeenCalledTimes(1)
  return addListener.mock.calls[0][0] as (
    message: ScautaMessage,
    sender: unknown,
    sendResponse: (response: unknown) => void,
  ) => boolean

}

async function flushAsync(): Promise<void> {
  // Allow queued microtasks/promise chains (module's own async work) to settle.
  await new Promise((resolve) => setTimeout(resolve, 0))
  await Promise.resolve()
}

describe('background service worker integration', () => {
  afterEach(() => {
    delete (globalThis as { chrome?: unknown }).chrome
  })

  it('builds and caches the index on install', async () => {
    const mock = await loadBackground()
    mock.bookmarks.__setTree(sampleTree())

    mock.runtime.onInstalled.__emit()
    await flushAsync()

    const cached = mock.storage.local.__store['scauta:index-cache'] as { documents: { id: string }[] } | undefined
    expect(cached).toBeDefined()
    expect(cached?.documents.map((d) => d.id).sort()).toEqual(['2', '3'])
  })

  it('rebuilds the index when a bookmarks change event fires', async () => {
    const mock = await loadBackground()
    mock.bookmarks.__setTree(sampleTree())
    mock.runtime.onInstalled.__emit()
    await flushAsync()

    // Simulate a new bookmark being added.
    mock.bookmarks.__setTree([
      {
        id: '0',
        title: '',
        children: [
          {
            id: '1',
            title: 'Bookmarks Bar',
            parentId: '0',
            children: [
              { id: '2', title: 'Example Site', url: 'https://example.com', parentId: '1' },
              { id: '3', title: 'Grafana Dashboard', url: 'https://grafana.company.com', parentId: '1' },
              { id: '4', title: 'New Bookmark', url: 'https://new.example.com', parentId: '1' },
            ],
          },
        ],
      },
    ])

    mock.bookmarks.onCreated.__emit('4', { id: '4' })
    await flushAsync()

    const cached = mock.storage.local.__store['scauta:index-cache'] as { documents: { id: string }[] } | undefined
    expect(cached?.documents.map((d) => d.id).sort()).toEqual(['2', '3', '4'])
  })

  it('responds to scauta:get-documents with the cached documents', async () => {
    const mock = await loadBackground()
    mock.bookmarks.__setTree(sampleTree())
    mock.runtime.onInstalled.__emit()
    await flushAsync()

    const listener = getMessageListener(mock)

    const response = await new Promise<GetDocumentsResponse>((resolve) => {
      const keepAlive = listener({ type: 'scauta:get-documents' }, {}, (response) => resolve(response as GetDocumentsResponse))
      expect(keepAlive).toBe(true)
    })

    expect(response.documents.map((d) => d.id).sort()).toEqual(['2', '3'])
  })

  it('builds the history index on install and rebuilds it when a page is visited', async () => {
    const mock = await loadBackground()
    mock.bookmarks.__setTree(sampleTree())
    mock.history.__setItems([{ id: '10', title: 'First Visit', url: 'https://first.example.com' }])
    mock.runtime.onInstalled.__emit()
    await flushAsync()

    let cached = mock.storage.local.__store['scauta:history-index-cache'] as
      | { documents: { id: string }[] }
      | undefined
    expect(cached?.documents.map((d) => d.id)).toEqual(['history:10'])

    // Simulate a new page visit — onVisited should trigger a rebuild without
    // any popup ever having been opened, unlike the old fetch-on-popup-open design.
    mock.history.__setItems([
      { id: '10', title: 'First Visit', url: 'https://first.example.com' },
      { id: '11', title: 'Second Visit', url: 'https://second.example.com' },
    ])
    mock.history.onVisited.__emit({ id: '11', url: 'https://second.example.com' })
    await flushAsync()

    cached = mock.storage.local.__store['scauta:history-index-cache'] as
      | { documents: { id: string }[] }
      | undefined
    expect(cached?.documents.map((d) => d.id).sort()).toEqual(['history:10', 'history:11'])

    const listener = getMessageListener(mock)
    const response = await new Promise<GetDocumentsResponse>((resolve) => {
      listener({ type: 'scauta:get-documents' }, {}, (response) => resolve(response as GetDocumentsResponse))
    })
    expect(response.historyDocuments.map((d) => d.id).sort()).toEqual(['history:10', 'history:11'])
  })

  it('creates a new tab on scauta:open-bookmark for a fresh URL, and records usage history', async () => {
    const mock = await loadBackground()
    mock.bookmarks.__setTree(sampleTree())
    mock.runtime.onInstalled.__emit()
    await flushAsync()

    const listener = getMessageListener(mock)

    const response = await new Promise((resolve) => {
      listener({ type: 'scauta:open-bookmark', url: 'https://grafana.company.com', bookmarkId: '3' }, {}, resolve)
    })

    expect(response).toEqual({ ok: true })
    expect(mock.tabs.create).toHaveBeenCalledTimes(1)
    expect(mock.tabs.create).toHaveBeenCalledWith({ url: 'https://grafana.company.com' })
    expect(mock.tabs.update).not.toHaveBeenCalled()

    const usage = mock.storage.local.__store['scauta:usage'] as Record<string, { count: number; lastUsedAt: number }>
    expect(usage['3'].count).toBe(1)
    expect(usage['3'].lastUsedAt).toBeGreaterThan(0)
  })

  it('focuses the existing tab (via tabs.update) instead of creating a duplicate on a second open', async () => {
    const mock = await loadBackground()
    mock.bookmarks.__setTree(sampleTree())
    mock.runtime.onInstalled.__emit()
    await flushAsync()

    const listener = getMessageListener(mock)
    const url = 'https://grafana.company.com'

    await new Promise((resolve) => {
      listener({ type: 'scauta:open-bookmark', url, bookmarkId: '3' }, {}, resolve)
    })
    expect(mock.tabs.create).toHaveBeenCalledTimes(1)

    await new Promise((resolve) => {
      listener({ type: 'scauta:open-bookmark', url, bookmarkId: '3' }, {}, resolve)
    })

    // Still only ever created once; the second open should reuse/focus instead.
    expect(mock.tabs.create).toHaveBeenCalledTimes(1)
    expect(mock.tabs.update).toHaveBeenCalledTimes(1)
    expect(mock.windows.update).toHaveBeenCalledTimes(1)

    const usage = mock.storage.local.__store['scauta:usage'] as Record<string, { count: number; lastUsedAt: number }>
    expect(usage['3'].count).toBe(2)
  })
})
