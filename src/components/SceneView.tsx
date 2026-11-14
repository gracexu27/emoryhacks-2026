import type { Choice, Scene } from '../game/engine'

type Props = {
  scene: Scene
  choices: Choice[]
  onChoose: (choice: Choice) => void
}

export function SceneView({ scene, choices, onChoose }: Props) {
  return (
    <section className="scene">
      <p className="scene-text">{scene.text}</p>
      {scene.guide && (
        <p className="guide-line">
          <span className="guide-name">Ping</span> {scene.guide}
        </p>
      )}
      <div className="choices">
        {choices.map((choice) => (
          <button key={choice.label} type="button" className="choice" onClick={() => onChoose(choice)}>
            {choice.label}
            {choice.timeCost > 0 && <span className="choice-cost">+{choice.timeCost} min</span>}
          </button>
        ))}
      </div>
    </section>
  )
}
