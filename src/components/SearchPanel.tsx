import { useEffect, useState, type FormEvent } from 'react'
import {
  multiSearchArchive,
  NEAR_ME_RADIUS_KM,
  searchIsConfigured,
  SOURCE_GROUPS,
  SOURCE_TYPES,
  type ArchiveRecord,
  type GroupedResults,
  type LatLng,
  type SearchFilters,
  type SourceGroup,
  type SourceType,
} from '../lib/typesense'
import { MapView } from './MapView'
import { ResultCard } from './ResultCard'

const COLUMN_TITLES: Record<SourceGroup, string> = {
  official: 'Official',
  people: 'What people say',
  places: 'Nearby places',
}

type Props = {
  origin: LatLng | null // the player's current location, if the scene has one
  onSearch: () => void // a submitted search costs in-game time
  isPinned: (id: string) => boolean
  onTogglePin: (record: ArchiveRecord) => void
}

export function SearchPanel({ origin, onSearch, isPinned, onTogglePin }: Props) {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<SearchFilters>({ recentOnly: false, sourceTypes: [], nearMe: false })
  const [results, setResults] = useState<GroupedResults | null>(null)
  const [lastQuery, setLastQuery] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function runSearch(q: string, nextFilters: SearchFilters) {
    if (!q) return
    setLoading(true)
    setError('')
    try {
      setResults(await multiSearchArchive(q, nextFilters, origin))
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
    const q = query.trim()
    if (!q) return
    onSearch()
    runSearch(q, filters)
  }

  // Changing a filter re-runs the last search (free) so the effect is visible immediately.
  function updateFilters(next: SearchFilters) {
    setFilters(next)
    runSearch(lastQuery, next)
  }

  function toggleType(type: SourceType) {
    const sourceTypes = filters.sourceTypes.includes(type)
      ? filters.sourceTypes.filter((t) => t !== type)
      : [...filters.sourceTypes, type]
    updateFilters({ ...filters, sourceTypes })
  }

  // When the player moves, refresh distances for the current results (free).
  useEffect(() => {
    runSearch(lastQuery, filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.[0], origin?.[1]])

  const configured = searchIsConfigured()
  const allHits = results ? SOURCE_GROUPS.flatMap((group) => results[group]) : []
  const showMap = Boolean(origin) && allHits.some((hit) => hit.location)

  return (
    <section className="search-panel">
      <form onSubmit={handleSubmit} className="search-form">
        <label htmlFor="archive-query">Search the city archive</label>
        <div className="search-row">
          <input
            id="archive-query"
            value={query}
            placeholder="ferry, dinner, wifi…"
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit" disabled={loading || !configured}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </form>

      <div className="filters">
        <label className="toggle">
          <input
            type="checkbox"
            checked={filters.recentOnly}
            onChange={() => updateFilters({ ...filters, recentOnly: !filters.recentOnly })}
          />
          Recent only
        </label>
        <label className={`toggle${origin ? '' : ' is-disabled'}`}>
          <input
            type="checkbox"
            checked={filters.nearMe}
            disabled={!origin}
            onChange={() => updateFilters({ ...filters, nearMe: !filters.nearMe })}
          />
          Near me <span className="hint">({NEAR_ME_RADIUS_KM * 1000} m)</span>
        </label>
        <div className="chips" role="group" aria-label="Source type">
          {SOURCE_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={`chip${filters.sourceTypes.includes(type) ? ' is-active' : ''}`}
              aria-pressed={filters.sourceTypes.includes(type)}
              onClick={() => toggleType(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {!configured && <p role="status" className="notice">Run the import script, then restart the dev server.</p>}
      {error && <p role="alert" className="notice notice-error">Search failed: {error}</p>}

      {showMap && <MapView hits={allHits} origin={origin} nearMe={filters.nearMe} />}

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
                results[group].map((record) => (
                  <ResultCard key={record.id} record={record} pinned={isPinned(record.id)} onTogglePin={onTogglePin} />
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
