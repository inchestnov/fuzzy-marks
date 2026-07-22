import Fuse, { type IFuseOptions } from 'fuse.js'
import type { BookmarkDocument, SearchResult, UsageHistory } from '@/types'
import { rankScore, usageOnlyScore } from './ranking'

/**
 * Fuse's extended-search AND (space = "all terms must match") is evaluated
 * per key, not across keys — so a query like "kub graf" would never match a
 * document where "kub" only appears in `path` and "graf" only in `name`.
 * We index a single combined field per document instead, so tokens can be
 * satisfied by any part of the document. `name` is repeated to bias Fuse's
 * internal similarity score toward name matches (tier ranking in ranking.ts
 * still does the heavy lifting for match-type priority).
 */
interface IndexedDocument extends BookmarkDocument {
  searchable: string
}

function toIndexed(document: BookmarkDocument): IndexedDocument {
  const searchable = [document.name, document.name, document.keywords.join(' '), document.path, document.url]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return { ...document, searchable }
}

const FUSE_OPTIONS: IFuseOptions<IndexedDocument> = {
  includeScore: true,
  useExtendedSearch: true,
  ignoreLocation: true,
  threshold: 0.4,
  distance: 300,
  minMatchCharLength: 2,
  keys: ['searchable'],
}

/**
 * Builds a Fuse.js "extended search" query where every whitespace-separated
 * token must match somewhere (AND), while each token stays fuzzy/typo-tolerant.
 * This is what lets "kub graf" find "Kubernetes Grafana Dashboard".
 */
function toExtendedQuery(query: string): string {
  return query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(' ')
}

export interface SearchOptions {
  limit?: number
  usage?: UsageHistory
}

export class SearchEngine {
  private fuse: Fuse<IndexedDocument>
  private documents: BookmarkDocument[]

  constructor(documents: BookmarkDocument[] = []) {
    this.documents = documents
    this.fuse = new Fuse(documents.map(toIndexed), FUSE_OPTIONS)
  }

  setDocuments(documents: BookmarkDocument[]): void {
    this.documents = documents
    this.fuse = new Fuse(documents.map(toIndexed), FUSE_OPTIONS)
  }

  get size(): number {
    return this.documents.length
  }

  search(query: string, options: SearchOptions = {}): SearchResult[] {
    const limit = options.limit ?? 8
    const usage = options.usage ?? {}
    const trimmed = query.trim()

    if (!trimmed) {
      return this.documents
        .map((document) => ({ document, score: usageOnlyScore(document, usage) }))
        .sort((a, b) => b.score - a.score || a.document.name.localeCompare(b.document.name))
        .slice(0, limit)
    }

    const fuseResults = this.fuse.search(toExtendedQuery(trimmed), { limit: Math.max(limit * 5, 40) })

    return fuseResults
      .map((result) => ({
        document: result.item,
        score: rankScore({ document: result.item, fuseScore: result.score, query: trimmed, usage }),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }
}
