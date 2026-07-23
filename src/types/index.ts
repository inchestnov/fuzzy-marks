/**
 * A single searchable entry — either a browser bookmark or a browsing
 * history item, normalized into the same shape so both can be indexed and
 * ranked together. `source` is omitted for bookmarks (the original/default
 * case) and set explicitly for history entries.
 */
export interface BookmarkDocument {
  id: string
  name: string
  url: string
  /** Folder path, e.g. "Development / Kubernetes". Empty for history entries. */
  path: string
  /** Extra searchable tokens: domain parts, folder names, etc. */
  keywords: string[]
  dateAdded?: number
  source?: 'bookmark' | 'history' | 'tab'
}

export interface SearchResult {
  document: BookmarkDocument
  score: number
}

export type ThemePreference = 'system' | 'light' | 'dark'

export interface ScautaSettings {
  /** Whether opening a result boosts its future ranking (frequency + recency). */
  historyEnabled: boolean
  /** Whether bookmarks are included as a search source. */
  searchBookmarksEnabled: boolean
  /** Whether browsing history (chrome.history) is included as a search source, alongside bookmarks. */
  searchHistoryEnabled: boolean
  /** Whether currently open tabs (chrome.tabs) are included as a search source, alongside bookmarks. */
  searchTabsEnabled: boolean
  maxResults: number
  theme: ThemePreference
}

export const DEFAULT_SETTINGS: ScautaSettings = {
  historyEnabled: true,
  searchBookmarksEnabled: true,
  searchHistoryEnabled: true,
  searchTabsEnabled: true,
  maxResults: 8,
  theme: 'system',
}

/** Per-bookmark usage stats used to boost frequently/recently opened results. */
export interface UsageEntry {
  count: number
  lastUsedAt: number
}

export type UsageHistory = Record<string, UsageEntry>

export interface StoredIndexCache {
  documents: BookmarkDocument[]
  builtAt: number
}

/** Messages exchanged between the popup UI and the background service worker. */
export type ScautaMessage =
  | { type: 'scauta:get-documents' }
  | { type: 'scauta:refresh-index' }
  | { type: 'scauta:record-open'; bookmarkId: string }
  | { type: 'scauta:open-bookmark'; url: string; bookmarkId: string; newTab?: boolean }

export interface GetDocumentsResponse {
  documents: BookmarkDocument[]
  historyDocuments: BookmarkDocument[]
  tabDocuments: BookmarkDocument[]
}
