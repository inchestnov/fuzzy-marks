import type { BookmarkDocument, UsageEntry, UsageHistory } from '@/types'

/**
 * Ranking tiers per spec section 17, in descending priority:
 * exact name > name prefix > URL match > path match > fuzzy-only match.
 * Tiers are multiplied by a value large enough that no combination of
 * fuse-similarity + usage boost from a lower tier can outrank a higher one.
 */
export const enum RankTier {
  Fuzzy = 1,
  Path = 2,
  Url = 3,
  NamePrefix = 4,
  NameExact = 5,
}

const TIER_WEIGHT = 1_000_000
const SIMILARITY_WEIGHT = 1_000
const MAX_USAGE_BOOST = 120

export function computeTier(document: BookmarkDocument, query: string): RankTier {
  const q = query.trim().toLowerCase()
  if (!q) return RankTier.Fuzzy

  const name = document.name.toLowerCase()
  if (name === q) return RankTier.NameExact
  if (name.startsWith(q)) return RankTier.NamePrefix
  if (document.url.toLowerCase().includes(q)) return RankTier.Url
  if (document.path.toLowerCase().includes(q)) return RankTier.Path
  return RankTier.Fuzzy
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Frequency + recency boost. Bounded so it can never bridge two tiers. */
export function computeUsageBoost(entry: UsageEntry | undefined, now: number = Date.now()): number {
  if (!entry) return 0

  const frequencyBoost = Math.min(entry.count, 50) * 2 // max 100
  const age = now - entry.lastUsedAt
  const recencyBoost = age < DAY_MS ? 20 : age < 7 * DAY_MS ? 10 : age < 30 * DAY_MS ? 4 : 0

  return Math.min(frequencyBoost + recencyBoost, MAX_USAGE_BOOST)
}

/** Converts a raw Fuse.js score (0 = perfect match, 1 = worst) into a similarity in [0, 1]. */
export function fuseScoreToSimilarity(fuseScore: number | undefined): number {
  if (fuseScore === undefined) return 1
  return 1 - Math.min(Math.max(fuseScore, 0), 1)
}

export interface RankInput {
  document: BookmarkDocument
  fuseScore: number | undefined
  query: string
  usage: UsageHistory
  now?: number
}

/** Combines match tier, fuzzy similarity, and usage history into a single sortable score. */
export function rankScore({ document, fuseScore, query, usage, now }: RankInput): number {
  const tier = computeTier(document, query)
  const similarity = fuseScoreToSimilarity(fuseScore)
  const usageBoost = computeUsageBoost(usage[document.id], now)

  return tier * TIER_WEIGHT + similarity * SIMILARITY_WEIGHT + usageBoost
}

/** Score used to order the default (no-query) result list: most/recently used first. */
export function usageOnlyScore(document: BookmarkDocument, usage: UsageHistory, now?: number): number {
  return computeUsageBoost(usage[document.id], now)
}
