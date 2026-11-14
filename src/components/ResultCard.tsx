import { formatDistance, RECENT_CUTOFF, type ArchiveHit, type ArchiveRecord } from '../lib/typesense'

export const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

// Pins store the record itself, not a distance that was only true at search time.
export function stripDistance({ distance_m: _distance, ...record }: ArchiveHit): ArchiveRecord {
  return record
}

export function RecordBadges({ record }: { record: ArchiveHit }) {
  const isOld = record.date < RECENT_CUTOFF
  return (
    <div className="badges">
      {record.is_sponsored && <span className="badge badge-featured">Featured</span>}
      <span className={`badge badge-type badge-${record.source_type}`}>{record.source_type.replace('_', ' ')}</span>
      <span className={`badge badge-date${isOld ? ' is-old' : ''}`}>{dateFormat.format(new Date(record.date * 1000))}</span>
      {record.distance_m !== undefined && <span className="badge badge-distance">{formatDistance(record.distance_m)}</span>}
    </div>
  )
}

type Props = {
  record: ArchiveHit
  pinned: boolean
  onTogglePin: (record: ArchiveRecord) => void
  onOpen: (record: ArchiveHit) => void
}

export function ResultCard({ record, pinned, onTogglePin, onOpen }: Props) {
  return (
    <article className={`result-card${record.is_sponsored ? ' is-sponsored' : ''}${pinned ? ' is-pinned' : ''}`}>
      <RecordBadges record={record} />
      {record.image_url && <img className="result-image" src={record.image_url} alt="" loading="lazy" />}
      <h3>
        <button type="button" className="result-title" onClick={() => onOpen(record)}>{record.title}</button>
      </h3>
      <p>{record.excerpt}</p>
      <footer>
        <span>{record.source_name}</span>
        <button type="button" className="pin-button" aria-pressed={pinned} onClick={() => onTogglePin(stripDistance(record))}>
          {pinned ? 'Pinned' : 'Pin'}
        </button>
      </footer>
    </article>
  )
}
