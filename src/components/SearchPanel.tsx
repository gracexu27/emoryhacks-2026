import { useEffect, useState, type FormEvent } from 'react'
import {
  multiSearchArchive,
  NEAR_ME_RADIUS_KM,
  searchIsConfigured,
  SOURCE_GROUPS,
  SOURCE_TYPE_LABELS,
  SOURCE_TYPES,
  type ArchiveHit,
  type ArchiveRecord,
  type GroupedResults,
  type LatLng,
  type SearchFilters,
  type ResultTab,
  type SourceType,
} from '../lib/typesense'
import { RecordDetail } from './RecordDetail'
import { dateFormat, ResultCard } from './ResultCard'

const TAB_TITLES: Record<ResultTab, string> = {
  all: 'All results',
  official: 'Town notices',
  people: 'Community posts',
  places: 'Web & places',
}
const TABS: ResultTab[] = ['all', ...SOURCE_GROUPS]
// Only offer chips for source types the archive actually uses.
const FILTER_TYPES = SOURCE_TYPES.filter((type) => type !== 'news')

type Props = {
  origin: LatLng | null // the player's current location, if the scene has one
  onSearch: () => void // a submitted search costs in-game time
  isPinned: (id: string) => boolean
  onTogglePin: (record: ArchiveRecord) => void
  selected: ArchiveHit | null // record open in the detail view (owned by App so map pins can open it)
  onSelect: (record: ArchiveHit | null) => void
  onUseAddress?: (record: ArchiveHit) => void
  onOpenListing?: (record: ArchiveHit) => void
  onShowOnMap: (hits: ArchiveHit[], nearMe: boolean) => void
}

