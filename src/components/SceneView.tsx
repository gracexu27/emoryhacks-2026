import type { Choice, Scene } from '../game/engine'

type Props = {
  scene: Scene
  choices: Choice[]
  lockedCount?: number // choices hidden until the player pins the right evidence
  onChoose: (choice: Choice) => void
}

// Narration (the world) and Ping (a character) are visually separate, so the player never
// mistakes the narrator's facts for Ping's advice.
export function SceneView({ scene, choices, lockedCount = 0, onChoose }: Props) {
  return (
    <section className="scene">
      {scene.text && <p className="scene-text">{scene.text}</p>}

      {scene.guide && (
        <div className="ping-says">
          <span className="ping-face" aria-hidden="true"><span /><span /></span>
          <p className="guide-line">
            <span className="guide-name">Ping</span>
            {scene.guide}
          </p>
        </div>
      )}

      <div className="choices" role="group" aria-label="What do you do?">
        {choices.map((choice) => (
          <button key={choice.label} type="button" className="choice" onClick={() => onChoose(choice)}>
            <span className="choice-arrow" aria-hidden="true">▶</span>
            <span className="choice-label">{choice.label}</span>
            <span className="choice-cost">{choice.timeCost > 0 ? `+${choice.timeCost} min` : 'now'}</span>
          </button>
        ))}
        {lockedCount > 0 && (
          <div className="choice choice-locked" role="note">
            <svg className="choice-lock" width="14" height="16" viewBox="0 0 14 16" aria-hidden="true">
              <rect x="1" y="7" width="12" height="8" fill="currentColor" />
              <path d="M4 7V4a3 3 0 0 1 6 0v3" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span className="choice-label">
              {lockedCount === 1 ? 'Another option might open up.' : `${lockedCount} other options might open up.`}
              {' '}Search the archive and pin what you find.
            </span>
          </div>
        )}
      </div>
    </section>
  )
}
