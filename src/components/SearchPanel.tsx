import { useState, type FormEvent } from 'react'
import {
  multiSearchArchive,
  searchIsConfigured,
  SOURCE_GROUPS,
  SOURCE_TYPES,
  type GroupedResults,
  type SourceGroup,
  type SourceType,
} from '../lib/typesense'
import { ResultCard } from './ResultCard'

const COLUMN_TITLES: Record<SourceGroup, string> = {
  official: 'Official',
  people: 'What people say',
  places: 'Nearby places',
}

export function SearchPanel() {
  const [query, setQuery] = useState('')
  const [recentOnly, setRecentOnly] = useState(false)
  const [sourceTypes, setSourceTypes] = useState<SourceType[]>([])
  const [results, setResults] = useState<GroupedResults | null>(null)
  const [lastQuery, setLastQuery] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function runSearch(q: string, filters: { recentOnly: boolean; sourceTypes: SourceType[] }) {
    if (!q) return
    setLoading(true)
    setError('')
    try {
      setResults(await multiSearchArchive(q, filters))
      setLastQuery(q)
    } catch (cause) {
      setResults(null)
      setError(cause instanceof Error ? cause.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    runSearch(query.trim(), { recentOnly, sourceTypes })
  }

  // Changing a filter re-runs the last search so the effect is visible immediately.
  function toggleRecent() {
    const next = !recentOnly
    setRecentOnly(next)
    runSearch(lastQuery, { recentOnly: next, sourceTypes })
  }

  function toggleType(type: SourceType) {
    const next = sourceTypes.includes(type) ? sourceTypes.filter((t) => t !== type) : [...sourceTypes, type]
    setSourceTypes(next)
    runSearch(lastQuery, { recentOnly, sourceTypes: next })
  }

  const configured = searchIsConfigured()

  return (
    <section className="search-panel">
      <form onSubmit={handleSubmit} className="search-form">
        <label htmlFor="archive-query">Search the city archive</label>
        <div className="search-row">
          <input
            id="archive-query"
            value={query}
            placeholder="ferry, dinner, quartet…"
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit" disabled={loading || !configured}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </form>

      <div className="filters">
        <label className="toggle">
          <input type="checkbox" checked={recentOnly} onChange={toggleRecent} />
          Recent only
        </label>
        <div className="chips" role="group" aria-label="Source type">
          {SOURCE_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={`chip${sourceTypes.includes(type) ? ' is-active' : ''}`}
              aria-pressed={sourceTypes.includes(type)}
              onClick={() => toggleType(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {!configured && <p role="status" className="notice">Run the import script, then restart the dev server.</p>}
      {error && <p role="alert" className="notice notice-error">Search failed: {error}</p>}

      {results && (
        <div className="columns">
          {SOURCE_GROUPS.map((group) => (
            <div key={group} className="column">
              <h2>
                {COLUMN_TITLES[group]} <span className="count">{results[group].length}</span>
              </h2>
              {results[group].length === 0 ? (
                <p className="empty">Nothing here for “{lastQuery}”.</p>
              ) : (
                results[group].map((record) => <ResultCard key={record.id} record={record} />)
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
