import type { GetDocumentsResponse, ScautaMessage } from '@/types'

function send<T>(message: ScautaMessage): Promise<T> {
  return chrome.runtime.sendMessage(message)
}

export function getDocuments(): Promise<GetDocumentsResponse> {
  return send<GetDocumentsResponse>({ type: 'scauta:get-documents' })
}

export function refreshIndex(): Promise<GetDocumentsResponse> {
  return send<GetDocumentsResponse>({ type: 'scauta:refresh-index' })
}

export function openBookmark(
  bookmarkId: string,
  url: string,
  newTab = false,
  reuseExistingTab = false,
): Promise<{ ok: true }> {
  return send<{ ok: true }>({ type: 'scauta:open-bookmark', bookmarkId, url, newTab, reuseExistingTab })
}

export function faviconUrl(pageUrl: string, size = 32): string {
  const params = new URLSearchParams()
  params.set('pageUrl', pageUrl)
  params.set('size', String(size))
  return `chrome-extension://${chrome.runtime.id}/_favicon/?${params.toString()}`
}
