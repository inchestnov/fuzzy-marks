import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { installChromeMock, type ChromeMock } from '../mocks/chrome'
import { collectBookmarks } from '@/bookmarks/collector'
import { SearchEngine } from '@/search/searchEngine'

describe('bookmarks collection -> search integration', () => {
  let mock: ChromeMock

  beforeEach(() => {
    mock = installChromeMock()
  })

  afterEach(() => {
    delete (globalThis as { chrome?: unknown }).chrome
  })

  it('collects bookmarks from the mocked chrome tree and finds them via SearchEngine', async () => {
    mock.bookmarks.__setTree([
      {
        id: '0',
        title: '',
        children: [
          {
            id: '1',
            title: 'Bookmarks Bar',
            parentId: '0',
            children: [
              {
                id: '2',
                title: 'Kubernetes Dashboard',
                url: 'https://k8s.example.com/dashboard',
                parentId: '1',
              },
              {
                id: '3',
                title: 'Development',
                parentId: '1',
                children: [
                  {
                    id: '6',
                    title: 'Kubernetes',
                    parentId: '3',
                    children: [
                      {
                        id: '4',
                        title: 'Grafana Production Dashboard',
                        url: 'https://grafana.company.com',
                        parentId: '6',
                      },
                    ],
                  },
                  {
                    id: '5',
                    title: 'GitHub Kubernetes Repository',
                    url: 'https://github.com/example/kubernetes',
                    parentId: '3',
                  },
                ],
              },
            ],
          },
        ],
      },
    ])

    const documents = await collectBookmarks()
    expect(documents).toHaveLength(3)
    expect(documents.map((d) => d.path).sort()).toEqual([
      'Bookmarks Bar',
      'Bookmarks Bar / Development',
      'Bookmarks Bar / Development / Kubernetes',
    ])

    const engine = new SearchEngine(documents)

    const grafanaResults = engine.search('kub graf')
    expect(grafanaResults[0].document.id).toBe('4')

    const githubResults = engine.search('git kub')
    expect(githubResults[0].document.id).toBe('5')

    const dashboardResults = engine.search('kubernetes dashboard')
    expect(dashboardResults[0].document.id).toBe('2')
  })

  it('reflects tree changes when collectBookmarks is called again', async () => {
    mock.bookmarks.__setTree([
      {
        id: '0',
        title: '',
        children: [
          { id: '1', title: 'Bar', parentId: '0', children: [{ id: '2', title: 'First', url: 'https://first.example.com', parentId: '1' }] },
        ],
      },
    ])

    const firstPass = await collectBookmarks()
    expect(firstPass).toHaveLength(1)

    mock.bookmarks.__setTree([
      {
        id: '0',
        title: '',
        children: [
          {
            id: '1',
            title: 'Bar',
            parentId: '0',
            children: [
              { id: '2', title: 'First', url: 'https://first.example.com', parentId: '1' },
              { id: '3', title: 'Second', url: 'https://second.example.com', parentId: '1' },
            ],
          },
        ],
      },
    ])

    const secondPass = await collectBookmarks()
    expect(secondPass).toHaveLength(2)
  })
})
