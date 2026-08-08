import { describe, expect, it } from 'vitest'
import { SearchEngine } from '@/search/searchEngine'
import type { BookmarkDocument, UsageHistory } from '@/types'

const docs: BookmarkDocument[] = [
  {
    id: 'k8s-dashboard',
    name: 'Kubernetes Dashboard',
    url: 'https://k8s.example.com/dashboard',
    path: 'Development / Kubernetes',
    keywords: ['k8s', 'example', 'com', 'dashboard'],
  },
  {
    id: 'github-k8s-repo',
    name: 'GitHub Kubernetes Repository',
    url: 'https://github.com/example/kubernetes',
    path: 'Development / Source Control',
    keywords: ['github', 'com', 'example', 'kubernetes', 'source', 'control'],
  },
  {
    id: 'grafana-prod',
    name: 'Grafana Production Dashboard',
    url: 'https://grafana.company.com',
    path: 'Development / Kubernetes',
    keywords: ['company', 'com'],
  },
  {
    id: 'unrelated-recipes',
    name: 'Favorite Recipes',
    url: 'https://cooking.example.com/recipes',
    path: 'Personal / Cooking',
    keywords: ['cooking', 'example', 'com', 'recipes'],
  },
  {
    id: 'unrelated-news',
    name: 'Daily News',
    url: 'https://news.example.com',
    path: 'Personal',
    keywords: ['news', 'example', 'com'],
  },
]

function buildEngine(): SearchEngine {
  return new SearchEngine(docs)
}

describe('SearchEngine', () => {
  it('finds the Grafana bookmark for a multi-term query spanning path and name ("kub graf")', () => {
    const engine = buildEngine()
    const results = engine.search('kub graf')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].document.id).toBe('grafana-prod')
  })

  it('finds the GitHub Kubernetes repo for "git kub"', () => {
    const engine = buildEngine()
    const results = engine.search('git kub')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].document.id).toBe('github-k8s-repo')
  })

  it('does NOT tolerate typos — "grafna" (no such substring) yields no results', () => {
    const engine = buildEngine()
    expect(engine.search('grafna')).toHaveLength(0)
  })

  it('is case-insensitive for both query and document text', () => {
    const engine = buildEngine()
    const ids = engine.search('GRAFANA').map((r) => r.document.id)
    expect(ids).toContain('grafana-prod')
  })

  it('requires query tokens to occur in the same order as typed ("g se pr" / "gi se pro")', () => {
    const engine = new SearchEngine([
      {
        id: 'gibson-service',
        name: 'Gibson Service Prod',
        url: 'https://internal.example.com/g8f3',
        path: 'Ops / Infra',
        keywords: [],
      },
    ])
    // Short, non-contiguous tokens still match as long as they occur in order,
    // with any distance between them — that's the "fuzzy" part.
    expect(engine.search('g se pr').map((r) => r.document.id)).toEqual(['gibson-service'])
    expect(engine.search('gi se pro').map((r) => r.document.id)).toEqual(['gibson-service'])
    // The text is "gibson service prod" (in that order) — reversing the query
    // tokens must exclude the document rather than just re-rank it.
    expect(engine.search('pr se g')).toHaveLength(0)
  })

  it('requires every token to be present (AND), excluding partial matches', () => {
    const engine = buildEngine()
    // "grafana" matches grafana-prod, but "handler" appears nowhere -> excluded.
    expect(engine.search('grafana handler')).toHaveLength(0)
  })

  it('collapses runs of whitespace into token separators without empty tokens', () => {
    const engine = buildEngine()
    const tight = engine.search('kub graf').map((r) => r.document.id)
    const loose = engine.search('  kub    graf  ').map((r) => r.document.id)
    expect(loose).toEqual(tight)
  })

  it('matches tokens as substrings occurring in order anywhere in the combined text ("man ser ov")', () => {
    const engine = new SearchEngine([
      {
        id: 'prod-manager',
        name: '[prod] manager service overview',
        url: 'https://example.com/prod',
        path: 'Ops',
        keywords: [],
      },
    ])
    // Tokens occur in this order in the name field: manager, service, overview.
    expect(engine.search('man ser ov').map((r) => r.document.id)).toEqual(['prod-manager'])
    // "lu" is absent as a literal substring -> the whole row is dropped even
    // though "s"/"ov" match.
    expect(engine.search('lu s ov')).toHaveLength(0)
    // Reversed order ("overview" before "service" before "manager" in the
    // query) does not occur in that order in the text -> excluded.
    expect(engine.search('ov ser man')).toHaveLength(0)
  })

  it('returns all documents ordered by usage (desc) then name when the query is empty', () => {
    const engine = buildEngine()
    const usage: UsageHistory = {
      'unrelated-news': { count: 10, lastUsedAt: Date.now() },
    }

    const results = engine.search('', { usage })
    expect(results[0].document.id).toBe('unrelated-news')

    // The remaining docs (zero usage boost) should be alphabetically ordered by name.
    const rest = results.slice(1).map((r) => r.document.name)
    const sortedRest = [...rest].sort((a, b) => a.localeCompare(b))
    expect(rest).toEqual(sortedRest)
  })

  it('respects the limit option', () => {
    const engine = buildEngine()
    const resultsAll = engine.search('', { limit: 100 })
    expect(resultsAll).toHaveLength(docs.length)

    const resultsLimited = engine.search('', { limit: 2 })
    expect(resultsLimited).toHaveLength(2)

    const fuzzyLimited = engine.search('example', { limit: 1 })
    expect(fuzzyLimited).toHaveLength(1)
  })

  it('reflects documents set via setDocuments', () => {
    const engine = new SearchEngine([])
    expect(engine.size).toBe(0)
    engine.setDocuments(docs)
    expect(engine.size).toBe(docs.length)
    const results = engine.search('grafana')
    expect(results[0].document.id).toBe('grafana-prod')
  })
})
