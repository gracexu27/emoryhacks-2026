import { readFile, writeFile } from 'node:fs/promises'
import { loadEnvFile } from 'node:process'
import Typesense from 'typesense'

loadEnvFile('.env')

const adminKey = process.env.TYPESENSE_ADMIN_KEY
if (!adminKey) throw new Error('Set TYPESENSE_ADMIN_KEY in .env')

const client = new Typesense.Client({
  nodes: [{
    host: process.env.VITE_TYPESENSE_HOST || 'localhost',
    port: Number(process.env.VITE_TYPESENSE_PORT || '8108'),
    protocol: process.env.VITE_TYPESENSE_PROTOCOL || 'http',
  }],
  apiKey: adminKey,
  connectionTimeoutSeconds: 5,
})

const schema = {
  name: 'archive',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'excerpt', type: 'string' },
    { name: 'tags', type: 'string[]' },
    { name: 'source_name', type: 'string' },
    { name: 'source_type', type: 'string', facet: true },
    { name: 'source_group', type: 'string', facet: true },
    { name: 'date', type: 'int64', sort: true },
    { name: 'is_sponsored', type: 'bool', facet: true },
    { name: 'location', type: 'geopoint', optional: true },
  ],
} as const

async function main() {
  const existing = await client.collections().retrieve()
  if (!existing.some((collection) => collection.name === 'archive')) {
    await client.collections().create({ ...schema, fields: [...schema.fields] })
  }

  const records = JSON.parse(await readFile('content/records.json', 'utf8'))
  if (!Array.isArray(records)) throw new Error('content/records.json must be an array')
  const imported = await client.collections('archive').documents().import(records, { action: 'upsert' })
  const failures = imported.filter((result) => !result.success)
  if (failures.length) throw new Error(`Import failed for ${failures.length} record(s): ${JSON.stringify(failures)}`)

  if (!process.env.VITE_TYPESENSE_SEARCH_KEY) {
    const key = await client.keys().create({
      description: 'EmoryHacks archive browser search',
      actions: ['documents:search'],
      collections: ['archive'],
    })
    const env = await readFile('.env', 'utf8')
    await writeFile('.env', env.replace(/^VITE_TYPESENSE_SEARCH_KEY=.*$/m, `VITE_TYPESENSE_SEARCH_KEY=${key.value}`))
    console.log('Created a search-only browser key in .env')
  }
  console.log(`Imported ${imported.length} placeholder records`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
