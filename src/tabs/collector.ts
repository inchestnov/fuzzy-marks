import type { BookmarkDocument } from '@/types'
import { buildKeywords } from '@/bookmarks/collector'

/**
 * Prefixed so a tab's id can never collide with a bookmark's or history
 * entry's id once the lists are merged — ids are used as React list keys
 * and as the usage-history key.
 */
function toDocumentId(tabId: number): string {
  return `tab:${tabId}`
}

/**
 * Fetches currently open tabs and normalizes them into the same document
 * shape as bookmarks/history. Unlike bookmarks and history, this is never
 * cached: the list of open tabs changes constantly and querying it is cheap,
 * so it's always read live at request time.
 */
export async function collectTabs(): Promise<BookmarkDocument[]> {
  const tabs = await chrome.tabs.query({})

  const documents: BookmarkDocument[] = []
  for (const tab of tabs) {
    if (tab.id === undefined || !tab.url) continue
    const name = tab.title || tab.url
    documents.push({
      id: toDocumentId(tab.id),
      name,
      url: tab.url,
      path: '',
      keywords: buildKeywords(name, tab.url, ''),
      source: 'tab',
    })
  }
  return documents
}
