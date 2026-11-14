import { RECENT_CUTOFF, type ArchiveRecord } from '../lib/typesense'

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

type Props = {
  record: ArchiveRecord
  pinned: boolean
  onTogglePin: (record: ArchiveRecord) => void
}

export function ResultCard({ record, pinned, onTogglePin }: Props) {
  const isOld = record.date < RECENT_CUTOFF
  return (
    <article className={`result-card${record.is_sponsored ? ' is-sponsored' : ''}${pinned ? ' is-pinned' : ''}`}>
      <div className="badges">
        {record.is_sponsored && <span className="badge badge-featured">Featured</span>}
        <span className={`badge badge-type badge-${record.source_type}`}>{record.source_type}</span>
        <span className={`badge badge-date${isOld ? ' is-old' : ''}`}>
          {dateFormat.format(new Date(record.date * 1000))}
        </span>
      </div>
      <h3>{record.title}</h3>
      <p>{record.excerpt}</p>
      <footer>
        <span>{record.source_name}</span>
        <button type="button" className="pin-button" aria-pressed={pinned} onClick={() => onTogglePin(record)}>
          {pinned ? 'Pinned' : 'Pin'}
        </button>
      </footer>
    </article>
  )
}
