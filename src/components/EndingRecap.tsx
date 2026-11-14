import { formatClock, type Ending, type GameState } from '../game/engine'

type Props = {
  ending: Ending
  state: GameState
  onRestart: () => void
}

// Basic recap for the walking skeleton. The full security debrief comes in Milestone 5.
export function EndingRecap({ ending, state, onRestart }: Props) {
  return (
    <section className="ending">
      <p className="eyebrow">The night ends · {formatClock(state.minutes)}</p>
      <h2>{ending.title}</h2>
      <p>{ending.text}</p>
      <h3>Evidence you pinned</h3>
      {state.pins.length === 0 ? (
        <p className="empty">You didn't pin anything.</p>
      ) : (
        <ul className="recap-list">
          {state.pins.map((record) => (
            <li key={record.id}>{record.title} <span>· {record.source_name}</span></li>
          ))}
        </ul>
      )}
      <p className="recap-meta">{state.searches} searches</p>
      <button type="button" className="primary-button" onClick={onRestart}>Play again</button>
    </section>
  )
}
