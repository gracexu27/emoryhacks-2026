import type { Choice, Scene } from '../game/engine'

type Props = {
  scene: Scene
  choices: Choice[]
  onChoose: (choice: Choice) => void
}

// Narration (the world) and Ping (a character) are visually separate, so the player never
// mistakes the narrator's facts for Ping's advice.
export function SceneView({ scene, choices, onChoose }: Props) {
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
      </div>
    </section>
  )
}
