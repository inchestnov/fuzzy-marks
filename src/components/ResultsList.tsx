import type { SearchResult } from '@/types'
import { ResultItem } from './ResultItem'
import { EmptyState } from './EmptyState'

interface ResultsListProps {
  results: SearchResult[]
  selectedIndex: number
  hasQuery: boolean
  hasBookmarks: boolean
  onSelect: (index: number) => void
  onOpen: (index: number) => void
}

export function ResultsList({
  results,
  selectedIndex,
  hasQuery,
  hasBookmarks,
  onSelect,
  onOpen,
}: ResultsListProps) {
  if (results.length === 0) {
    return <EmptyState hasQuery={hasQuery} hasBookmarks={hasBookmarks} />
  }

  return (
    <div className="flex-1 overflow-y-auto py-1">
      {results.map((result, index) => (
        <ResultItem
          key={result.document.id}
          document={result.document}
          selected={index === selectedIndex}
          onSelect={() => onSelect(index)}
          onOpen={() => onOpen(index)}
        />
      ))}
    </div>
  )
}
