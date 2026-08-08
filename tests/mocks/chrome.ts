import { vi, type Mock } from 'vitest'

type Listener = (...args: any[]) => any

interface MockTab {
  id: number
  url: string
  title?: string
  windowId: number
  active?: boolean
}

interface MockHistoryItem {
  id: string
  url?: string
  title?: string
  lastVisitTime?: number
  visitCount?: number
}

function createEvent() {
  const listeners = new Set<Listener>()
  return {
    addListener: (fn: Listener) => listeners.add(fn),
    removeListener: (fn: Listener) => listeners.delete(fn),
    hasListener: (fn: Listener) => listeners.has(fn),
    /** Test helper: fire every registered listener. Not part of the real chrome.* API. */
    __emit: (...args: unknown[]) => listeners.forEach((fn) => fn(...args)),
  }
}

export interface ChromeMock {
  bookmarks: {
    getTree: Mock<[], Promise<unknown[]>>
    onCreated: ReturnType<typeof createEvent>
    onRemoved: ReturnType<typeof createEvent>
    onChanged: ReturnType<typeof createEvent>
    onMoved: ReturnType<typeof createEvent>
    onImportEnded: ReturnType<typeof createEvent>
    __setTree: (tree: unknown[]) => void
  }
  storage: {
    local: {
      get: Mock<[key: string], Promise<Record<string, unknown>>>
      set: Mock<[values: Record<string, unknown>], Promise<void>>
      __store: Record<string, unknown>
    }
  }
  runtime: {
    id: string
    onInstalled: ReturnType<typeof createEvent>
    onStartup: ReturnType<typeof createEvent>
    onMessage: Omit<ReturnType<typeof createEvent>, 'addListener'> & { addListener: Mock<[fn: Listener], undefined> }
    sendMessage: Mock<any[], unknown>
  }
  tabs: {
    query: Mock<[{ url?: string; active?: boolean; lastFocusedWindow?: boolean }?], Promise<MockTab[]>>
    create: Mock<[{ url: string }], Promise<MockTab>>
    update: Mock<any[], Promise<undefined>>
    __tabs: MockTab[]
    __setTabs: (tabs: MockTab[]) => void
  }
  windows: {
    update: Mock<any[], Promise<undefined>>
  }
  commands: {
    getAll: Mock<[], Promise<Array<{ name: string; shortcut: string }>>>
  }
  history: {
    search: Mock<[{ text: string; startTime?: number; maxResults?: number }], Promise<MockHistoryItem[]>>
    onVisited: ReturnType<typeof createEvent>
    onVisitRemoved: ReturnType<typeof createEvent>
    __setItems: (items: MockHistoryItem[]) => void
  }
}

/**
 * Builds a minimal in-memory chrome.* mock covering only what Scauta's
 * background/storage/bookmarks modules call. Install it on `globalThis.chrome`
 * BEFORE importing the module under test (use `vi.resetModules()` +
 * `await import(...)` in each test so top-level listener registration in
 * background/index.ts sees this mock).
 */
export function installChromeMock(): ChromeMock {
  let tree: unknown[] = [{ id: '0', title: '', children: [] }]
  let tabId = 1
  let historyItems: MockHistoryItem[] = []

  const mock: ChromeMock = {
    bookmarks: {
      getTree: vi.fn(async () => tree),
      onCreated: createEvent(),
      onRemoved: createEvent(),
      onChanged: createEvent(),
      onMoved: createEvent(),
      onImportEnded: createEvent(),
      __setTree: (nextTree: unknown[]) => {
        tree = nextTree
      },
    },
    storage: {
      local: {
        __store: {},
        get: vi.fn(async (key: string) => {
          const store = mock.storage.local.__store
          return key in store ? { [key]: store[key] } : {}
        }),
        set: vi.fn(async (values: Record<string, unknown>) => {
          Object.assign(mock.storage.local.__store, values)
        }),
      },
    },
    runtime: {
      id: 'test-extension-id',
      onInstalled: createEvent(),
      onStartup: createEvent(),
      // Placeholder; replaced below with a version whose addListener is spied
      // without recursing into itself.
      onMessage: Object.assign(createEvent(), { addListener: vi.fn((_fn: Listener): undefined => undefined) }),
      sendMessage: vi.fn(),
    },
    tabs: {
      __tabs: [],
      query: vi.fn(
        async ({ url, active }: { url?: string; active?: boolean; lastFocusedWindow?: boolean } = {}) => {
          let result = mock.tabs.__tabs
          if (url !== undefined) result = result.filter((t) => t.url === url)
          if (active !== undefined) result = result.filter((t) => Boolean(t.active) === active)
          return result
        },
      ),
      create: vi.fn(async ({ url }: { url: string }) => {
        const tab = { id: tabId++, url, windowId: 1 }
        mock.tabs.__tabs.push(tab)
        return tab
      }),
      update: vi.fn(async () => undefined),
      __setTabs: (tabs: MockTab[]) => {
        mock.tabs.__tabs = tabs
      },
    },
    windows: {
      update: vi.fn(async () => undefined),
    },
    commands: {
      getAll: vi.fn(async () => [
        { name: '_execute_action', shortcut: 'Ctrl+Shift+E' },
      ]),
    },
    history: {
      search: vi.fn(async (_query: { text: string; startTime?: number; maxResults?: number }) => historyItems),
      onVisited: createEvent(),
      onVisitRemoved: createEvent(),
      __setItems: (items: MockHistoryItem[]) => {
        historyItems = items
      },
    },
  }

  // onMessage needs both the event-style API (for __emit in tests) and to be
  // what `chrome.runtime.onMessage.addListener(...)` actually registers to.
  // Keep the real listener-tracking logic on a separate object so wrapping it
  // in a spied `addListener` below doesn't recurse into itself.
  const onMessageListeners = createEvent()
  mock.runtime.onMessage = {
    __emit: onMessageListeners.__emit,
    removeListener: onMessageListeners.removeListener,
    hasListener: onMessageListeners.hasListener,
    addListener: vi.fn((fn: Listener): undefined => {
      onMessageListeners.addListener(fn)
      return undefined
    }),
  }

  ;(globalThis as { chrome?: unknown }).chrome = mock
  return mock
}
