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

  it('still answers scauta:get-documents with a well-formed response if a storage write fails during rebuild', async () => {
    // Regression test: a rejected rebuild used to leave sendResponse never
    // called, so chrome.runtime.sendMessage on the popup side resolved to
    // undefined instead of {documents, historyDocuments} - and App.tsx's
    // `[...bookmarkDocuments, ...historyDocuments]` spread threw
    // "TypeError: n is not iterable" trying to spread the missing field.
    //
    // background/index.ts also fires an initial `void ensureAll()` on
    // module load, which schedules its own rebuild before this test even
    // starts arming the failure - flushing first lets that settle so the
    // mocked failure below applies to the rebuild *we* trigger, and the
    // message is sent with no further flush in between so it lands while
    // that rebuild is still in flight - the exact window in which the old
    // code could leave sendResponse uncalled.
    const mock = await loadBackground()
    await flushAsync()
    mock.bookmarks.__setTree(sampleTree())
    mock.storage.local.set.mockImplementationOnce(async () => {
      throw new Error('simulated storage failure')
    })

    mock.runtime.onInstalled.__emit()
    const listener = getMessageListener(mock)

    const response = await Promise.race([
      new Promise<GetDocumentsResponse>((resolve) => {
        listener({ type: 'scauta:get-documents' }, {}, (r) => resolve(r as GetDocumentsResponse))
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('sendResponse was never called (message port left hanging)')), 500),
      ),
    ])

    expect(response).toBeDefined()
    expect(Array.isArray(response.documents)).toBe(true)
    expect(Array.isArray(response.historyDocuments)).toBe(true)
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

  it('navigates the current tab on a plain Enter for a fresh URL, and records usage history', async () => {
    const mock = await loadBackground()
    mock.bookmarks.__setTree(sampleTree())
    mock.tabs.__setTabs([{ id: 99, url: 'https://old.example', windowId: 1, active: true }])
    mock.runtime.onInstalled.__emit()
    await flushAsync()

    const listener = getMessageListener(mock)

    const response = await new Promise((resolve) => {
      listener(
        { type: 'scauta:open-bookmark', url: 'https://grafana.company.com', bookmarkId: '3', reuseExistingTab: false },
        {},
        resolve,
      )
    })

    expect(response).toEqual({ ok: true })
    // Enter reuses the tab the user was looking at rather than spawning a new one.
    expect(mock.tabs.update).toHaveBeenCalledTimes(1)
    expect(mock.tabs.update).toHaveBeenCalledWith(99, { url: 'https://grafana.company.com' })
    expect(mock.tabs.create).not.toHaveBeenCalled()

    const usage = mock.storage.local.__store['scauta:usage'] as Record<string, { count: number; lastUsedAt: number }>
    expect(usage['3'].count).toBe(1)
    expect(usage['3'].lastUsedAt).toBeGreaterThan(0)
  })

  it('creates a new tab on Ctrl/Cmd+Enter (newTab) regardless of the active tab', async () => {
    const mock = await loadBackground()
    mock.bookmarks.__setTree(sampleTree())
    mock.tabs.__setTabs([{ id: 99, url: 'https://old.example', windowId: 1, active: true }])
    mock.runtime.onInstalled.__emit()
    await flushAsync()

    const listener = getMessageListener(mock)

    await new Promise((resolve) => {
      listener(
        { type: 'scauta:open-bookmark', url: 'https://grafana.company.com', bookmarkId: '3', newTab: true },
        {},
        resolve,
      )
    })

    expect(mock.tabs.create).toHaveBeenCalledTimes(1)
    expect(mock.tabs.create).toHaveBeenCalledWith({ url: 'https://grafana.company.com' })
    expect(mock.tabs.update).not.toHaveBeenCalled()
  })

  it('focuses an already-open tab when reuseExistingTab is set (Open tabs source enabled)', async () => {
    const mock = await loadBackground()
    mock.bookmarks.__setTree(sampleTree())
    const url = 'https://grafana.company.com'
    mock.tabs.__setTabs([
      { id: 42, url, windowId: 7 },
      { id: 99, url: 'https://old.example', windowId: 1, active: true },
    ])
    mock.runtime.onInstalled.__emit()
    await flushAsync()

    const listener = getMessageListener(mock)

    await new Promise((resolve) => {
      listener({ type: 'scauta:open-bookmark', url, bookmarkId: '3', reuseExistingTab: true }, {}, resolve)
    })

    // Switches to the existing tab and focuses its window; never navigates the
    // active tab or creates a new one.
    expect(mock.tabs.update).toHaveBeenCalledTimes(1)
    expect(mock.tabs.update).toHaveBeenCalledWith(42, { active: true })
    expect(mock.windows.update).toHaveBeenCalledWith(7, { focused: true })
    expect(mock.tabs.create).not.toHaveBeenCalled()

    const usage = mock.storage.local.__store['scauta:usage'] as Record<string, { count: number; lastUsedAt: number }>
    expect(usage['3'].count).toBe(1)
  })

  it('navigates the current tab when reuseExistingTab is set but no matching tab is open', async () => {
    const mock = await loadBackground()
    mock.bookmarks.__setTree(sampleTree())
    mock.tabs.__setTabs([{ id: 99, url: 'https://old.example', windowId: 1, active: true }])
    mock.runtime.onInstalled.__emit()
    await flushAsync()

    const listener = getMessageListener(mock)

    await new Promise((resolve) => {
      listener(
        { type: 'scauta:open-bookmark', url: 'https://grafana.company.com', bookmarkId: '3', reuseExistingTab: true },
        {},
        resolve,
      )
    })

    expect(mock.tabs.update).toHaveBeenCalledTimes(1)
    expect(mock.tabs.update).toHaveBeenCalledWith(99, { url: 'https://grafana.company.com' })
    expect(mock.tabs.create).not.toHaveBeenCalled()
    expect(mock.windows.update).not.toHaveBeenCalled()
  })
})
