import type {
  BookmarkDocument,
  ScautaSettings,
  StoredIndexCache,
  UsageEntry,
  UsageHistory,
} from '@/types'
import { DEFAULT_SETTINGS } from '@/types'

const KEYS = {
  settings: 'scauta:settings',
  usage: 'scauta:usage',
  indexCache: 'scauta:index-cache',
  lastQuery: 'scauta:last-query',
} as const

async function get<T>(key: string, fallback: T): Promise<T> {
  const result = await chrome.storage.local.get(key)
  return (result[key] as T | undefined) ?? fallback
}

async function set(key: string, value: unknown): Promise<void> {
  await chrome.storage.local.set({ [key]: value })
}

export async function getSettings(): Promise<ScautaSettings> {
  const stored = await get<Partial<ScautaSettings>>(KEYS.settings, {})
  return { ...DEFAULT_SETTINGS, ...stored }
}

export async function saveSettings(settings: ScautaSettings): Promise<void> {
  await set(KEYS.settings, settings)
}

export async function getUsageHistory(): Promise<UsageHistory> {
  return get<UsageHistory>(KEYS.usage, {})
}

/** Records that a bookmark was opened, bumping its frequency/recency score. */
export async function recordBookmarkOpen(bookmarkId: string): Promise<void> {
  const history = await getUsageHistory()
  const previous: UsageEntry = history[bookmarkId] ?? { count: 0, lastUsedAt: 0 }
  history[bookmarkId] = { count: previous.count + 1, lastUsedAt: Date.now() }
  await set(KEYS.usage, history)
}

export async function clearUsageHistory(): Promise<void> {
  await set(KEYS.usage, {})
}

export async function getCachedIndex(): Promise<StoredIndexCache | undefined> {
  return get<StoredIndexCache | undefined>(KEYS.indexCache, undefined)
}

export async function setCachedIndex(documents: BookmarkDocument[]): Promise<void> {
  const cache: StoredIndexCache = { documents, builtAt: Date.now() }
  await set(KEYS.indexCache, cache)
}

export async function getLastQuery(): Promise<string> {
  return get<string>(KEYS.lastQuery, '')
}

export async function saveLastQuery(query: string): Promise<void> {
  await set(KEYS.lastQuery, query)
}

export const STORAGE_KEYS = KEYS
