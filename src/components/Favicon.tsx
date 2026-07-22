import { useState } from 'react'
import { faviconUrl } from '@/popup/scautaClient'

export function Favicon({ url }: { url: string }) {
  const [broken, setBroken] = useState(false)

  if (broken) {
    return (
      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-[var(--color-surface)] text-[9px] text-[var(--color-text-muted)]">
        ●
      </div>
    )
  }

  return (
    <img
      src={faviconUrl(url, 32)}
      alt=""
      className="h-4 w-4 shrink-0 rounded-sm"
      onError={() => setBroken(true)}
    />
  )
}
