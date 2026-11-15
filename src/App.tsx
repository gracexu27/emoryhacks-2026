import { useEffect, useReducer, useState, type CSSProperties } from 'react'
import storyData from '../content/scenes.json'
import recordsData from '../content/records.json'
import { NEAR_ME_RADIUS_KM, type ArchiveHit, type ArchiveRecord } from './lib/typesense'
import { geoToImage } from './lib/townMap'
import {
  availableChoices,
  gameReducer,
  getScene,
  initialState,
  isPinned,
  lockedChoiceCount,
  parseClock,
  START_MINUTES,
  validateStory,
  type Story,
} from './game/engine'
import { Clock } from './components/Clock'
import { PixelTownScene, type MapMarker } from './components/PixelTownScene'
import { EndingRecap } from './components/EndingRecap'
import { Notebook } from './components/Notebook'
import { SceneView } from './components/SceneView'
import { SearchPanel } from './components/SearchPanel'

type Panel = 'intro' | 'archive' | 'notebook' | 'pause' | 'pier' | null

const story = storyData as unknown as Story
const reducer = gameReducer(story)
const ferryDecisionScenes = new Set(['station-arrival', 'ferry-ticket-page', 'ferry-payment', 'ferry-page-closed', 'ferry-operator-page', 'ferry-operator-payment', 'ferry-operator-closed'])
const dinnerListingScenes = new Set(['dinner-ping', 'dinner-calla-page'])
// Bundled records supply the debrief and page attribution; archive discovery uses search.
const records = new Map((recordsData as ArchiveRecord[]).map((record) => [record.id, record]))

if (import.meta.env.DEV) {
  const problems = validateStory(story, new Set(records.keys()))
  if (problems.length) console.warn('scenes.json problems:\n' + problems.join('\n'))
}

