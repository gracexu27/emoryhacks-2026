import Typesense from 'typesense'

export type ArchiveHit = {
  id: string
  title: string
  excerpt: string
  source_name: string
  source_type: string
}

const host = import.meta.env.VITE_TYPESENSE_HOST
const key = import.meta.env.VITE_TYPESENSE_SEARCH_KEY

export function searchIsConfigured(): boolean {
  return Boolean(host && key)
}

export async function searchArchive(query: string): Promise<ArchiveHit[]> {
  if (!searchIsConfigured()) throw new Error('Typesense search is not configured in .env')
  const client = new Typesense.SearchClient({
    nodes: [{
      host,
      port: Number(import.meta.env.VITE_TYPESENSE_PORT || '8108'),
      protocol: import.meta.env.VITE_TYPESENSE_PROTOCOL || 'http',
    }],
    apiKey: key,
    connectionTimeoutSeconds: 5,
  })
  const response = await client.collections<ArchiveHit>('archive').documents().search({
    q: query,
    query_by: 'title,excerpt,tags,source_name',
    per_page: 10,
  }, {})
  return response.hits?.map((hit) => hit.document) ?? []
}
