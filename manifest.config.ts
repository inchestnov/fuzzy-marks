import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: 'Scauta — Bookmark Search',
  description: 'Instant fuzzy search and keyboard navigation for your browser bookmarks.',
  version: pkg.version,
  icons: {
    16: 'extension/icons/icon16.png',
    48: 'extension/icons/icon48.png',
    128: 'extension/icons/icon128.png',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      16: 'extension/icons/icon16.png',
      48: 'extension/icons/icon48.png',
      128: 'extension/icons/icon128.png',
    },
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  permissions: ['bookmarks', 'storage', 'favicon', 'history'],
  commands: {
    _execute_action: {
      suggested_key: {
        default: 'Ctrl+Shift+E',
        mac: 'Command+Shift+E',
      },
      description: 'Open Scauta bookmark search',
    },
  },
})
