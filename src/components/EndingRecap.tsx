import { debriefResults, formatClock, isPinned, type Ending, type GameState, type Story } from '../game/engine'
import type { ArchiveRecord } from '../lib/typesense'
import { dateFormat } from './ResultCard'

type Props = {
  ending: Ending
  state: GameState
  story: Story
  records: Map<string, ArchiveRecord>
  onRestart: () => void
}

// End of the run: the ending, then each claim Ping made, what the player did, and the records that settle it.
export function EndingRecap({ ending, state, story, records, onRestart }: Props) {
  const results = debriefResults(story, state.flags)
  const safeCount = results.filter((r) => r.outcome?.safe).length

  return (
    <section className="ending">
      <p className="eyebrow">The night ends · {formatClock(state.minutes)}</p>
      <h2>{ending.title}</h2>
      <p>{ending.text}</p>

      {results.length > 0 && (
        <>
          <h3 className="debrief-heading">
            What Ping told you <span className="recap-meta">· {safeCount} of {results.length} handled safely</span>
          </h3>
          <ol className="debrief">
            {results.map(({ beat, outcome }) => (
              <li key={beat.id} className={`debrief-beat ${outcome ? (outcome.safe ? 'is-safe' : 'is-risky') : 'is-unreached'}`}>
                <div className="debrief-title">
                  <span className="debrief-mark" aria-hidden="true">{outcome ? (outcome.safe ? '✓' : '✗') : '–'}</span>
                  <strong>{beat.title}</strong>
                </div>
                <p className="debrief-claim">Ping: “{beat.claim}”</p>
                <p className="debrief-outcome">{outcome ? outcome.text : 'You didn’t reach this part of the night.'}</p>
                <ul className="debrief-evidence">
                  {beat.evidence.map((id) => {
                    const record = records.get(id)
                    if (!record) return null
                    return (
                      <li key={id}>
                        {record.title} <span>· {record.source_name} · {dateFormat.format(new Date(record.date * 1000))}</span>
                        {isPinned(state, id) && <span className="debrief-pinned"> · you pinned this</span>}
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
          </ol>
        </>
      )}

      <p className="recap-meta">{state.searches} searches · {state.pins.length} records pinned</p>
      <button type="button" className="primary-button" onClick={onRestart}>Play again</button>
    </section>
  )
}
