# Scauta

Instant fuzzy search over your browser bookmarks and history. Press a
shortcut, type a few letters, hit Enter, land on the page — a compact,
keyboard-first search dialog with its own quiet visual identity: a cool
neutral palette, a muted green accent, and a native-dialog feel rather than
a command-palette one.

## Features

- 🔍 **Fuzzy search across name, URL, and folder path.** A query like `kub graf`
  matches "Grafana Production Dashboard" filed under `Development / Kubernetes`
  even though neither word appears contiguously in the title — `kub` matches
  the folder path, `graf` matches the name, and both are required.
- 🔤 **Typo-tolerant.** `grafna` still finds "Grafana Production Dashboard".
- 🥇 **Tiered ranking**, not a single opaque similarity score: exact name match
  beats a name-prefix match, which beats a URL match, which beats a
  path/folder match, which beats a fuzzy-only match. Nothing from a lower tier
  can outrank a higher one, no matter how it scores on fuzzy similarity or
  usage.
- 📈 **Usage-aware.** Bookmarks you open often, or opened recently, are boosted
  within their tier — a frequently used bookmark won't jump ahead of an exact
  name match, but it will jump ahead of an equally-fuzzy competitor.
- 🗂️ **Three search sources, each toggleable on its own** — bookmarks,
  browsing history, and currently open tabs. A small row of round checkboxes
  right under the search box (Bookmarks / History / Tabs) turns each one on
  or off for the current search, so a page you visited but never bookmarked,
  or a tab you already have open somewhere, is just as reachable as an actual
  bookmark. Every result explicitly says where it came from — "Bookmark" with
  its folder path, "History" with a relative time like "2 minutes ago", or
  "Open tab" — so you always know at a glance.
- ⌨️ **Keyboard-only.** Open with a global shortcut, type, move with `↑`/`↓`,
  open with `Enter` (or `Ctrl+Enter`/`Cmd+Enter` for a new tab instead of
  reusing an open one), dismiss with `Esc`. `Tab` cycles focus through the
  Bookmarks/History/Tabs checkboxes so you can flip a source on or off
  (`Enter` toggles whichever one is focused) without ever reaching for the
  mouse.
- 🔄 **Live index.** The background service worker rebuilds the bookmark index
  whenever bookmarks are added, removed, edited, or moved, and the history
  index whenever you visit or delete a page. Open tabs are read live on every
  search instead of cached, since the set of open tabs changes far too often
  to bother indexing — no manual refresh, and no need to reopen the popup for
  a just-visited page or a freshly opened tab to become searchable.
- 🌓 **Light and dark themes**, plus a "system" mode that follows the OS.
- 🔒 **No external storage.** No server, no account, no sync service. The only
  persisted state is local: your settings, usage history, and a cached copy
  of the index, all in `chrome.storage.local`.

## Screenshots

| Light | Dark |
| --- | --- |
| ![Search, light theme](docs/screenshots/search-light.png) | ![Search, dark theme](docs/screenshots/search-dark.png) |

Query shown above is `kub graf`, matching across all three sources at
once: an already-open tab ("Grafana Kubernetes Overview"), a history entry
visited 15 minutes ago, and the bookmarked "Grafana Production Dashboard"
filed under `Bookmarks bar / Development / Kubernetes` — the exact bookmark
example from the product spec, now shown alongside the other two sources.

## Motivation

Bookmarks scale badly. A few hundred of them, organized into a few folders,
are easy to browse. A few thousand of them, organized into a deep and
inconsistent folder tree built up over years, are not. Chrome's own bookmark
manager is built for organizing, not for finding — it wants you to remember
which folder something lives in.

Scauta drops that requirement. It doesn't replace the browser's bookmark
system and it doesn't keep its own copy of your bookmarks anywhere — the
browser's bookmark tree stays the single source of truth. What Scauta adds is
a fast, typo-tolerant, keyboard-only way to get from "I'm thinking of that
Grafana dashboard" to the tab being open, in as few keystrokes as possible.

## Installation

Scauta isn't published to the Chrome Web Store yet. Load it as an unpacked
extension instead.

### Option A: prebuilt (recommended)

A GitHub Action rebuilds the extension on every push to `master` and
publishes the output to the [`dist`](../../tree/dist) branch, so you don't
need Node.js or a build step at all — just the built files:

