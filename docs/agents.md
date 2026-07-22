# AI Agent Workflow

The project's technical spec (section 21) requires that Scauta be built
through an AI sub-agent workflow rather than by a single agent implementing
everything serially: a lead agent acting as technical lead — analyzing
requirements, designing the architecture, decomposing the work, and
controlling quality — with sub-agents handling well-scoped pieces. This
document describes the workflow actually used, not the idealized version in
the spec.

## What the spec asked for vs. what happened

The spec (section 23) lists nine possible sub-agent roles: Architecture,
Project Setup, Extension Core, Bookmark Collector, Search Engine, UI,
Shortcut, Storage, Testing, Documentation. In practice, most of those modules
— types, bookmark collection, storage, search/ranking, the background
worker, and the popup UI — have tight sequential dependencies on each other
and on a small set of shared type definitions (`src/types/index.ts`, the
`ScautaMessage` protocol, the `BookmarkDocument` shape). Splitting them into
fully independent parallel agents would have meant either freezing the
shared types before any implementation started (risky, since the ranking
tiers and the Fuse.js cross-field-matching fix both surfaced requirements on
`BookmarkDocument` that weren't obvious up front) or paying a heavy
integration-and-rework cost after the fact.

The lead agent made the call to implement that interdependent core itself —
acting as the Architecture, Project Setup, Extension Core, Bookmark
Collector, Search Engine, Shortcut, Storage, and UI agents in sequence, with
each module's real interface (not just its spec description) informing the
next — and reserved actual sub-agent fan-out for the two pieces that were
genuinely independent once the core existed: **Testing** and
**Documentation**.

## Phase 1 — Lead agent: analysis, architecture, and core implementation

1. Read the full spec (`scauta.txt`) and extracted the hard constraints:
   Chrome MV3, React + TypeScript + Vite, Fuse.js, no external storage,
   keyboard-first UX in ≤3 actions, the specific fuzzy-search examples
   (`kub graf`, `git kub`, `graf prod`) that any implementation would have to
   satisfy literally, and the 5-tier ranking priority in section 17.
2. Designed the module graph in `docs/architecture.md`: background worker
   owns the index, bookmark collector flattens the tree, search engine runs
   client-side in the popup, storage is a single `chrome.storage.local`
   wrapper, with `chrome.*` calls confined to four modules so a future
   browser adapter has a clean seam.
3. Scaffolded the project (`package.json`, `vite.config.ts`,
   `manifest.config.ts`, `tailwind.config.js`, `tsconfig.json`) and then
   implemented, in dependency order:
   - `src/types/index.ts` — shared types and the `ScautaMessage` protocol,
     since every other module depends on these shapes.
   - `src/bookmarks/collector.ts` — tree flattening, kept as a pure function
     with no `chrome.*` calls so it stays unit-testable.
   - `src/storage/index.ts` — the `chrome.storage.local` wrapper.
   - `src/search/ranking.ts` and `src/search/searchEngine.ts` — the tiered
     ranking system and the Fuse.js integration, including the fix for
     cross-field AND matching (documented inline in `searchEngine.ts`) that
     was only discovered by actually testing the spec's `kub graf` example
     against a naive multi-key Fuse configuration and watching it fail.
   - `src/background/index.ts` — the service worker: index lifecycle,
     rebuild-on-bookmark-events, and the message handlers backing the
     protocol other modules rely on.
   - `src/shortcuts/index.ts` — reading the configured command via
     `chrome.commands.getAll()` and linking out to
     `chrome://extensions/shortcuts`, since Chrome does not expose an API for
     an extension to rebind its own shortcut.
   - `src/components/*.tsx` and `src/popup/*` — the React popup UI: search
     bar, results list, empty states, footer keyboard hints, and the
     settings panel, styled with the warm light/dark theme pair defined in
     `src/popup/index.css`.

## Phase 2 — Manual end-to-end verification

Before delegating anything further, the lead agent verified the built
extension in a real Chromium instance via Playwright rather than trusting
the unit-level pieces to compose correctly on paper:

- Ran `npm run build` and loaded the resulting `dist/` directory as an
  unpacked extension.
- Seeded real bookmarks through the extension's own service worker (so the
  index would be built from actual `chrome.bookmarks` data, not a mock) and
  confirmed `scauta:get-documents` returned them.
