import { formatDistance, SOURCE_TYPE_LABELS, type ArchiveHit, type ArchiveRecord } from '../lib/typesense'

export const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

// Pins store the record itself, not a distance that was only true at search time.
export function stripDistance({ distance_m: _distance, ...record }: ArchiveHit): ArchiveRecord {
  return record
}

export function RecordBadges({ record }: { record: ArchiveHit }) {
  return (
    <div className="badges">
      {record.is_sponsored && <span className="badge badge-featured">Featured</span>}
      <span className="badge badge-type">{SOURCE_TYPE_LABELS[record.source_type]}</span>
      <span className="badge badge-date">{dateFormat.format(new Date(record.date * 1000))}</span>
      {record.distance_m !== undefined && <span className="badge badge-distance">{formatDistance(record.distance_m)}</span>}
    </div>
  )
}

type Props = {
  record: ArchiveHit
  pinned: boolean
  compared: boolean
  onTogglePin: (record: ArchiveRecord) => void
  onCompare: (record: ArchiveHit) => void
  onOpen: (record: ArchiveHit) => void
}

export function ResultCard({ record, pinned, compared, onTogglePin, onCompare, onOpen }: Props) {
  return (
    <article className={`result-card${record.is_sponsored ? ' is-sponsored' : ''}${pinned ? ' is-pinned' : ''}`}>
      <RecordBadges record={record} />
      {record.image_url && <img className="result-image" src={record.image_url} alt="" loading="lazy" />}
      <h3>
        <button type="button" className="result-title" onClick={() => onOpen(record)}>{record.title}</button>
      </h3>
      <p>{record.excerpt}</p>
      {record.domain && <p className="result-domain"><span>Web address</span> <code>{record.domain}</code></p>}
      <footer>
        <span>{record.source_name}</span>
        <div className="result-actions">
          <button type="button" className="compare-button" aria-pressed={compared} onClick={() => onCompare(record)}>{compared ? 'Comparing' : 'Compare'}</button>
          <button type="button" className="pin-button" aria-pressed={pinned} onClick={() => onTogglePin(stripDistance(record))}>
            {pinned ? 'Pinned' : 'Pin'}
          </button>
        </div>
      </footer>
    </article>
  )
}
