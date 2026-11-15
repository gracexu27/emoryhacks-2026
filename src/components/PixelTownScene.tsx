import { useEffect, useRef, useState } from 'react'
import { coverTransform, type ImagePoint } from '../lib/townMap'

export type MapMarker = {
  id: string
  point: ImagePoint
  label: string
  group: string // source_group, used for the pin colour
  onClick: () => void
}

type Props = {
  interactive: boolean
  showLabels: boolean
  onArchive: () => void
  onPhone: () => void
  onPier: () => void
  pierTravelActive: boolean
  marketActive: boolean
  onMarket: () => void
  wifiActive: boolean
  onWifi: () => void
  markers?: MapMarker[] // archive results shown on the town
  you?: ImagePoint | null // the player's position
  radiusMeters?: number | null // "Near me" radius around the player, when that filter is on
}

// The artwork is sampled into a fixed square-pixel grid, then enlarged by CSS
// without smoothing. This keeps every visible pixel the same size on a screen.
const PIXEL_WIDTH = 800
const PIXEL_HEIGHT = 450

// Fixed places to click, in image coordinates (0..1 across and down the art).
const HOTSPOTS = {
  archive: { x: 0.2, y: 0.58 },
  phone: { x: 0.5, y: 0.55 },
  pier: { x: 0.71, y: 0.3 },
  market: { x: 0.6, y: 0.67 },
  wifi: { x: 0.76, y: 0.7 },
}

export function PixelTownScene({ interactive, showLabels, onArchive, onPhone, onPier, pierTravelActive, marketActive, onMarket, wifiActive, onWifi, markers = [], you, radiusMeters }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!context) return

    const image = new Image()
    image.onload = () => {
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      context.drawImage(image, 0, 0, PIXEL_WIDTH, PIXEL_HEIGHT)
    }
    image.src = '/art/lantern-bay-map.jpg'
  }, [])

  // Track the container size so overlays line up with the cropped art.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  const { toPx, pxPerMeter } = coverTransform(size.width, size.height)
  const at = (point: ImagePoint) => toPx(point)

  return (
    <div ref={rootRef} className="town-map" aria-label="Pixel art map of Lantern Bay's rainy market and ferry pier">
      <canvas ref={canvasRef} width={PIXEL_WIDTH} height={PIXEL_HEIGHT} aria-hidden="true" />

      {size.width > 0 && you && radiusMeters && (
        <div
          className="town-radius"
          aria-hidden="true"
          style={{ ...at(you), width: radiusMeters * 2 * pxPerMeter, height: radiusMeters * 2 * pxPerMeter }}
        />
      )}

      {size.width > 0 && markers.map((marker) => (
        <button
          key={marker.id}
          type="button"
          // Pins on the right half put their label on the left so it stays on screen.
          className={`town-pin town-pin-${marker.group}${at(marker.point).left > size.width * 0.55 ? ' is-flipped' : ''}`}
          style={at(marker.point)}
          onClick={marker.onClick}
        >
          <span className="town-pin-dot" aria-hidden="true" />
          <span className="town-pin-label">{marker.label}</span>
        </button>
      ))}

      {size.width > 0 && you && markers.length > 0 && (
        <div className="town-you" style={at(you)} aria-hidden="true"><span>You</span></div>
      )}

      {interactive && size.width > 0 && <>
        <button type="button" className="map-hotspot" style={at(HOTSPOTS.archive)} onClick={onArchive} aria-label="Open archive search">
          <span className="map-hotspot-symbol">⌕</span>{showLabels && <span className="map-hotspot-label">Archive</span>}
        </button>
        <button type="button" className="map-hotspot" style={at(HOTSPOTS.phone)} onClick={onPhone} aria-label="Open Ping's phone">
          <span className="map-hotspot-symbol">!</span>{showLabels && <span className="map-hotspot-label">Ping</span>}
        </button>
        <button type="button" className="map-hotspot" style={at(HOTSPOTS.pier)} onClick={onPier} aria-label={pierTravelActive ? 'Head to North Pier, 15 minutes' : 'Inspect ferry pier'}>
          <span className="map-hotspot-symbol">◈</span>{showLabels && <span className="map-hotspot-label">Pier</span>}
        </button>
        {marketActive && <button type="button" className="map-hotspot" style={at(HOTSPOTS.market)} onClick={onMarket} aria-label="Walk to Low Market, 10 minutes">
          <span className="map-hotspot-symbol">♨</span>{showLabels && <span className="map-hotspot-label">Market</span>}
        </button>}
        {wifiActive && <button type="button" className="map-hotspot" style={at(HOTSPOTS.wifi)} onClick={onWifi} aria-label="Open nearby Wi-Fi networks">
          <span className="map-hotspot-symbol">⌁</span>{showLabels && <span className="map-hotspot-label">Wi-Fi</span>}
        </button>}
      </>}
    </div>
  )
}
