import settings from '../../content/settings.json'
import type { LatLng } from './typesense'

// The town art is a 16:9 picture whose corners are the map bounds in content/settings.json.
// "Image coordinates" are 0..1 across (x) and down (y) that picture.
export const ART_ASPECT = 16 / 9
const { north, south, west, east } = settings.map

export type ImagePoint = { x: number; y: number }

export function geoToImage([lat, lng]: LatLng): ImagePoint {
  return { x: (lng - west) / (east - west), y: (north - lat) / (north - south) }
}

// The art fills its container with object-fit: cover, so part of it may be cropped.
// Returns a function from image coordinates to pixels inside the container.
export function coverTransform(width: number, height: number) {
  const scale = Math.max(width / ART_ASPECT, height) // drawn art height in px
  const drawnW = scale * ART_ASPECT
  const drawnH = scale
  const offsetX = (width - drawnW) / 2
  const offsetY = (height - drawnH) / 2
  return {
    toPx: ({ x, y }: ImagePoint) => ({ left: offsetX + x * drawnW, top: offsetY + y * drawnH }),
    // Pixels per meter on screen (the bounds are sized so x and y scales match closely).
    pxPerMeter: drawnH / ((north - south) * 111_320),
  }
}
