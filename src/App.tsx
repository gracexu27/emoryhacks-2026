import { useState, type FormEvent } from 'react'
import { searchArchive, searchIsConfigured, type ArchiveHit } from './lib/typesense'

function App() {
  const [query, setQuery] = useState('ferry')
  const [results, setResults] = useState<ArchiveHit[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError('')
    try {
      setResults(await searchArchive(query.trim()))
    } catch (cause) {
      setResults([])
      setError(cause instanceof Error ? cause.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="shell">
      <p className="eyebrow">TODO-CONTENT · Larkhaven</p>
      <h1>The city is waiting.</h1>
      <p>This is a temporary search check. Story scenes and artwork come later.</p>
      <form onSubmit={handleSearch} className="search-form">
        <label htmlFor="archive-query">Search the placeholder city archive</label>
        <div className="search-row">
          <input id="archive-query" value={query} onChange={(event) => setQuery(event.target.value)} />
          <button type="submit" disabled={loading || !searchIsConfigured()}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </form>
      {!searchIsConfigured() && <p role="status">Run the import script, then restart this page.</p>}
      {error && <p role="alert">{error}</p>}
      {results.length > 0 && (
        <ul className="results">
          {results.map((result) => (
            <li key={result.id}>
              <strong>{result.title}</strong>
              <span>{result.source_name} · {result.source_type}</span>
              <p>{result.excerpt}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default App
