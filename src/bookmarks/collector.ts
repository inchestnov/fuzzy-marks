import type { BookmarkDocument } from '@/types'

type BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode

/**
 * Extracts extra searchable tokens from a URL: hostname segments and
 * meaningful path segments (e.g. "grafana.company.com" -> ["grafana", "company", "com"]).
 */
function tokensFromUrl(url: string): string[] {
  try {
    const parsed = new URL(url)
    const hostTokens = parsed.hostname.split('.').filter(Boolean)
    const pathTokens = parsed.pathname
      .split('/')
      .filter((segment) => segment.length > 1 && segment.length < 30)
    return [...hostTokens, ...pathTokens]
  } catch {
    return []
  }
}

function tokensFromPath(path: string): string[] {
  return path
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
}

/** Shared with src/history/collector.ts, which builds the same document shape from chrome.history entries. */
export function buildKeywords(name: string, url: string, path: string): string[] {
  const tokens = new Set<string>()
  for (const token of [...tokensFromUrl(url), ...tokensFromPath(path)]) {
    tokens.add(token.toLowerCase())
  }
  // Drop tokens that just repeat words already present in the name.
  const nameLower = name.toLowerCase()
  return [...tokens].filter((token) => !nameLower.includes(token))
}

/**
 * Walks the browser bookmark tree and flattens it into a list of
 * BookmarkDocument records, skipping folders (nodes without a url).
 * Pure function — takes a tree, returns documents. No chrome.* calls,
 * so it can be unit tested with hand-built fixtures.
 */
export function flattenBookmarkTree(nodes: BookmarkTreeNode[]): BookmarkDocument[] {
  const documents: BookmarkDocument[] = []

  const visit = (node: BookmarkTreeNode, ancestry: string[]) => {
    if (node.url) {
      const path = ancestry.join(' / ')
      documents.push({
        id: node.id,
        name: node.title || node.url,
        url: node.url,
        path,
        keywords: buildKeywords(node.title || '', node.url, path),
        dateAdded: node.dateAdded,
      })
      return
    }

    const nextAncestry =
      node.title && node.parentId !== undefined ? [...ancestry, node.title] : ancestry

    for (const child of node.children ?? []) {
      visit(child, nextAncestry)
    }
  }

  for (const root of nodes) {
    for (const child of root.children ?? []) {
      visit(child, [])
    }
  }

  return documents
}

/** Fetches the live bookmark tree from the browser and flattens it. */
export async function collectBookmarks(): Promise<BookmarkDocument[]> {
  const tree = await chrome.bookmarks.getTree()
  return flattenBookmarkTree(tree)
}
