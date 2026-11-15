import type { Choice, Scene } from '../game/engine'
import type { ArchiveRecord } from '../lib/typesense'

type Props = {
  scene: Scene
  choices: Choice[]
  onChoose: (choice: Choice) => void
  onOpenArchive: () => void
  ticketListing?: ArchiveRecord
  dinnerListing?: ArchiveRecord
  wifiListing?: ArchiveRecord
  publicWifiListing?: ArchiveRecord
}

// Narration (the world) and Ping (a character) are visually separate, so the player never
// mistakes the narrator's facts for Ping's advice.
export function SceneView({ scene, choices, onChoose, onOpenArchive, ticketListing, dinnerListing, wifiListing, publicWifiListing }: Props) {
  const canSearch = ['ferry-ticket-page', 'ferry-payment', 'ferry-page-closed', 'ferry-operator-page', 'ferry-operator-payment', 'ferry-operator-closed', 'dinner-ping', 'dinner-calla-page', 'dinner-market-arrival', 'wifi-ping', 'wifi-network-list', 'wifi-login-screen', 'wifi-seawall', 'encore-ping'].includes(scene.id)
  const choiceButtons = choices.map((choice) => (
    <button key={choice.label} type="button" className="choice" onClick={() => onChoose(choice)}>
      <span className="choice-arrow" aria-hidden="true">▶</span>
      <span className="choice-label">{choice.label}</span>
      <span className="choice-cost">{choice.timeCost > 0 ? `+${choice.timeCost} min` : 'now'}</span>
    </button>
  ))
  if (canSearch) {
    choiceButtons.splice(scene.id.endsWith('-closed') ? 0 : 1, 0,
      <button key="search-town-records" type="button" className="choice choice-archive" onClick={onOpenArchive}>
        <span className="choice-arrow" aria-hidden="true">⌕</span>
        <span className="choice-label">Search town records</span>
        <span className="choice-cost">5 min per search</span>
      </button>,
    )
  }

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

      {['ferry-ticket-page', 'ferry-payment', 'ferry-operator-page', 'ferry-operator-payment'].includes(scene.id) && ticketListing && (
        <div className="ticket-source" aria-label="Ticket page source">
          <strong>{ticketListing.title}</strong>
          <span>{scene.id.startsWith('ferry-operator-') ? 'Opened from' : 'Suggested from'}: {ticketListing.source_name}</span>
          {ticketListing.is_sponsored && <span className="ticket-source-featured">Featured listing</span>}
        </div>
      )}

      {scene.id === 'dinner-calla-page' && dinnerListing && (
        <div className="ticket-source" aria-label="Calla listing source">
          <strong>{dinnerListing.title}</strong>
          <span>{dinnerListing.excerpt}</span>
          <span>Listed by: {dinnerListing.source_name}</span>
          {dinnerListing.is_sponsored && <span className="ticket-source-featured">Featured listing</span>}
        </div>
      )}

      {['wifi-network-list', 'wifi-seawall'].includes(scene.id) && wifiListing && publicWifiListing && (
        <div className="network-panel" aria-label="Wi-Fi networks at this location">
          <span>NETWORKS · {scene.id === 'wifi-network-list' ? 'THE FLATS' : 'THE SEAWALL'}</span>
          <div className="network-row"><strong>{wifiListing.network_name ?? wifiListing.title}</strong><small>{scene.id === 'wifi-network-list' ? 'In range' : 'No signal'}</small></div>
          <div className="network-row"><strong>{publicWifiListing.network_name ?? publicWifiListing.title}</strong><small>{scene.id === 'wifi-seawall' ? 'In range' : 'No signal'}</small></div>
        </div>
      )}

      {scene.id === 'wifi-login-screen' && wifiListing && (
        <div className="wifi-login-preview" aria-label="CityNet Free sign-in page preview">
          <strong>{wifiListing.network_name ?? wifiListing.title}</strong>
          <span>City account sign-in</span>
          <div className="wifi-fake-field">Account name</div>
          <div className="wifi-fake-field">Password</div>
          <small>Sign in to continue</small>
        </div>
      )}

      <div className="choices" role="group" aria-label="What do you do?">
        {choiceButtons}
      </div>
    </section>
  )
}
