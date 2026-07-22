/** A single searchable bookmark, derived from the browser's bookmark tree. */
export interface BookmarkDocument {
  id: string
  name: string
  url: string
  /** Folder path, e.g. "Development / Kubernetes" */
  path: string
  /** Extra searchable tokens: domain parts, folder names, etc. */
  keywords: string[]
  dateAdded?: number
}

export interface SearchResult {
  document: BookmarkDocument
  score: number
}

export type ThemePreference = 'system' | 'light' | 'dark'

export interface ScautaSettings {
  historyEnabled: boolean
  maxResults: number
  theme: ThemePreference
}

export const DEFAULT_SETTINGS: ScautaSettings = {
  historyEnabled: true,
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
  | { type: 'scauta:open-bookmark'; url: string; bookmarkId: string }

export interface GetDocumentsResponse {
  documents: BookmarkDocument[]
}
