import { RECENT_CUTOFF, type ArchiveRecord } from '../lib/typesense'

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

export function ResultCard({ record }: { record: ArchiveRecord }) {
  const isOld = record.date < RECENT_CUTOFF
  return (
    <article className={`result-card${record.is_sponsored ? ' is-sponsored' : ''}`}>
      <div className="badges">
        {record.is_sponsored && <span className="badge badge-featured">Featured</span>}
        <span className={`badge badge-type badge-${record.source_type}`}>{record.source_type}</span>
        <span className={`badge badge-date${isOld ? ' is-old' : ''}`}>
          {dateFormat.format(new Date(record.date * 1000))}
        </span>
      </div>
      <h3>{record.title}</h3>
      <p>{record.excerpt}</p>
      <footer>{record.source_name}</footer>
    </article>
  )
}
