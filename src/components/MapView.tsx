import settings from '../../content/settings.json'
import { NEAR_ME_RADIUS_KM, type ArchiveHit, type LatLng } from '../lib/typesense'

// Schematic map of the fictional town: lat/lng projected onto a plain SVG box. No tiles, no library.
const W = 400
const H = 260
const { south, north, west, east } = settings.map

function project([lat, lng]: LatLng): [number, number] {
  return [((lng - west) / (east - west)) * W, ((north - lat) / (north - south)) * H]
}

type Props = {
  hits: ArchiveHit[]
  origin: LatLng | null
  nearMe: boolean
}

export function MapView({ hits, origin, nearMe }: Props) {
  const located = hits.filter((hit): hit is ArchiveHit & { location: LatLng } => Boolean(hit.location))

  // Radius in SVG units; x and y scale differently, so it's an ellipse.
  const radius = origin && {
    rx: (NEAR_ME_RADIUS_KM / (111.32 * Math.cos((origin[0] * Math.PI) / 180)) / (east - west)) * W,
    ry: (NEAR_ME_RADIUS_KM / 111.32 / (north - south)) * H,
  }

  return (
    <figure className="map">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Map with ${located.length} places`}>
        <rect width={W} height={H} className="map-bg" />
        {origin && nearMe && radius && (
          <ellipse cx={project(origin)[0]} cy={project(origin)[1]} rx={radius.rx} ry={radius.ry} className="map-radius" />
        )}
        {located.map((hit) => {
          const [x, y] = project(hit.location)
          return (
            <g key={hit.id} className={`map-pin map-pin-${hit.source_group}`}>
              <circle cx={x} cy={y} r={6} />
              <text x={x + 9} y={y + 4}>{hit.title.replace('TODO-CONTENT ', '')}</text>
              <title>{hit.title}</title>
            </g>
          )
        })}
        {origin && (
          <g className="map-you">
            <circle cx={project(origin)[0]} cy={project(origin)[1]} r={7} />
            <text x={project(origin)[0] + 10} y={project(origin)[1] - 8}>You</text>
          </g>
        )}
      </svg>
      {located.length === 0 && <figcaption className="empty">No results with a location.</figcaption>}
    </figure>
  )
}
