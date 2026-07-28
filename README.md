# Scauta

| Light | Dark |
| --- | --- |
| ![Search, light theme](docs/screenshots/search-light.png) | ![Search, dark theme](docs/screenshots/search-dark.png) |

Instant fuzzy search over your browser bookmarks and history. Press a
shortcut, type a few letters, hit Enter, land on the page — a compact,
keyboard-first search dialog with its own quiet visual identity: a cool
neutral palette, a muted green accent, and a native-dialog feel rather than
a command-palette one.

## Features

- 🔍 **Fuzzy search** across bookmark name, URL, and folder path.
- 🔤 **Typo-tolerant** — finds matches even with misspellings.
- 🥇 **Tiered ranking** — exact matches always outrank fuzzy ones.
- 📈 **Usage-aware** — frequently opened bookmarks rank higher.
- 🗂️ **Three search sources** — bookmarks, history, and open tabs.
- ⌨️ **Keyboard-only** — open, search, and act without a mouse.
- 🔄 **Live index** — always up to date, no manual refresh.
- 🌓 **Light, dark, and system themes.**
- 🔒 **Fully local** — no server, account, or sync service.

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

## License

[MIT](LICENSE)
