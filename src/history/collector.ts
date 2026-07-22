import type { BookmarkDocument } from '@/types'
import { buildKeywords } from '@/bookmarks/collector'

/**
 * Caps how much browsing history gets pulled into the search index. History
 * can run into the tens of thousands of entries; a few thousand of the most
 * recent ones cover realistic recall without hurting search performance.
 */
const MAX_HISTORY_RESULTS = 2000

/**
 * Prefixed so a history entry's id can never collide with a bookmark's id
 * once the two lists are merged — both are independently assigned by Chrome
 * and share no guarantee of uniqueness across namespaces. This matters
 * because ids are used as React list keys and as the usage-history key.
 */
function toDocumentId(historyItemId: string): string {
  return `history:${historyItemId}`
}

/** Fetches recent browsing history and normalizes it into the same document shape as bookmarks. */
export async function collectHistory(): Promise<BookmarkDocument[]> {
  const items = await chrome.history.search({
    text: '',
    startTime: 0,
    maxResults: MAX_HISTORY_RESULTS,
  })

  const documents: BookmarkDocument[] = []
  for (const item of items) {
    if (!item.url) continue
    const name = item.title || item.url
    documents.push({
      id: toDocumentId(item.id),
      name,
      url: item.url,
      path: '',
      keywords: buildKeywords(name, item.url, ''),
      dateAdded: item.lastVisitTime,
      source: 'history',
    })
  }
  return documents
}
