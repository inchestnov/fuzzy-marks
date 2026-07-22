# Architecture

Scauta has four independently testable modules and one thin UI layer that
ties them together. This document describes the module graph as built, the
protocol the popup and background worker use to talk to each other, and where
the boundary for other-browser support would go.

```
                 Browser Bookmarks (chrome.bookmarks)
                              |
                              v
                    Bookmark Collector (src/bookmarks)
                              |
                              v
                    Background Service Worker (src/background)
                       — owns the index, caches it in
                         chrome.storage.local, rebuilds on
                         bookmarks.on* events
                              |
                    message passing (chrome.runtime.sendMessage)
                              |
                              v
                        Popup UI (src/popup, src/components)
                              |
                              v
                    Search Engine (src/search)
                       — Fuse.js + tiered ranking,
                         runs inside the popup
                              |
                              v
                        Open Bookmark (chrome.tabs)
```

This is close to the pipeline in the original spec (`Bookmark Collector →
Search Index → Fuzzy Search Engine → React UI → Open Bookmark`), with one
deliberate deviation: the search engine runs **inside the popup**, not in the
background worker. The rest of this document explains why, and how the
pieces fit together.

## Modules

### Background service worker (`src/background/index.ts`)

The service worker is the single owner of the bookmark index. It:

- Calls `collectBookmarks()` to rebuild the index on `chrome.runtime.onInstalled`,
  `onStartup`, and every `chrome.bookmarks.on{Created,Removed,Changed,Moved,ImportEnded}`
  event, and caches the result in `chrome.storage.local` via `setCachedIndex`.
- Serves the cached index to the popup on request (`scauta:get-documents`),
  rebuilding first if no cache exists yet.
- Handles `scauta:refresh-index` for an explicit forced rebuild.
- Handles `scauta:record-open`, writing a usage entry (count + last-used
  timestamp) to `chrome.storage.local`.
- Handles `scauta:open-bookmark`, which records the usage entry *and* opens
  the URL — focusing an existing tab with a matching URL via `chrome.tabs.query`
  + `chrome.tabs.update` + `chrome.windows.update` if one exists, or creating a
  new tab otherwise.

MV3 service workers are ephemeral — Chrome can and will kill them between
events, so nothing can be safely kept only in memory across popup opens. That
is why the index is persisted to `chrome.storage.local` rather than held in a
module-level variable: every `scauta:get-documents` call can be served
correctly whether the worker has been running for hours or was just spun up
to handle this one message. A `rebuildInFlight` promise is kept in memory
purely to de-duplicate concurrent rebuild requests within a single worker
lifetime, not as a cache.

### Bookmark Collector (`src/bookmarks/collector.ts`)

`flattenBookmarkTree` is a pure function: it takes the tree returned by
`chrome.bookmarks.getTree()` and returns a flat `BookmarkDocument[]`, with no
`chrome.*` calls of its own. This is what makes it unit-testable with
hand-built tree fixtures (see `tests/unit/collector.test.ts`) instead of
requiring a live browser. `collectBookmarks()` is the thin wrapper that
supplies the real tree.

Folders become path segments (joined with `" / "`); only nodes with a `url`
become documents. Each document also gets a `keywords` array — hostname and
path segments pulled out of the URL, plus folder-name tokens — with anything
that already appears in the name filtered out, to avoid redundant tokens
diluting the index.

### Search Engine (`src/search/searchEngine.ts`, `src/search/ranking.ts`)

Built on Fuse.js with `useExtendedSearch: true`. Two things had to be solved
beyond "call Fuse and sort by score":

**Cross-field AND matching.** Fuse's extended-search syntax treats a
space-separated query as "every token must match" (AND), but that AND is
evaluated *per key*, not across keys. A naive setup with separate weighted
keys (`name`, `path`, `url`) would never match a query like `kub graf` against
a document where `kub` only appears in the folder path and `graf` only
appears in the name — Fuse checks whether `kub AND graf` both match within
`name`, then separately whether both match within `path`, and both checks
fail. The fix, documented in a comment at the top of `searchEngine.ts`, is to
index one combined `searchable` field per document (name repeated twice to
bias similarity scoring, plus keywords, path, and URL, all lowercased and
joined). Now `kub` and `graf` just both need to appear somewhere in that one
field, regardless of which original field they came from. This was verified
against the spec's exact examples — `kub graf` → "Grafana Production
Dashboard", `git kub` → "GitHub Kubernetes Repository", `graf prod` →
"Production Grafana Dashboard" — and against typo tolerance (`grafna` still
matches "Grafana Production Dashboard").

