import { useEffect, useRef } from 'react'

type Props = {
  interactive: boolean
  showLabels: boolean
  onArchive: () => void
  onPhone: () => void
  onPier: () => void
}

// The artwork is sampled into a fixed square-pixel grid, then enlarged by CSS
// without smoothing. This keeps every visible pixel the same size on a screen.
const PIXEL_WIDTH = 800
const PIXEL_HEIGHT = 450

export function PixelTownScene({ interactive, showLabels, onArchive, onPhone, onPier }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

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
    image.src = '/art/lantern-bay-map.png'
  }, [])

  return (
    <div className="town-map" aria-label="Pixel art map of Lantern Bay's rainy market and ferry pier">
      <canvas ref={canvasRef} width={PIXEL_WIDTH} height={PIXEL_HEIGHT} aria-hidden="true" />
      {interactive && <>
        <button type="button" className="map-hotspot hotspot-archive" onClick={onArchive} aria-label="Open archive search">
          <span className="map-hotspot-symbol">⌕</span>{showLabels && <span className="map-hotspot-label">Archive</span>}
        </button>
        <button type="button" className="map-hotspot hotspot-phone" onClick={onPhone} aria-label="Open Ping's phone">
          <span className="map-hotspot-symbol">!</span>{showLabels && <span className="map-hotspot-label">Ping</span>}
        </button>
        <button type="button" className="map-hotspot hotspot-pier" onClick={onPier} aria-label="Inspect ferry pier">
          <span className="map-hotspot-symbol">◈</span>{showLabels && <span className="map-hotspot-label">Pier</span>}
        </button>
      </>}
    </div>
  )
}
