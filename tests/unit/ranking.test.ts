import { describe, expect, it } from 'vitest'
import {
  RankTier,
  computeTier,
  computeUsageBoost,
  fuseScoreToSimilarity,
  rankScore,
  usageOnlyScore,
} from '@/search/ranking'
import type { BookmarkDocument, UsageEntry, UsageHistory } from '@/types'

function makeDoc(overrides: Partial<BookmarkDocument> = {}): BookmarkDocument {
  return {
    id: 'doc-1',
    name: 'Kubernetes Dashboard',
    url: 'https://k8s.example.com/dashboard',
    path: 'Development / Kubernetes',
    keywords: ['k8s', 'example', 'com', 'dashboard'],
    ...overrides,
  }
}

describe('computeTier', () => {
  it('returns Fuzzy for an empty/whitespace query', () => {
    const doc = makeDoc()
    expect(computeTier(doc, '')).toBe(RankTier.Fuzzy)
    expect(computeTier(doc, '   ')).toBe(RankTier.Fuzzy)
  })

  it('returns NameExact when the query exactly matches the name (case-insensitive)', () => {
    const doc = makeDoc({ name: 'Kubernetes Dashboard' })
    expect(computeTier(doc, 'Kubernetes Dashboard')).toBe(RankTier.NameExact)
    expect(computeTier(doc, 'kubernetes dashboard')).toBe(RankTier.NameExact)
    expect(computeTier(doc, 'KUBERNETES DASHBOARD')).toBe(RankTier.NameExact)
  })

  it('returns NamePrefix when the query prefixes the name but is not exact', () => {
    const doc = makeDoc({ name: 'Kubernetes Dashboard' })
    expect(computeTier(doc, 'Kubernetes')).toBe(RankTier.NamePrefix)
    expect(computeTier(doc, 'kube')).toBe(RankTier.NamePrefix)
  })

  it('returns Url when the query is found in the URL but not the name', () => {
    const doc = makeDoc({ name: 'Kubernetes Dashboard', url: 'https://k8s.example.com/dashboard' })
    expect(computeTier(doc, 'k8s.example')).toBe(RankTier.Url)
  })

  it('returns Path when the query is found in the path but not name/url', () => {
    const doc = makeDoc({
      name: 'Grafana Production Dashboard',
      url: 'https://grafana.company.com',
      path: 'Development / Kubernetes',
    })
    expect(computeTier(doc, 'kubernetes')).toBe(RankTier.Path)
  })

  it('returns Fuzzy when the query does not directly match name, url, or path', () => {
    const doc = makeDoc({
      name: 'Grafana Production Dashboard',
      url: 'https://grafana.company.com',
      path: 'Development / Kubernetes',
    })
    expect(computeTier(doc, 'monitoring')).toBe(RankTier.Fuzzy)
  })

  it('is case-insensitive for url and path checks', () => {
    const doc = makeDoc({
      name: 'Grafana Production Dashboard',
      url: 'https://Grafana.Company.com',
      path: 'Development / Kubernetes',
    })
    expect(computeTier(doc, 'COMPANY')).toBe(RankTier.Url)
    expect(computeTier(doc, 'KUBERNETES')).toBe(RankTier.Path)
  })
})

describe('computeUsageBoost', () => {
  it('returns 0 for an undefined entry', () => {
    expect(computeUsageBoost(undefined)).toBe(0)
  })

  it('caps the frequency boost at count=50 (100 points)', () => {
    const now = Date.now()
    const entry: UsageEntry = { count: 1000, lastUsedAt: now - 60 * 24 * 60 * 60 * 1000 } // old, no recency bonus
    // frequency capped at min(1000,50)*2 = 100, recency = 0 (older than 30 days)
    expect(computeUsageBoost(entry, now)).toBe(100)
  })

  it('gives +20 recency bonus for use within the last day', () => {
    const now = Date.now()
    const entry: UsageEntry = { count: 0, lastUsedAt: now - 60 * 60 * 1000 } // 1 hour ago
    expect(computeUsageBoost(entry, now)).toBe(20)
  })

  it('gives +10 recency bonus for use within the last week (but more than a day ago)', () => {
    const now = Date.now()
    const entry: UsageEntry = { count: 0, lastUsedAt: now - 3 * 24 * 60 * 60 * 1000 } // 3 days ago
    expect(computeUsageBoost(entry, now)).toBe(10)
  })

  it('gives +4 recency bonus for use within the last month (but more than a week ago)', () => {
    const now = Date.now()
    const entry: UsageEntry = { count: 0, lastUsedAt: now - 20 * 24 * 60 * 60 * 1000 } // 20 days ago
    expect(computeUsageBoost(entry, now)).toBe(4)
  })

  it('gives 0 recency bonus beyond 30 days', () => {
    const now = Date.now()
    const entry: UsageEntry = { count: 0, lastUsedAt: now - 40 * 24 * 60 * 60 * 1000 }
    expect(computeUsageBoost(entry, now)).toBe(0)
  })

  it('caps the total boost at 120 even with high frequency and recency', () => {
    const now = Date.now()
    const entry: UsageEntry = { count: 1000, lastUsedAt: now } // 100 + 20 = 120, exactly at cap
    expect(computeUsageBoost(entry, now)).toBe(120)
  })
})

