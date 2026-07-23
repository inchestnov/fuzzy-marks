import { collectBookmarks } from '@/bookmarks/collector'
import { collectHistory } from '@/history/collector'
import {
  getCachedIndex,
  setCachedIndex,
  getCachedHistoryIndex,
  setCachedHistoryIndex,
  recordBookmarkOpen,
} from '@/storage'
import type { BookmarkDocument, GetDocumentsResponse, ScautaMessage } from '@/types'

/**
 * The background service worker is the single owner of both the bookmark
 * index and the history index: each is rebuilt whenever its source changes
 * (bookmarks.on* / history.onVisited & onVisitRemoved) and cached in
 * chrome.storage.local so the popup can read it instantly on open (MV3
 * service workers are ephemeral, so nothing can live only in memory between
 * popup opens). Both indices follow the exact same rebuild/cache/serve
 * shape, so it's factored into one helper used twice.
 */
function createIndexOwner(
  collect: () => Promise<BookmarkDocument[]>,
  getCache: () => Promise<{ documents: BookmarkDocument[] } | undefined>,
  setCache: (documents: BookmarkDocument[]) => Promise<void>,
) {
  let rebuildInFlight: Promise<void> | null = null

  function scheduleRebuild(): void {
    rebuildInFlight = collect()
      .catch(() => [])
      .then((documents) => setCache(documents))
      .finally(() => {
        rebuildInFlight = null
      })
  }

  async function ensure(): Promise<BookmarkDocument[]> {
    if (rebuildInFlight) {
      await rebuildInFlight
    } else if (!(await getCache())) {
      scheduleRebuild()
      await rebuildInFlight
    }
    const cache = await getCache()
    return cache?.documents ?? []
  }

  return { scheduleRebuild, ensure }
}

const bookmarkIndex = createIndexOwner(collectBookmarks, getCachedIndex, setCachedIndex)
const historyIndex = createIndexOwner(collectHistory, getCachedHistoryIndex, setCachedHistoryIndex)

async function ensureAll(): Promise<GetDocumentsResponse> {
  const [documents, historyDocuments] = await Promise.all([bookmarkIndex.ensure(), historyIndex.ensure()])
  return { documents, historyDocuments }
}

function scheduleRebuildAll(): void {
  bookmarkIndex.scheduleRebuild()
  historyIndex.scheduleRebuild()
}

chrome.runtime.onInstalled.addListener(scheduleRebuildAll)
chrome.runtime.onStartup.addListener(scheduleRebuildAll)

for (const event of [
  chrome.bookmarks.onCreated,
  chrome.bookmarks.onRemoved,
  chrome.bookmarks.onChanged,
  chrome.bookmarks.onMoved,
  chrome.bookmarks.onImportEnded,
]) {
  event.addListener(() => bookmarkIndex.scheduleRebuild())
}

// A new tab navigating to a page fires onVisited; onVisitRemoved covers the
// user (or "Clear browsing data") deleting entries. Together these keep the
// history index current without polling or refetching on every popup open.
for (const event of [chrome.history.onVisited, chrome.history.onVisitRemoved]) {
  event.addListener(() => historyIndex.scheduleRebuild())
}

async function openBookmarkTab(url: string): Promise<void> {
  const existing = await chrome.tabs.query({ url })
  const [match] = existing
  if (match?.id !== undefined) {
    await chrome.tabs.update(match.id, { active: true })
    if (match.windowId !== undefined) {
      await chrome.windows.update(match.windowId, { focused: true })
    }
    return
  }
  await chrome.tabs.create({ url })
}

chrome.runtime.onMessage.addListener((message: ScautaMessage, _sender, sendResponse) => {
  switch (message.type) {
    case 'scauta:get-documents': {
      void ensureAll().then(sendResponse)
      return true
    }
    case 'scauta:refresh-index': {
      scheduleRebuildAll()
      void ensureAll().then(sendResponse)
      return true
    }
    case 'scauta:record-open': {
      void recordBookmarkOpen(message.bookmarkId).then(() => sendResponse({ ok: true }))
      return true
    }
    case 'scauta:open-bookmark': {
      void Promise.all([recordBookmarkOpen(message.bookmarkId), openBookmarkTab(message.url)]).then(
        () => sendResponse({ ok: true }),
      )
      return true
    }
    default:
      return false
  }
})

void ensureAll()
