import type { SearchResult } from '@/types'
import { SearchResultItem } from './SearchResultItem'
import { EmptyState } from './EmptyState'

interface SearchResultsProps {
  results: SearchResult[]
  tokens: string[]
  selectedIndex: number
  hasQuery: boolean
  hasDocuments: boolean
  onSelect: (index: number) => void
  onOpen: (index: number) => void
}

export function SearchResults({
  results,
  tokens,
  selectedIndex,
  hasQuery,
  hasDocuments,
  onSelect,
  onOpen,
}: SearchResultsProps) {
  if (results.length === 0) {
    return <EmptyState hasQuery={hasQuery} hasDocuments={hasDocuments} />
  }

  return (
    <div className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
      {results.map((result, index) => (
        <SearchResultItem
          key={result.document.id}
          document={result.document}
          tokens={tokens}
          selected={index === selectedIndex}
          onSelect={() => onSelect(index)}
          onOpen={() => onOpen(index)}
        />
      ))}
    </div>
  )
}
