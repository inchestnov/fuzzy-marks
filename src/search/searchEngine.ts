import type { BookmarkDocument, SearchResult, UsageHistory } from '@/types'
import { rankScore, usageOnlyScore } from './ranking'

/**
 * Matching is a strict, case-insensitive, ORDER-SENSITIVE substring AND: the
 * query is split into whitespace-separated tokens, and a document matches
 * only if every token is a literal substring of the combined searchable text
 * AND the tokens' matches occur in the same left-to-right order as typed.
 * The "fuzzy" part is purely about distance — any amount of other text is
 * allowed between two token matches — there is no per-character/typo
 * tolerance: "lu" must not match "overview", and "gi se pro" must not match
 * unless "gi", then later "se", then later "pro" each occur intact, in that
 * order (see the search requirements).
 *
 * Tokens can be satisfied by any part of the document because we search one
 * combined field (name + keywords + path + url) rather than per-key, so a
 * query like "kub graf" can match a doc where "kub" is only in the path and
 * "graf" only in the url, as long as "kub" occurs before "graf" in the
 * concatenated text.
 */
interface IndexedDocument {
  document: BookmarkDocument
  searchable: string
}

function toSearchable(document: BookmarkDocument): string {
  return [document.name, document.keywords.join(' '), document.path, document.url]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/**
 * Splits a query into lowercase tokens on runs of whitespace, discarding the
 * empty strings that consecutive spaces would otherwise produce. "manager
 * service" and "manager   service" tokenize identically.
 */
export function tokenize(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean)
}

/**
 * Checks that every token occurs as a literal substring of `searchable`, in
 * the same left-to-right order as `tokens`, with any amount of other text
 * allowed between matches. Each token's own characters must be contiguous —
 * only the gap *between* tokens is fuzzy.
 */
function matchesInOrder(searchable: string, tokens: string[]): boolean {
  let cursor = 0
  for (const token of tokens) {
    const index = searchable.indexOf(token, cursor)
    if (index === -1) return false
    cursor = index + token.length
  }
  return true
}

export interface SearchOptions {
  limit?: number
  usage?: UsageHistory
}

export class SearchEngine {
  private indexed: IndexedDocument[]
  private documents: BookmarkDocument[]

  constructor(documents: BookmarkDocument[] = []) {
    this.documents = documents
    this.indexed = documents.map((document) => ({ document, searchable: toSearchable(document) }))
  }

  setDocuments(documents: BookmarkDocument[]): void {
    this.documents = documents
    this.indexed = documents.map((document) => ({ document, searchable: toSearchable(document) }))
  }

  get size(): number {
    return this.documents.length
  }

  search(query: string, options: SearchOptions = {}): SearchResult[] {
    const limit = options.limit ?? 8
    const usage = options.usage ?? {}
    const tokens = tokenize(query)

    if (tokens.length === 0) {
      return this.documents
        .map((document) => ({ document, score: usageOnlyScore(document, usage) }))
        .sort((a, b) => b.score - a.score || a.document.name.localeCompare(b.document.name))
        .slice(0, limit)
    }

    const trimmed = query.trim()

    return this.indexed
      .filter(({ searchable }) => matchesInOrder(searchable, tokens))
      .map(({ document }) => ({
        document,
        score: rankScore({ document, fuseScore: undefined, query: trimmed, usage }),
      }))
      .sort((a, b) => b.score - a.score || a.document.name.localeCompare(b.document.name))
      .slice(0, limit)
  }
}
