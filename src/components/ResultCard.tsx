import { formatDistance, RECENT_CUTOFF, SOURCE_TYPE_LABELS, type ArchiveHit, type ArchiveRecord } from '../lib/typesense'

export const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

// Pins store the record itself, not search-time extras (distance, highlight snippets).
export function stripDistance({ distance_m: _distance, snippets: _snippets, ...record }: ArchiveHit): ArchiveRecord {
  return record
}

// Renders a Typesense snippet with its <mark> tags as real <mark> elements.
// The text is split on the two tag strings and every piece is rendered as plain text,
// so nothing from a search result is ever injected as HTML.
export function Highlighted({ text }: { text: string }) {
  const parts = text.split(/(<mark>|<\/mark>)/)
  let marked = false
  return (
    <>
      {parts.map((part, index) => {
        if (part === '<mark>') { marked = true; return null }
        if (part === '</mark>') { marked = false; return null }
        return marked ? <mark key={index}>{part}</mark> : <span key={index}>{part}</span>
      })}
    </>
  )
}

const SOURCE_TAGS: Record<string, { label: string; title: string }> = {
  official: { label: 'TOWN', title: 'Town notice' },
  people: { label: 'POST', title: 'Community post' },
  places: { label: 'PLACE', title: 'Place listing' },
  web: { label: 'WEB', title: 'Web page' },
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
  const tag = SOURCE_TAGS[record.source_group] ?? SOURCE_TAGS.web
  const isOld = record.date < RECENT_CUTOFF
  return (
    <article className={`evidence-card evidence-${record.source_group}${record.is_sponsored ? ' is-sponsored' : ''}${pinned ? ' is-pinned' : ''}`}>
      <span className="evidence-tag" title={tag.title}>{tag.label}</span>
      <div className="evidence-body">
        {record.is_sponsored && <span className="badge badge-featured">Featured</span>}
        <h3>
          <button type="button" className="result-title" onClick={() => onOpen(record)}>
            <Highlighted text={record.snippets?.title ?? record.title} />
          </button>
        </h3>
        <p className="evidence-line"><Highlighted text={record.snippets?.excerpt ?? record.excerpt} /></p>
        {record.domain && <p className="result-domain"><span>Web address</span> <code>{record.domain}</code></p>}
        {record.image_url && <img className="result-image" src={record.image_url} alt="" loading="lazy" />}
        <footer className="evidence-meta">
          <span>
            {record.source_name}
            {' · '}
            <span className={isOld ? 'is-old' : undefined}>{shortDate.format(new Date(record.date * 1000))}</span>
            {record.distance_m !== undefined && <> · {formatDistance(record.distance_m)}</>}
          </span>
          <div className="result-actions">
            <button type="button" className="compare-button" aria-pressed={compared} onClick={() => onCompare(record)}>{compared ? 'Comparing' : 'Compare'}</button>
            <button type="button" className={`pin-button${pinned ? ' is-stamped' : ''}`} aria-pressed={pinned} onClick={() => onTogglePin(stripDistance(record))}>{pinned ? 'Pinned' : 'Pin'}</button>
          </div>
        </footer>
      </div>
    </article>
  )
}
