import Typesense from 'typesense'
import settings from '../../content/settings.json'

export type SourceType = 'official' | 'visitor' | 'news' | 'listing'
export type SourceGroup = 'official' | 'people' | 'places'

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
}

export type SearchFilters = {
  recentOnly: boolean
  sourceTypes: SourceType[] // empty = all types
}

export type GroupedResults = Record<SourceGroup, ArchiveRecord[]>

export const SOURCE_GROUPS: SourceGroup[] = ['official', 'people', 'places']
export const SOURCE_TYPES: SourceType[] = ['official', 'visitor', 'news', 'listing']

// "Today" in the fictional city, and how far back counts as recent.
export const GAME_TODAY = Math.floor(Date.parse(settings.gameToday) / 1000)
export const RECENT_CUTOFF = GAME_TODAY - settings.recentDays * 24 * 60 * 60

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
    }],
    apiKey: key,
    connectionTimeoutSeconds: 5,
  })
  return client
}

function buildFilter(group: SourceGroup, filters: SearchFilters): string {
  const parts = [`source_group:=${group}`]
  if (filters.recentOnly) parts.push(`date:>=${RECENT_CUTOFF}`)
  if (filters.sourceTypes.length) parts.push(`source_type:=[${filters.sourceTypes.join(',')}]`)
  return parts.join(' && ')
}

// One request, three searches: one per result column.
export async function multiSearchArchive(query: string, filters: SearchFilters): Promise<GroupedResults> {
  const response = await getClient().multiSearch.perform({
    searches: SOURCE_GROUPS.map((group) => ({
      collection: 'archive',
      q: query,
      query_by: 'title,excerpt,tags,source_name',
      filter_by: buildFilter(group, filters),
      exclude_fields: 'embedding',
      per_page: 10,
    })),
  })

  const results = response.results as Array<{ hits?: Array<{ document: ArchiveRecord }>; error?: string }>
  const grouped = { official: [], people: [], places: [] } as GroupedResults
  results.forEach((result, index) => {
    if (result.error) throw new Error(result.error)
    grouped[SOURCE_GROUPS[index]] = result.hits?.map((hit) => hit.document) ?? []
  })
  return grouped
}