**Tiered ranking, not raw Fuse score.** Fuse's own score is a single fuzzy
similarity number; on its own it doesn't reliably put an exact name match
above a merely path-adjacent fuzzy match. `ranking.ts` layers a 5-tier
priority system on top, matching spec section 17: exact name match > name
prefix match > URL match > path match > fuzzy-only match. Each tier is worth
`1_000_000` points, fuzzy similarity contributes at most `1_000`, and the
usage boost (frequency + recency, described below) is capped at `120`. The
gap between tiers is large enough that nothing from a lower tier — no matter
how similar or how often opened — can outscore a document in a higher tier.
Similarity and usage only break ties *within* a tier.

Usage history (`computeUsageBoost`) combines a frequency term (`min(count,
50) * 2`, capped at 100) with a recency term (+20 if opened in the last day,
+10 within a week, +4 within a month, 0 beyond that), summed and capped at
120. This is what lets a frequently-opened "Production Grafana" climb above
other equally-fuzzy matches without ever displacing an exact-name match to
something else.

### Storage (`src/storage/index.ts`)

A thin wrapper around `chrome.storage.local` with four concerns, each under
its own key (`scauta:settings`, `scauta:usage`, `scauta:index-cache`,
`scauta:last-query`): settings, usage history, the cached document index, and
the last-typed query (restored on next open). No other module touches
`chrome.storage` directly.

### Popup UI (`src/popup/`, `src/components/`)

