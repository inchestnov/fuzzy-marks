import { describe, expect, it } from 'vitest'
import { flattenBookmarkTree } from '@/bookmarks/collector'

type BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode

function root(children: BookmarkTreeNode[]): BookmarkTreeNode {
  return { id: '0', title: '', children, parentId: undefined }
}

function folder(id: string, title: string, children: BookmarkTreeNode[], parentId: string): BookmarkTreeNode {
  return { id, title, children, parentId }
}

function bookmark(
  id: string,
  title: string,
  url: string,
  parentId: string,
  dateAdded?: number,
): BookmarkTreeNode {
  return { id, title, url, parentId, dateAdded }
}

describe('flattenBookmarkTree', () => {
  it('skips folder nodes and only produces documents for bookmarks with a url', () => {
    const tree: BookmarkTreeNode[] = [
      root([
        folder('1', 'Bookmarks Bar', [bookmark('2', 'Example', 'https://example.com', '1')], '0'),
      ]),
    ]

    const docs = flattenBookmarkTree(tree)
    expect(docs).toHaveLength(1)
    expect(docs[0].id).toBe('2')
    expect(docs[0].name).toBe('Example')
    expect(docs[0].url).toBe('https://example.com')
  })

  it('joins ancestor folder titles with " / " to build the path', () => {
    const tree: BookmarkTreeNode[] = [
      root([
        folder(
          '1',
          'Bookmarks Bar',
          [
            folder(
              '2',
              'Development',
              [
                folder('3', 'Kubernetes', [bookmark('4', 'Grafana', 'https://grafana.company.com', '3')], '2'),
              ],
              '1',
            ),
          ],
          '0',
        ),
      ]),
    ]

    const docs = flattenBookmarkTree(tree)
    expect(docs).toHaveLength(1)
    // Root node's title is '' and is excluded from ancestry (falsy title).
    expect(docs[0].path).toBe('Bookmarks Bar / Development / Kubernetes')
  })

  it('handles multiple top-level roots and nested + sibling folders', () => {
    const tree: BookmarkTreeNode[] = [
      root([
        folder(
          '1',
          'Bookmarks Bar',
          [
            bookmark('2', 'Top Level Bookmark', 'https://a.example.com', '1'),
            folder('3', 'Work', [bookmark('4', 'Work Bookmark', 'https://b.example.com', '3')], '1'),
          ],
          '0',
        ),
        folder('5', 'Other Bookmarks', [bookmark('6', 'Other Bookmark', 'https://c.example.com', '5')], '0'),
      ]),
    ]

    const docs = flattenBookmarkTree(tree)
    expect(docs).toHaveLength(3)

    const byId = Object.fromEntries(docs.map((d) => [d.id, d]))
    expect(byId['2'].path).toBe('Bookmarks Bar')
    expect(byId['4'].path).toBe('Bookmarks Bar / Work')
    expect(byId['6'].path).toBe('Other Bookmarks')
  })

  it('extracts keywords from the url hostname/path segments and folder names, lowercased', () => {
    const tree: BookmarkTreeNode[] = [
      root([
        folder(
          '1',
          'Development',
          [
            folder(
              '2',
              'Kubernetes',
              [bookmark('3', 'Dashboard', 'https://k8s.example.com/dashboard/overview', '2')],
              '1',
            ),
          ],
          '0',
        ),
      ]),
    ]

    const docs = flattenBookmarkTree(tree)
    const doc = docs[0]

    expect(doc.keywords).toEqual(expect.arrayContaining(['k8s', 'example', 'com', 'overview', 'development', 'kubernetes']))
    // All keywords must be lowercase.
    for (const kw of doc.keywords) {
      expect(kw).toBe(kw.toLowerCase())
    }
  })

  it('drops keyword tokens that already appear as words in the (lowercased) name', () => {
    const tree: BookmarkTreeNode[] = [
      root([
        folder('1', 'Grafana', [bookmark('2', 'Grafana Dashboard', 'https://grafana.company.com', '1')], '0'),
      ]),
    ]

    const docs = flattenBookmarkTree(tree)
    const doc = docs[0]
    // "grafana" appears in the name, and in both the folder name and hostname token,
    // so it should be filtered out of keywords.
    expect(doc.keywords).not.toContain('grafana')
    expect(doc.keywords).toEqual(expect.arrayContaining(['company', 'com']))
  })

  it('passes dateAdded through unchanged, and omits it when absent', () => {
    const tree: BookmarkTreeNode[] = [
      root([
        folder(
          '1',
          'Bookmarks Bar',
          [
            bookmark('2', 'With Date', 'https://example.com/a', '1', 1_700_000_000_000),
            bookmark('3', 'No Date', 'https://example.com/b', '1'),
          ],
          '0',
        ),
      ]),
    ]

    const docs = flattenBookmarkTree(tree)
    const byId = Object.fromEntries(docs.map((d) => [d.id, d]))
    expect(byId['2'].dateAdded).toBe(1_700_000_000_000)
    expect(byId['3'].dateAdded).toBeUndefined()
  })

  it('falls back to the url as the name when title is empty', () => {
    const tree: BookmarkTreeNode[] = [
      root([
        folder(
          '1',
          'Bookmarks Bar',
          [{ id: '2', title: '', url: 'https://example.com/untitled', parentId: '1' }],
          '0',
        ),
      ]),
    ]

    const docs = flattenBookmarkTree(tree)
    expect(docs[0].name).toBe('https://example.com/untitled')
  })

  it('returns an empty array for an empty tree', () => {
    expect(flattenBookmarkTree([])).toEqual([])
  })
})
