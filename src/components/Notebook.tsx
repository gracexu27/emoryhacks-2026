import type { ArchiveRecord } from '../lib/typesense'

type Props = {
  pins: ArchiveRecord[]
  onUnpin: (record: ArchiveRecord) => void
}

export function Notebook({ pins, onUnpin }: Props) {
  return (
    <aside className="notebook">
      <h2>Notebook <span className="count">{pins.length}</span></h2>
      {pins.length === 0 ? (
        <p className="empty">Pin search results to keep them as evidence.</p>
      ) : (
        <ul>
          {pins.map((record) => (
            <li key={record.id}>
              <strong>{record.title}</strong>
              <span>{record.source_name}</span>
              <button type="button" className="link-button" onClick={() => onUnpin(record)}>Unpin</button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
