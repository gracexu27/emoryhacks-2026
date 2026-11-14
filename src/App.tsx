import { useReducer } from 'react'
import storyData from '../content/scenes.json'
import {
  availableChoices,
  gameReducer,
  getScene,
  initialState,
  isPinned,
  validateStory,
  type Story,
} from './game/engine'
import { Clock } from './components/Clock'
import { EndingRecap } from './components/EndingRecap'
import { Notebook } from './components/Notebook'
import { SceneView } from './components/SceneView'
import { SearchPanel } from './components/SearchPanel'

const story = storyData as Story
const reducer = gameReducer(story)

if (import.meta.env.DEV) {
  const problems = validateStory(story)
  if (problems.length) console.warn('scenes.json problems:\n' + problems.join('\n'))
}

function App() {
  const [state, dispatch] = useReducer(reducer, story, initialState)

  if (state.endingId) {
    const ending = story.endings.find((e) => e.id === state.endingId)!
    return (
      <main className="shell">
        <EndingRecap ending={ending} state={state} onRestart={() => dispatch({ type: 'restart' })} />
      </main>
    )
  }

  const scene = getScene(story, state.sceneId)

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Lantern Bay</p>
          <h1>A Guide to Getting Lost</h1>
        </div>
        <Clock minutes={state.minutes} />
      </header>

      <SceneView
        scene={scene}
        choices={availableChoices(state, scene)}
        onChoose={(choice) => dispatch({ type: 'choose', choice })}
      />

      <div className="workspace">
        <SearchPanel
          origin={state.location}
          onSearch={() => dispatch({ type: 'search' })}
          isPinned={(id) => isPinned(state, id)}
          onTogglePin={(record) => dispatch({ type: 'togglePin', record })}
        />
        <Notebook pins={state.pins} onUnpin={(record) => dispatch({ type: 'togglePin', record })} />
      </div>
    </main>
  )
}

export default App
