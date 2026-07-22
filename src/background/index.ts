import { collectBookmarks } from '@/bookmarks/collector'
import { getCachedIndex, setCachedIndex, recordBookmarkOpen } from '@/storage'
import type { GetDocumentsResponse, ScautaMessage } from '@/types'

/**
 * The background service worker is the single owner of the bookmark index:
 * it rebuilds it whenever bookmarks change and keeps it cached in
 * chrome.storage.local so the popup can read it instantly on open
 * (Manifest V3 service workers are ephemeral, so we can't rely on an
 * in-memory singleton surviving between popup opens).
 */
let rebuildInFlight: Promise<void> | null = null

async function rebuildIndex(): Promise<void> {
  const documents = await collectBookmarks()
  await setCachedIndex(documents)
}

function scheduleRebuild(): void {
  rebuildInFlight = rebuildIndex().finally(() => {
    rebuildInFlight = null
  })
}

async function ensureIndex(): Promise<GetDocumentsResponse> {
  if (rebuildInFlight) {
    await rebuildInFlight
  } else {
    const cached = await getCachedIndex()
    if (!cached) {
      scheduleRebuild()
      await rebuildInFlight
    }
  }
  const cache = await getCachedIndex()
  return { documents: cache?.documents ?? [] }
}

chrome.runtime.onInstalled.addListener(() => scheduleRebuild())
chrome.runtime.onStartup.addListener(() => scheduleRebuild())

for (const event of [
  chrome.bookmarks.onCreated,
  chrome.bookmarks.onRemoved,
  chrome.bookmarks.onChanged,
  chrome.bookmarks.onMoved,
  chrome.bookmarks.onImportEnded,
]) {
  event.addListener(() => scheduleRebuild())
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
      void ensureIndex().then(sendResponse)
      return true
    }
    case 'scauta:refresh-index': {
      scheduleRebuild()
      void (rebuildInFlight ?? Promise.resolve())
        .then(() => getCachedIndex())
        .then((cache) => sendResponse({ documents: cache?.documents ?? [] }))
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

void ensureIndex()