- Opened the popup and confirmed the spec's exact fuzzy-search examples work
  against real data: `kub graf` surfaces "Grafana Production Dashboard",
  `git kub` surfaces "GitHub Kubernetes Repository", `graf prod` surfaces
  "Production Grafana Dashboard", and a deliberately misspelled `grafna`
  still matches.
- Confirmed keyboard navigation (`↑`/`↓`/`Enter`/`Esc`), the settings panel,
  and both themes render correctly at the fixed 600×420 popup size.
- Captured the three screenshots now embedded in the README
  (`docs/screenshots/search-light.png`, `search-dark.png`, `settings.png`) as
  part of this same pass — they show the popup in its actual verified state,
  not a mockup.

This step is what section 24 of the spec calls "code review / integration /
run tests" for the core: it happened as manual, real-browser verification by
the same agent that wrote the core, because that agent had the fullest
context on what each module was supposed to do and how the pieces were meant
to fit together.

## Phase 3 — Parallel sub-agents

With the core implementation stable and manually verified, the remaining
spec-mandated work was genuinely independent of the core's internals — it
only needed the core's already-fixed public shapes (`BookmarkDocument`,
`ScautaSettings`, the module boundaries) as inputs, not knowledge of how they
were built. Two sub-agents ran in parallel from that point:

- **Testing Agent** — wrote the unit test suite under `tests/unit/`
  (`ranking.test.ts`, `collector.test.ts`, `searchEngine.test.ts`) against
  the finished `src/search` and `src/bookmarks` modules, plus integration
  tests under `tests/integration/` (`bookmarks-flow.test.ts`,
  `background.test.ts`) exercising the collector → search pipeline and the
  background worker's index lifecycle, message handling, and tab
  focus-or-open logic against the `chrome.*` mock it also authored in
  `tests/mocks/chrome.ts`. 45 tests, all passing. This agent did not need to
  understand *why* the ranking tiers or the Fuse.js field-combining fix were
  designed the way they were — only their observable input/output contract —
  though it did catch and fix a real recursion bug in its own mock's
  `onMessage.addListener` wrapper along the way.
- **Documentation Agent** — this agent. Wrote `README.md`,
  `docs/architecture.md`, and this file by reading the spec and the finished
  `src/` tree, without modifying any implementation code. Its job was to
  describe what was actually built and verified, not to re-derive or
  second-guess the design decisions made in Phase 1.

Running Documentation and Testing in parallel was safe specifically because
neither could destabilize the other or the core: tests exercise `src/`
without changing it, and documentation describes `src/` without touching it.

## Where this deviates from a fully generic multi-agent build

An idealized reading of spec section 23 would spin up nine parallel
sub-agents on day one — Architecture, Project Setup, Extension Core,
Bookmark Collector, Search Engine, UI, Shortcut, Storage, Testing,
Documentation — and integrate their output afterward. That was deliberately
not done here for the interdependent core, because:

- The ranking system's tier weights and the search engine's combined-field
  indexing approach were **discovered**, not specified — they came out of
  testing the spec's own examples against a first-draft implementation and
  finding it insufficient (a per-key Fuse configuration silently fails on
  `kub graf`). An agent building `src/search` in isolation from an agent
  building `src/bookmarks` would have had to guess at the `BookmarkDocument`
  shape needed to make that fix possible, or the fix would have surfaced only
  during integration, late and expensively.
- The background worker, storage layer, and popup UI all depend on the exact
  same `ScautaMessage` protocol; building them in parallel from independently
  guessed protocols would very likely have produced three incompatible
  guesses.

Fanning out Testing and Documentation only after the core was built and
manually verified end-to-end is the point in the process where parallelism
stopped being risky and started being free — which is the same judgment call
section 22 asks the lead agent to make ("контроль качества" / quality
control, deciding what to decompose and when) rather than a mechanical
instruction to always spawn every listed sub-agent up front.