function App() {
  const [state, dispatch] = useReducer(reducer, story, initialState)
  const [started, setStarted] = useState(false)
  const [panel, setPanel] = useState<Panel>(null)
  const [dialogOpen, setDialogOpen] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [selectedRecord, setSelectedRecord] = useState<ArchiveHit | null>(null) // open in the archive detail view
  const [mapView, setMapView] = useState<{ hits: ArchiveHit[]; nearMe: boolean } | null>(null) // results shown on the town
  const scene = getScene(story, state.sceneId)

  // Night deepens from the start of the evening to the last ferry (0 → 1); drives the sky tint.
  const deadline = story.deadline ? parseClock(story.deadline.time) : START_MINUTES + 255
  const minutesLeft = deadline - state.minutes
  const night = Math.min(1, Math.max(0, (state.minutes - START_MINUTES) / (deadline - START_MINUTES)))

  // Archive results with a location become pins on the town art; clicking one reopens that record.
  const markers: MapMarker[] = (mapView?.hits ?? []).flatMap((hit) => hit.location ? [{
    id: hit.id,
    point: geoToImage(hit.location),
    label: hit.title,
    group: hit.source_group,
    onClick: () => { setSelectedRecord(hit); setPanel('archive') },
  }] : [])
  const ending = state.endingId ? story.endings.find((item) => item.id === state.endingId) : null

  useEffect(() => {
    if (!panel) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPanel(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [panel])

  useEffect(() => {
    if (panel === 'archive') document.getElementById('archive-query')?.focus()
  }, [panel])

  function restart() {
    dispatch({ type: 'restart' })
    setPanel(null)
    setDialogOpen(true)
    setStarted(false)
    setMapView(null)
    setSelectedRecord(null)
  }

  return (
    <main className="game-root" style={{ '--night': started ? night : 0 } as CSSProperties}>
      <PixelTownScene
        interactive={started && !panel && !ending}
        showLabels={showLabels}
        onArchive={() => setPanel('archive')}
        onPhone={() => setDialogOpen(true)}
        onPier={() => {
          if (scene.id === 'encore-ping' || scene.id === 'encore-finished') {
            dispatch({ type: 'choose', choice: { label: 'Head to North Pier', next: 'pier-arrival', timeCost: 15, ...(scene.id === 'encore-ping' ? { setsFlags: ['left_before_encore'] } : {}) } })
            setDialogOpen(true)
          } else setPanel('pier')
        }}
        pierTravelActive={scene.id === 'encore-ping' || scene.id === 'encore-finished'}
        marketActive={dinnerListingScenes.has(scene.id)}
        onMarket={() => { dispatch({ type: 'choose', choice: { label: 'Walk to Low Market', next: 'dinner-market-arrival', timeCost: 10 } }); setDialogOpen(true) }}
        wifiActive={scene.id === 'wifi-ping'}
        onWifi={() => { dispatch({ type: 'choose', choice: { label: 'Open nearby networks', next: 'wifi-network-list', timeCost: 0 } }); setDialogOpen(true) }}
        markers={started && !panel && !ending ? markers : []}
        you={state.location ? geoToImage(state.location) : null}
        radiusMeters={mapView?.nearMe ? NEAR_ME_RADIUS_KM * 1000 : null}
      />

      {started && (
        <>
          <div className="map-location" aria-hidden="true"><span className="location-mark">✦</span> Lantern Bay <span className="location-divider">/</span> {state.place}</div>
          <nav className="game-toolbar" aria-label="Game controls">
            <div className={`clock-chip${minutesLeft <= 15 ? ' is-urgent' : minutesLeft <= 45 ? ' is-late' : ''}`} title={`${Math.max(0, minutesLeft)} minutes until the last ferry`}><span className="weather-glyph" aria-hidden="true">☂</span><Clock minutes={state.minutes} /></div>
            <button type="button" className="toolbar-button" onClick={() => setPanel('archive')} aria-label="Open archive search"><span aria-hidden="true">⌕</span><span>Archive</span></button>
            <button type="button" className="toolbar-button" onClick={() => setPanel('notebook')} aria-label={`Open notebook, ${state.pins.length} pinned records`}><span aria-hidden="true">▤</span><span>Notes{state.pins.length > 0 ? ` ${state.pins.length}` : ''}</span></button>
            <button type="button" className="toolbar-button pause-button" onClick={() => setPanel('pause')} aria-label="Pause and settings"><span aria-hidden="true">Ⅱ</span><span>Pause</span></button>
          </nav>
        </>
      )}

      {started && !ending && !panel && mapView && (
        <div className="map-banner" role="status">
          <span>{markers.length} archive {markers.length === 1 ? 'result' : 'results'} on the map{mapView.nearMe ? ` · within ${NEAR_ME_RADIUS_KM * 1000} m` : ''}</span>
          <button type="button" onClick={() => setPanel('archive')}>Back to archive</button>
          <button type="button" onClick={() => setMapView(null)} aria-label="Clear map pins">Clear</button>
        </div>
      )}

      {started && !ending && !panel && (
        dialogOpen ? (
          <div className={`dialog-wrap${['ferry-ticket-page', 'ferry-payment', 'ferry-operator-page', 'ferry-operator-payment', 'dinner-calla-page', 'wifi-network-list', 'wifi-login-screen'].includes(scene.id) ? ' has-ticket-page' : ''}${scene.id === 'wifi-login-screen' ? ' has-network-login' : ''}`}>
            <div className="dialog-topline"><span className="location-mark" aria-hidden="true">✦</span><span>{state.place}</span><button type="button" onClick={() => setDialogOpen(false)} aria-label="Minimize dialogue">−</button></div>
            <SceneView
              scene={scene}
              choices={availableChoices(state, scene)}
              lockedCount={lockedChoiceCount(state, scene)}
              onChoose={(choice) => { dispatch({ type: 'choose', choice }); setDialogOpen(true) }}
              onOpenArchive={() => { setSelectedRecord(null); setPanel('archive') }}
              ticketListing={records.get(scene.id.startsWith('ferry-operator-') ? 'ferry-official-tickets' : 'ferry-sponsored-passes')}
              dinnerListing={records.get('calla-listing')}
              wifiListing={records.get('wifi-citynet-free-listing')}
              publicWifiListing={records.get('wifi-city-locations')}
            />
          </div>
        ) : (
          <button type="button" className="phone-tab" onClick={() => setDialogOpen(true)}>Ping <span aria-hidden="true">●</span></button>
        )
      )}

      {!started && (
        <section className="title-screen" aria-labelledby="game-title">
          <div className="title-card">
            <h1 id="game-title">A Guide to<br /><em>Getting Lost</em></h1>
            <button type="button" className="start-button" onClick={() => { setStarted(true); setPanel('intro') }}>Start exploring <span aria-hidden="true">→</span></button>
          </div>
        </section>
      )}

      {started && ending && (
        <div className="overlay-backdrop ending-backdrop">
          <div className="game-window ending-window"><EndingRecap ending={ending} state={state} story={story} records={records} onRestart={restart} /></div>
        </div>
      )}

      {started && <div className="overlay-backdrop" hidden={panel === null} onMouseDown={(event) => { if (event.target === event.currentTarget) setPanel(null) }}>
        <section className={`game-window ${panel === 'archive' ? 'archive-window' : ''}`} role="dialog" aria-modal="true" aria-label={panel === 'intro' ? 'Before you begin' : panel === 'archive' ? 'City archive' : panel === 'notebook' ? 'Notebook' : panel === 'pause' ? 'Pause and settings' : 'North Pier'}>
          <div className="window-header"><span>{panel === 'intro' ? 'Before you begin' : panel === 'archive' ? 'City archive' : panel === 'notebook' ? 'Notebook' : panel === 'pause' ? 'Paused' : 'North Pier'}</span><button type="button" onClick={() => setPanel(null)} aria-label="Close panel">×</button></div>
          <div className="window-content">
            {panel === 'intro' && <div className="intro-panel">
              <p className="intro-goal">Your plan: get dinner, see a concert, and catch the last ferry home.</p>
              <p>Ping is the AI guide on your phone. It suggests places using town listings and notices. Search the town archive to check where its information came from.</p>
              <p>Each search takes five minutes. Your choices follow you through the night.</p>
              <button type="button" className="primary-button" onClick={() => setPanel(null)}>Begin the night</button>
            </div>}
            <div hidden={panel !== 'archive'}>
              <SearchPanel
                origin={state.location}
                onSearch={() => dispatch({ type: 'search' })}
                isPinned={(id) => isPinned(state, id)}
                onTogglePin={(record) => dispatch({ type: 'togglePin', record })}
                selected={selectedRecord}
                onSelect={setSelectedRecord}
                onUseAddress={ferryDecisionScenes.has(scene.id) ? (record) => {
                  const next = record.id === 'ferry-official-tickets' ? 'ferry-operator-page' : record.id === 'ferry-sponsored-passes' ? 'ferry-ticket-page' : null
                  if (!next || !record.domain) return
                  dispatch({ type: 'choose', choice: { label: `Open ${record.domain}`, next, timeCost: 0 } })
                  setSelectedRecord(null)
                  setPanel(null)
                  setDialogOpen(true)
                } : undefined}
                onOpenListing={dinnerListingScenes.has(scene.id) ? (record) => {
                  if (record.id !== 'calla-listing') return
                  dispatch({ type: 'choose', choice: { label: 'Open Calla listing', next: 'dinner-calla-page', timeCost: 0 } })
                  setSelectedRecord(null)
                  setPanel(null)
                  setDialogOpen(true)
                } : undefined}
                onShowOnMap={(hits, nearMe) => { setMapView({ hits, nearMe }); setPanel(null); setDialogOpen(false) }}
              />
            </div>
            {panel === 'notebook' && <Notebook pins={state.pins} onUnpin={(record) => dispatch({ type: 'togglePin', record })} />}
            {panel === 'pause' && <div className="settings-panel">
              <p>Lantern Night is waiting.</p>
              <label className="settings-toggle"><input type="checkbox" checked={showLabels} onChange={(event) => setShowLabels(event.target.checked)} /> Show map labels</label>
              <button type="button" className="primary-button" onClick={() => setPanel(null)}>Resume</button>
              <button type="button" className="secondary-button" onClick={restart}>Return to title</button>
            </div>}
            {panel === 'pier' && <div className="pier-panel"><span aria-hidden="true">⚓</span><p>North Pier · Ticket window</p><button type="button" className="primary-button" onClick={() => setPanel('archive')}>Open archive</button></div>}
          </div>
        </section>
      </div>}
    </main>
  )
}

export default App
