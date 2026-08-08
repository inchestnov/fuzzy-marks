import { describe, expect, it } from 'vitest'
import { matchRanges } from '@/search/highlight'

describe('matchRanges', () => {
  it('finds each token in order and returns its start/end offsets', () => {
    const ranges = matchRanges('Gibson Service Prod', ['g', 'se', 'pr'])
    expect(ranges).toEqual([
      { start: 0, end: 1 }, // "g" in "Gibson"
      { start: 7, end: 9 }, // "se" in "Service"
      { start: 15, end: 17 }, // "pr" in "Prod"
    ])
  })

  it('is case-insensitive', () => {
    expect(matchRanges('GRAFANA', ['graf'])).toEqual([{ start: 0, end: 4 }])
  })

  it('skips a token absent from this field without breaking later tokens', () => {
    // "kub" isn't in this text at all, but "graf" still gets found.
    const ranges = matchRanges('Grafana Production Dashboard', ['kub', 'graf'])
    expect(ranges).toEqual([{ start: 0, end: 4 }])
  })

  it('does not match the same span twice or go backwards', () => {
    // Only one "se" exists, so the second occurrence of the token must not
    // reuse the same span.
    const ranges = matchRanges('service', ['se', 'se'])
    expect(ranges).toEqual([{ start: 0, end: 2 }])
  })

  it('returns an empty array for an empty token list', () => {
    expect(matchRanges('anything', [])).toEqual([])
  })
})