```bash
git clone -b dist --single-branch git@github.com:inchestnov/scauta.git scauta-dist
```

Then in Chrome:

1. Go to `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select the `scauta-dist` directory you just cloned.

To pick up updates later, just `git pull` inside `scauta-dist` and click the
reload icon on Scauta's card in `chrome://extensions`.

### Option B: build from source

If you want to modify Scauta or don't trust a prebuilt branch, clone the
default branch and build it yourself:

```bash
git clone git@github.com:inchestnov/scauta.git
cd scauta
npm install
npm run build
```

Then load the resulting `dist/` directory the same way (steps 1-4 above).

After rebuilding, click the reload icon on Scauta's card in
`chrome://extensions` (or toggle it off/on). This matters especially when a
change adds a new permission (like `history` or `tabs`) — Chrome doesn't pick up
manifest or background-script changes for an already-loaded unpacked
extension until it's reloaded, so features tied to the new code (or
permission) will silently act as if they're missing until you do.

Scauta's icon appears in the toolbar either way. Pin it if you want it
visible, though you'll normally never click it — the keyboard shortcut is
the intended entry point.

## Usage

1. Press the shortcut (see [Keyboard shortcuts](#keyboard-shortcuts)).
2. Start typing. Results update as you type — no need to press Enter to
   search.
3. Use `↑`/`↓` to move the selection, or hover with the mouse.
4. Press `Enter` (or click) to open the selected result in its current tab —
   if it's already open somewhere, Scauta focuses that tab instead of opening
   a duplicate. Press `Ctrl+Enter` (or `Cmd+Enter` on macOS) to force it open
   in a brand new tab instead.
5. Press `Esc` at any point to close the popup without doing anything.

Right under the search box, three round checkboxes — **Bookmarks**,
**History**, **Tabs** — control which sources are searched. Press `Tab` to
move keyboard focus between them (the row lights up while it has focus) and
`Enter` to flip whichever one is focused; clicking works the same way.

The search box always starts empty when you open Scauta — nothing is
remembered between sessions, so there's nothing to clear before typing a new
query. When the search box is empty, results are ordered by usage
(most/recently opened first).

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl+E` (Windows/Linux) / `Cmd+E` (macOS) | Open Scauta |
| `↑` / `↓` | Move selection |
| `Enter` | Open selected result in its current tab |
| `Ctrl+Enter` / `Cmd+Enter` | Open selected result in a new tab |
| `Tab` | Move focus between the Bookmarks/History/Tabs checkboxes |
| `Enter` (checkbox focused) | Toggle the focused source on/off |
| `Esc` | Close the popup, or leave Settings |

The open shortcut is registered as Chrome's `commands._execute_action`, which
opens the extension's popup directly — no background listener is needed to
handle it, and it works even if the service worker is asleep.

Chrome does not let extensions reassign keyboard shortcuts programmatically.
If you want a different combination, or the default conflicts with something
else, open Settings inside Scauta (the gear icon next to the search box) and
use the **"Change in Chrome settings"** link, which takes you straight to
`chrome://extensions/shortcuts`. Settings also has a **Shortcuts** section
listing this same table for quick reference inside the popup.

## Configuration

### Search sources

Which sources are searched — **Bookmarks**, **History**, **Tabs** — is
controlled from the main screen itself, via the row of checkboxes right
under the search box (not from Settings), so it's a one-keystroke or
one-click change you never have to leave the search view for. See
[Usage](#usage) and [Keyboard shortcuts](#keyboard-shortcuts) above. History
and tab data never leave the browser — they're only read locally to build
the search index, the same way bookmarks are, and kept current as you
browse (history) or read live on every search (tabs).

### Settings

Open Settings from the gear icon next to the search box.

- **Shortcut** — read-only display of the currently bound shortcut, with a
  link out to `chrome://extensions/shortcuts` to change it.
- **Shortcuts** — a reference list of every keyboard shortcut (see
  [Keyboard shortcuts](#keyboard-shortcuts)); informational only, nothing
  here is configurable.
- **Track usage history** — toggles whether opening a result affects future
  ranking. Turning it off stops recording new opens; it does not erase what's
  already stored.
- **Max results** — how many results to show at once (3–20).
- **Clear usage history** — wipes all recorded frequency/recency data.
- **Theme** — System, Light, or Dark.

All settings — including which search sources are enabled — are stored in
`chrome.storage.local` and persist across browser restarts.

## Architecture

A background service worker that owns the authoritative bookmark and history
indexes, three source collectors that each normalize a different
`chrome.*` API into the same flat document shape (bookmarks from
`chrome.bookmarks.getTree()`, history from `chrome.history.search()`, open
tabs from `chrome.tabs.query()`), a Fuse.js-based search engine with a
tiered ranking layer, and a React popup UI that runs search entirely
client-side against a document set fetched once per popup open. Bookmarks
and history are rebuilt on change and cached; open tabs are read live on
every request instead, since the set of open tabs changes far too often to
be worth caching. `chrome.storage.local` is the only persistence layer, used
for settings, usage history, and the cached bookmark/history indexes.

See [`docs/architecture.md`](docs/architecture.md) for the full module graph,
the message-passing protocol between the popup and the background worker,
and where a browser-adapter boundary would go for Firefox/Edge/Brave support.

## Development

```bash
npm run dev         # Vite dev server with HMR — load the dist output as an
                     # unpacked extension once, then edits hot-reload
npm run build        # Production build to dist/
npm run typecheck    # tsc --noEmit
npm run test         # Run the vitest suite once
npm run test:watch   # Run vitest in watch mode
```

Project layout:

```
scauta/
├── extension/           # Static icons packaged into the extension
├── src/
│   ├── background/      # MV3 service worker: index lifecycle, message handling
│   ├── bookmarks/       # chrome.bookmarks.getTree() -> BookmarkDocument[]
│   ├── history/         # chrome.history.search() -> BookmarkDocument[], same shape as bookmarks
│   ├── tabs/            # chrome.tabs.query({}) -> BookmarkDocument[], read live (not cached)
│   ├── search/          # Fuse.js engine + ranking tiers
│   ├── storage/         # chrome.storage.local wrapper
│   ├── shortcuts/       # Reads the configured command, links to chrome://extensions/shortcuts
│   ├── components/      # React popup UI components
│   ├── popup/           # Popup entry point, client, theme hook, HTML/CSS
│   └── types/           # Shared types and the popup<->background message protocol
├── tests/
│   ├── unit/
│   ├── integration/
│   └── mocks/
├── docs/
├── manifest.config.ts    # MV3 manifest, built with @crxjs/vite-plugin
├── vite.config.ts
└── tailwind.config.js
```

Path alias `@/*` maps to `src/*` (configured in both `tsconfig.json` and
`vite.config.ts`).

## Testing

```bash
npm run test
```

54 tests across 7 files, all passing. Unit tests (`tests/unit/`) cover the
ranking tiers and usage-boost math (`ranking.test.ts`), the bookmark tree
flattening logic (`collector.test.ts`), and the search engine's
tokenization/limit/ordering behavior against the spec's own examples
(`searchEngine.test.ts`). Integration tests (`tests/integration/`) exercise
the bookmark-collection-to-search pipeline end-to-end
(`bookmarks-flow.test.ts`), browsing-history collection merged with
bookmarks into one id-collision-free searchable set
(`history-flow.test.ts`), open-tab collection merged with bookmarks and
history the same way, including id-collision safety
(`tabs-flow.test.ts`), and the background service worker's bookmark and
history index lifecycles (including rebuild-on-visit), message handling,
and tab focus-or-open logic
(`background.test.ts`), all against the in-memory `chrome.*` API mock in
`tests/mocks/chrome.ts` — no real browser required.

## Roadmap

- **Chrome** — supported today. This is the only browser Scauta currently
  runs on.
- **Firefox, Edge, Brave** — not implemented. The spec calls for an adapter
  layer so other Chromium-based browsers (Edge, Brave) and Firefox's
  WebExtensions API can be supported without touching search, ranking, or UI
  code. The current codebase already isolates every `chrome.*` call to
  `src/background`, `src/bookmarks`, `src/history`, `src/tabs`,
  `src/storage`, and `src/shortcuts`, which is where that adapter boundary
  would be introduced — see
  [`docs/architecture.md`](docs/architecture.md#extension-points-for-other-browsers).
- **Chrome Web Store listing** — not published yet; see
  [Installation](#installation) for the unpacked-extension workflow.

## License

[MIT](LICENSE)