A fixed 600×420 React app rendered inside the extension's action popup.
`App.tsx` owns all state (documents, usage, settings, current query, selected
index, search vs. settings view) and wires together `SearchBar`,
`ResultsList` (which renders `ResultItem` + `Favicon`, or `EmptyState` when
there's nothing to show), `Footer`, and `SettingsPanel`. Keyboard handling
(`↑`/`↓`/`Enter`/`Esc`) is a single `keydown` listener on `window` in `App.tsx`
rather than being spread across child components.

Theming is CSS-variable based (`src/popup/index.css`): a light and a dark
palette, both built around a warm off-white/near-black background rather than
pure black, with a warm orange accent (`--color-accent`, `#e2632a` light /
`#ff7a45` dark) used for the selected-row left border, active breadcrumb
text, and interactive accents. `useTheme.ts` toggles a `.dark` class on
`<html>` based on the `theme` setting, tracking `prefers-color-scheme` live
when set to "system". URLs and folder breadcrumbs use a monospace stack
(`.font-data`) to visually distinguish data from titles.

## Why search runs in the popup, not the background worker

The background worker builds and owns the index, but the actual Fuse.js
search — the part that runs on every keystroke — executes inside the popup,
via the `SearchEngine` instance in `App.tsx`. The popup fetches the full
document set once per open (`scauta:get-documents`), builds a `SearchEngine`
from it, and then searches that in-memory index locally as the user types.

The alternative — sending `scauta:search` messages to the background worker
on every keystroke and waiting for a response — was rejected because:

- **Round-trip latency compounds directly into perceived typing lag.** Every
  keystroke would pay for a message serialize/deserialize plus an async
  `chrome.runtime.sendMessage` round trip, on top of the actual search. The
  spec's target is sub-50ms search over 10k bookmarks; adding IPC to that
  budget on every keystroke works against it for no benefit.
- **The service worker can be asleep.** MV3 workers are killed and restarted
  by Chrome between events. A chatty per-keystroke protocol means every
  search is at the mercy of a possible cold-start wake-up; fetching the
  document set once and searching locally means only the initial fetch pays
  that cost, if it's paid at all.
- **There's nothing to protect.** The document set is not sensitive
  server-side state — it's the user's own bookmarks, already visible to the
  popup's origin. There's no reason to keep the index behind a message
  boundary the way you would for, say, an authenticated API.

The background worker's job is narrower and more durable: stay the single
source of truth for *when* the index needs rebuilding (it's the only context
that can subscribe to `chrome.bookmarks.on*` events continuously) and persist
it so a freshly-opened popup — or a freshly-woken worker — can serve it
without recomputing anything. Search itself doesn't need that durability; it
just needs the current document set, which `scauta:get-documents` provides.

## Message protocol

Defined in `src/types/index.ts` as the `ScautaMessage` union, sent with
`chrome.runtime.sendMessage` and handled in `src/background/index.ts`'s
`onMessage` listener. All four message types are request/response (the
listener returns `true` and calls `sendResponse` asynchronously):

| Message | Sent by | Response | Purpose |
| --- | --- | --- | --- |
| `scauta:get-documents` | Popup, on mount | `{ documents }` | Fetch the current cached index, rebuilding first if none exists yet |
| `scauta:refresh-index` | Popup (not currently wired to any UI action) | `{ documents }` | Force a rebuild and return the fresh result |
| `scauta:record-open` | Popup | `{ ok: true }` | Bump a bookmark's usage count/recency without opening a tab |
| `scauta:open-bookmark` | Popup, on Enter/click | `{ ok: true }` | Record usage and open (or focus) the bookmark's tab |

`src/popup/scautaClient.ts` is the only place in the popup layer that calls
`chrome.runtime.sendMessage` — all four message types are wrapped as typed
functions (`getDocuments`, `refreshIndex`, `openBookmark`) so the rest of the
UI code never constructs a raw message.

## Extension points for other browsers

The spec calls for an architecture that can grow from Chrome-only to
Firefox/Edge/Brave via adapters (spec section 20) without the search, ranking,
or UI layers changing. The codebase already supports this because every
`chrome.*` call is confined to five modules, and nothing outside them
references the `chrome` global:

- `src/bookmarks/collector.ts` — the only caller of `chrome.bookmarks.getTree()`.
- `src/history/collector.ts` — the only caller of `chrome.history.search()`.
- `src/storage/index.ts` — the only caller of `chrome.storage.local`.
- `src/shortcuts/index.ts` — the only caller of `chrome.commands.getAll()`
  and the only place that opens `chrome://extensions/shortcuts`.
- `src/background/index.ts` — the only caller of `chrome.tabs.*`,
  `chrome.windows.*`, `chrome.runtime.onMessage`/`onInstalled`/`onStartup`,
  and the `chrome.bookmarks.on*` event listeners.

None of `src/search`, `src/components`, or `src/popup` (besides the
`scautaClient.ts` message wrapper and `Favicon.tsx`'s use of the
`chrome-extension://.../_favicon/` URL scheme, which is itself Chrome-specific)
touch a browser API directly. Porting to Firefox's WebExtensions API — which
exposes an equivalent but not identical `browser.bookmarks` /
`browser.storage` / `browser.commands` surface, typically via
`webextension-polyfill` — would mean:

1. Introducing a small interface for each of the four modules above (e.g. a
   `BookmarkProvider` with a `getTree()` method) with a Chrome implementation
   and a Firefox implementation.
2. Swapping the manifest build: Firefox needs a background *page or event
   page* rather than a persistent-across-restarts service worker model, and
   its own `browser_specific_settings` block.
3. Replacing the Chrome-only favicon URL scheme in `Favicon.tsx` with
   whatever the target browser supports (Firefox has no direct equivalent to
   `chrome-extension://.../_favicon/`; a same-origin `<link rel="icon">`
   fetch or a small favicon-fetching service would be needed).

Edge and Brave are both Chromium-based and implement the same
`chrome.*`-prefixed extension APIs Scauta already uses, so — modulo store
listing and manifest metadata — they should run unmodified once packaged;
they are "supported" in the sense that no code changes are anticipated, not
in the sense that anyone has verified it on those browsers.

None of this adapter layer exists yet. It's future work, listed in the
[README's Roadmap](../README.md#roadmap).