export function SearchPanel({ origin, onSearch, isPinned, onTogglePin, selected, onSelect: setSelected, onUseAddress, onOpenListing, onShowOnMap }: Props) {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<SearchFilters>({ recentOnly: false, sourceTypes: [], nearMe: false })
  const [results, setResults] = useState<GroupedResults | null>(null)
  const [lastQuery, setLastQuery] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<ResultTab>('all')
  const [compareIds, setCompareIds] = useState<string[]>([])

  // Returns true if the search succeeded.
  async function runSearch(q: string, nextFilters: SearchFilters): Promise<boolean> {
    if (!q) return false
    setLoading(true)
    setError('')
    try {
      const next = await multiSearchArchive(q, nextFilters, origin)
      setResults(next)
      setTab('all')
      setCompareIds((ids) => ids.filter((id) => next.all.some((hit) => hit.id === id)))
      setSelected(null)
      setLastQuery(q)
      return true
    } catch (cause) {
      console.error('Archive search failed:', cause) // details for us; the player sees a friendly message
      setError(cause instanceof Error ? cause.message : 'Search failed')
      return false
    } finally {
      setLoading(false)
    }
  }

  // A search only costs in-game time if it actually returned results.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const q = query.trim()
    if (!q) return
    if (await runSearch(q, filters)) onSearch()
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

  function toggleCompare(record: ArchiveHit) {
    setCompareIds((ids) => ids.includes(record.id)
      ? ids.filter((id) => id !== record.id)
      : [...ids.slice(-1), record.id])
  }

  // When the player moves, refresh distances for the current results (free).
  useEffect(() => {
    runSearch(lastQuery, filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.[0], origin?.[1]])

  const configured = searchIsConfigured()
  const allHits = results?.all ?? []
  const locatedHits = allHits.filter((hit) => hit.location)
  const compared = compareIds.flatMap((id) => allHits.find((hit) => hit.id === id) ?? [])

  return (
    <section id="town-archive" className="search-panel">
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
        <div className="filter-switches">
          <label className="toggle">
            <input
              type="checkbox"
              role="switch"
              checked={filters.recentOnly}
              onChange={() => updateFilters({ ...filters, recentOnly: !filters.recentOnly })}
            />
            Recent only
          </label>
          <label className={`toggle${origin ? '' : ' is-disabled'}`}>
            <input
              type="checkbox"
              role="switch"
              checked={filters.nearMe}
              disabled={!origin}
              onChange={() => updateFilters({ ...filters, nearMe: !filters.nearMe })}
            />
            Near me <span className="hint">{NEAR_ME_RADIUS_KM * 1000} m</span>
          </label>
        </div>
        <div className="chips" role="group" aria-label="Only show these source types">
          <span className="chips-label">Sources</span>
          {FILTER_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={`chip${filters.sourceTypes.includes(type) ? ' is-active' : ''}`}
              aria-pressed={filters.sourceTypes.includes(type)}
              onClick={() => toggleType(type)}
            >
              {SOURCE_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {!configured && <p role="status" className="notice">Run the import script, then restart the dev server.</p>}
      {error && (
        <p role="alert" className="notice notice-error">
          The archive isn’t answering right now. The rain must be playing with the signal. Try again in a moment; that search didn’t cost you any time.
        </p>
      )}
      {!error && !results && configured && (
        <p className="notice">Search for anything Ping mentions: a place, a web address, a time. Each search takes 5 minutes of your evening.</p>
      )}
      {!error && !selected && results && allHits.length === 0 && (
        <p role="status" className="notice">
          Nothing in the archive matches “{lastQuery}”. Try fewer words{filters.recentOnly || filters.nearMe || filters.sourceTypes.length ? ', or turn off some filters' : ''}.
        </p>
      )}

      {selected && (
        <RecordDetail
          record={selected}
          pinned={isPinned(selected.id)}
          compared={compareIds.includes(selected.id)}
          onCompare={toggleCompare}
          onUseAddress={selected.domain && ['ferry-sponsored-passes', 'ferry-official-tickets'].includes(selected.id) ? onUseAddress : undefined}
          onOpenListing={selected.id === 'calla-listing' ? onOpenListing : undefined}
          onTogglePin={onTogglePin}
          onBack={() => setSelected(null)}
        />
      )}

      {!selected && locatedHits.length > 0 && (
        <div className="map-bar">
          <span>
            {locatedHits.length} {locatedHits.length === 1 ? 'result is' : 'results are'} somewhere in town
            {filters.nearMe ? ` (within ${NEAR_ME_RADIUS_KM * 1000} m of you)` : ''}.
          </span>
          <button type="button" className="secondary-button" onClick={() => onShowOnMap(locatedHits, filters.nearMe)}>
            Show on town map
          </button>
        </div>
      )}

      {!selected && results && allHits.length > 0 && (
        <div className="results">
          {/* One multi-search request returns a mixed ranking plus optional source views. */}
          <div className="result-tabs" role="tablist" aria-label="Kinds of sources">
            {TABS.map((group) => (
              <button
                key={group}
                type="button"
                role="tab"
                id={`tab-${group}`}
                aria-selected={tab === group}
                aria-controls="result-tabpanel"
                className={`result-tab${tab === group ? ' is-active' : ''}`}
                onClick={() => setTab(group)}
              >
                {TAB_TITLES[group]} <span className="count">{results[group].length}</span>
              </button>
            ))}
          </div>
          <p className="results-note">Compare publishers, addresses, and dates before you decide.</p>
          {compareIds.length > 0 && (
            <section className="compare-panel" aria-label="Compare sources">
              <div className="compare-heading"><h2>Compare sources</h2><button type="button" className="link-button" onClick={() => setCompareIds([])}>Clear</button></div>
              <div className="compare-grid">
                {compared.map((record) => (
                  <div key={record.id} className="compare-record">
                    <strong>{record.title}</strong>
                    <span>{record.source_name} · {SOURCE_TYPE_LABELS[record.source_type]}</span>
                    {record.domain && <code>{record.domain}</code>}
                    <span>{dateFormat.format(new Date(record.date * 1000))}{record.is_sponsored ? ' · Featured' : ''}</span>
                  </div>
                ))}
                {compared.length === 1 && <div className="compare-empty">Choose one more result to compare.</div>}
              </div>
            </section>
          )}
          <div id="result-tabpanel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="result-list">
            {results[tab].length === 0 ? (
              <p className="empty">Nothing from {TAB_TITLES[tab].toLowerCase()} for “{lastQuery}”.</p>
            ) : (
              results[tab].map((record) => (
                <ResultCard
                  key={record.id}
                  record={record}
                  pinned={isPinned(record.id)}
                  compared={compareIds.includes(record.id)}
                  onTogglePin={onTogglePin}
                  onCompare={toggleCompare}
                  onOpen={setSelected}
                />
              ))
            )}
          </div>
        </div>
      )}
    </section>
  )
}
