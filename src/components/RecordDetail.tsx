import { useState } from 'react'
import { formatDistance, type ArchiveHit, type ArchiveRecord } from '../lib/typesense'
import { dateFormat, RecordBadges, stripDistance } from './ResultCard'

type Props = {
  record: ArchiveHit
  pinned: boolean
  onTogglePin: (record: ArchiveRecord) => void
  onBack: () => void
}

// Full view of one archive record. Hidden page text (prompt injection) is only reachable from here.
export function RecordDetail({ record, pinned, onTogglePin, onBack }: Props) {
  const [showSource, setShowSource] = useState(false)

  return (
    <article className={`record-detail${record.is_sponsored ? ' is-sponsored' : ''}`}>
      <button type="button" className="link-button record-back" onClick={onBack}>← Back to results</button>
      <RecordBadges record={record} />
      <h2>{record.title}</h2>
      {record.image_url && <img className="result-image" src={record.image_url} alt="" />}
      <p className="record-body">{record.excerpt}</p>

      <dl className="record-facts">
        <dt>Source</dt><dd>{record.source_name}</dd>
        <dt>Published</dt><dd>{dateFormat.format(new Date(record.date * 1000))}</dd>
        {record.domain && <><dt>Web address</dt><dd>{record.domain}</dd></>}
        {record.domain_registered && <><dt>Domain registered</dt><dd>{dateFormat.format(new Date(record.domain_registered * 1000))}</dd></>}
        {record.network_name && <><dt>Wi-Fi network</dt><dd>{record.network_name}</dd></>}
        {record.distance_m !== undefined && <><dt>Distance</dt><dd>{formatDistance(record.distance_m)} from you</dd></>}      </dl>

      {record.hidden_text && (
        <div className="source-detail">
          <button type="button" className="secondary-button" aria-expanded={showSource} onClick={() => setShowSource(!showSource)}>
            {showSource ? 'Hide page source' : 'View page source'}
          </button>
          {showSource && <pre>{record.hidden_text}</pre>}
        </div>
      )}

      <div className="record-actions">
        <button type="button" className="pin-button" aria-pressed={pinned} onClick={() => onTogglePin(stripDistance(record))}>
          {pinned ? 'Pinned to notebook' : 'Pin to notebook'}
        </button>
      </div>
    </article>
  )
}