describe('fuseScoreToSimilarity', () => {
  it('returns 1 when fuseScore is undefined', () => {
    expect(fuseScoreToSimilarity(undefined)).toBe(1)
  })

  it('returns 1 for a perfect fuse score of 0', () => {
    expect(fuseScoreToSimilarity(0)).toBe(1)
  })

  it('returns 0 for the worst fuse score of 1', () => {
    expect(fuseScoreToSimilarity(1)).toBe(0)
  })

  it('clamps scores above 1 or below 0', () => {
    expect(fuseScoreToSimilarity(2)).toBe(0)
    expect(fuseScoreToSimilarity(-1)).toBe(1)
  })

  it('linearly inverts mid-range scores', () => {
    expect(fuseScoreToSimilarity(0.3)).toBeCloseTo(0.7)
  })
})

describe('rankScore', () => {
  it('always ranks a higher tier above a lower tier, regardless of similarity or usage', () => {
    const now = Date.now()
    const namePrefixDoc = makeDoc({ id: 'prefix-doc', name: 'Grafana Dashboard' })
    const fuzzyDoc = makeDoc({ id: 'fuzzy-doc', name: 'Totally Unrelated Bookmark' })

    const usage: UsageHistory = {
      // Fuzzy doc has maximum possible usage boost.
      'fuzzy-doc': { count: 10_000, lastUsedAt: now },
      // Prefix doc has zero usage history.
    }

    const prefixScore = rankScore({
      document: namePrefixDoc,
      fuseScore: 1, // worst possible similarity
      query: 'graf',
      usage,
      now,
    })

    const fuzzyScore = rankScore({
      document: fuzzyDoc,
      fuseScore: 0, // best possible similarity
      query: 'graf',
      usage,
      now,
    })

    expect(computeTier(namePrefixDoc, 'graf')).toBe(RankTier.NamePrefix)
    expect(computeTier(fuzzyDoc, 'graf')).toBe(RankTier.Fuzzy)
    expect(prefixScore).toBeGreaterThan(fuzzyScore)
  })

  it('orders NameExact > NamePrefix > Url > Path > Fuzzy for the same base document family', () => {
    const now = Date.now()
    const query = 'grafana'

    const exactDoc = makeDoc({ id: 'exact', name: 'Grafana' })
    const prefixDoc = makeDoc({ id: 'prefix', name: 'Grafana Dashboard' })
    const urlDoc = makeDoc({ id: 'url', name: 'Monitoring Tool', url: 'https://grafana.company.com' })
    const pathDoc = makeDoc({ id: 'path', name: 'Monitoring Tool', url: 'https://example.com', path: 'Grafana / Tools' })
    const fuzzyDoc = makeDoc({ id: 'fuzzy', name: 'Something Else', url: 'https://example.com', path: 'Other' })

    const usage: UsageHistory = {}
    const score = (doc: BookmarkDocument) => rankScore({ document: doc, fuseScore: 0.2, query, usage, now })

    const scores = [exactDoc, prefixDoc, urlDoc, pathDoc, fuzzyDoc].map(score)
    const sorted = [...scores].sort((a, b) => b - a)
    expect(scores).toEqual(sorted)
    // sanity: all distinct
    expect(new Set(scores).size).toBe(5)
  })

  it('uses similarity and usage to break ties within the same tier', () => {
    const now = Date.now()
    // Query deliberately shares no substring with either doc's name/url/path so
    // both land in the Fuzzy tier (the tier check is exact/prefix/includes-based).
    const query = 'zzz-nomatch'
    const docA = makeDoc({ id: 'a', name: 'Alpha Notes' })
    const docB = makeDoc({ id: 'b', name: 'Beta Notes' })

    const usage: UsageHistory = {
      a: { count: 5, lastUsedAt: now },
    }

    const scoreA = rankScore({ document: docA, fuseScore: 0.1, query, usage, now })
    const scoreB = rankScore({ document: docB, fuseScore: 0.1, query, usage, now })

    expect(computeTier(docA, query)).toBe(RankTier.Fuzzy)
    expect(computeTier(docB, query)).toBe(RankTier.Fuzzy)
    expect(scoreA).toBeGreaterThan(scoreB)
  })
})

describe('usageOnlyScore', () => {
  it('delegates to computeUsageBoost for the document id', () => {
    const now = Date.now()
    const doc = makeDoc({ id: 'doc-1' })
    const usage: UsageHistory = { 'doc-1': { count: 3, lastUsedAt: now } }
    expect(usageOnlyScore(doc, usage, now)).toBe(computeUsageBoost(usage['doc-1'], now))
  })

  it('returns 0 for a document with no usage history', () => {
    const doc = makeDoc({ id: 'no-history' })
    expect(usageOnlyScore(doc, {})).toBe(0)
  })
})
