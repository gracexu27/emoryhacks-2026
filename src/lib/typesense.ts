import Typesense from 'typesense'
import settings from '../../content/settings.json'

export type SourceType = 'official' | 'visitor' | 'news' | 'listing' | 'vendor' | 'domain_record'
export type SourceGroup = 'official' | 'people' | 'places' | 'web'
export type ResultGroup = 'official' | 'people' | 'places'

export type ArchiveRecord = {
  id: string
  title: string
  excerpt: string
  tags: string[]
  source_name: string
  source_type: SourceType
  source_group: SourceGroup
  date: number
  is_sponsored: boolean
  location?: [number, number]
  domain?: string
  domain_registered?: number
  image_url?: string
  hidden_text?: string
  network_name?: string
}

// A search result: the record plus its distance from the player (only when both have a location).
// A search result: the record plus search-time extras that are not stored when pinned:
// distance from the player, and Typesense highlight snippets ("<mark>" around matched words).
export type ArchiveHit = ArchiveRecord & {
  distance_m?: number
  snippets?: { title?: string; excerpt?: string }
}

export type LatLng = [number, number]

export type SearchFilters = {
  recentOnly: boolean
  sourceTypes: SourceType[] // empty = all types
  nearMe: boolean
}

export type GroupedResults = Record<ResultGroup, ArchiveHit[]>

export const SOURCE_GROUPS: ResultGroup[] = ['official', 'people', 'places']
export const SOURCE_TYPES: SourceType[] = ['official', 'visitor', 'news', 'listing', 'vendor', 'domain_record']

// "Today" in the fictional city, and how far back counts as recent.
export const GAME_TODAY = Math.floor(Date.parse(settings.gameToday) / 1000)
export const RECENT_CUTOFF = GAME_TODAY - settings.recentDays * 24 * 60 * 60
export const NEAR_ME_RADIUS_KM = settings.nearMeRadiusKm

// Typesense reports this distance for records that have no location.
const NO_DISTANCE = 2147483647

const host = import.meta.env.VITE_TYPESENSE_HOST
const key = import.meta.env.VITE_TYPESENSE_SEARCH_KEY

export function searchIsConfigured(): boolean {
  return Boolean(host && key)
}

let client: InstanceType<typeof Typesense.SearchClient> | null = null

function getClient() {
  if (!searchIsConfigured()) throw new Error('Typesense search is not configured in .env')
  client ??= new Typesense.SearchClient({
    nodes: [{
      host,
      port: Number(import.meta.env.VITE_TYPESENSE_PORT || '8108'),
      protocol: import.meta.env.VITE_TYPESENSE_PROTOCOL || 'http',
      path: import.meta.env.VITE_TYPESENSE_PATH || '', // e.g. "/typesense" behind nginx in production
    }],
    apiKey: key,
    connectionTimeoutSeconds: 5,
  })
  return client
}

function buildFilter(group: ResultGroup, filters: SearchFilters, origin: LatLng | null): string {
  const groupFilter = group === 'places' ? 'source_group:=[places,web]' : `source_group:=${group}`
  const parts = [groupFilter]
  if (filters.recentOnly) parts.push(`date:>=${RECENT_CUTOFF}`)
  if (filters.sourceTypes.length) parts.push(`source_type:=[${filters.sourceTypes.join(',')}]`)
  if (filters.nearMe && origin) parts.push(`location:(${origin[0]}, ${origin[1]}, ${NEAR_ME_RADIUS_KM} km)`)
  return parts.join(' && ')
}

// With a player location, always sort by distance too so every located hit gets a distance badge.
// "Near me" puts distance first; otherwise relevance wins and distance breaks ties.
function buildSort(filters: SearchFilters, origin: LatLng | null): string | undefined {
  if (!origin) return undefined
  const geo = `location(${origin[0]}, ${origin[1]}):asc`
  return filters.nearMe ? `${geo},_text_match:desc` : `_text_match:desc,${geo}`
}

type RawHit = {
  document: ArchiveRecord
  geo_distance_meters?: { location?: number }
  highlight?: { title?: { snippet?: string }; excerpt?: { snippet?: string } }
}

// One request, three searches: one per result column.
export async function multiSearchArchive(
  query: string,
  filters: SearchFilters,
  origin: LatLng | null,
): Promise<GroupedResults> {
  const response = await getClient().multiSearch.perform({
    searches: SOURCE_GROUPS.map((group) => ({
      collection: 'archive',
      q: query,
      query_by: 'title,excerpt,tags,source_name',
      filter_by: buildFilter(group, filters, origin),
      sort_by: buildSort(filters, origin),
      exclude_fields: 'embedding',
      highlight_fields: 'title,excerpt',
      highlight_start_tag: '<mark>',
      highlight_end_tag: '</mark>',
      per_page: 10,
    })),
  })

  const results = response.results as Array<{ hits?: RawHit[]; error?: string }>
  const grouped = { official: [], people: [], places: [] } as GroupedResults
  results.forEach((result, index) => {
    if (result.error) throw new Error(result.error)
    grouped[SOURCE_GROUPS[index]] = (result.hits ?? []).map((hit) => {
      const distance = hit.geo_distance_meters?.location
      const result: ArchiveHit = {
        ...hit.document,
        snippets: { title: hit.highlight?.title?.snippet, excerpt: hit.highlight?.excerpt?.snippet },
      }
      if (distance !== undefined && distance !== NO_DISTANCE) result.distance_m = distance
      return result
    })
  })
  return grouped
}

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`
}
