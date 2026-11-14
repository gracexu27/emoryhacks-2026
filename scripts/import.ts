import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
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
  connectionTimeoutSeconds: 30,
})

// Keep optional media models out of the default import: downloading them can time out.
const enableMediaSearch = process.env.ENABLE_EXPERIMENTAL_MEDIA_SEARCH === '1'

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
    { name: 'domain', type: 'string', optional: true },
    { name: 'domain_registered', type: 'int64', optional: true },
    { name: 'image_url', type: 'string', optional: true, index: false },
    // Image search: Typesense embeds `image` with CLIP; the raw image is not stored.
    { name: 'image', type: 'image', optional: true, store: false },
    {
      name: 'embedding',
      type: 'float[]',
      optional: true,
      embed: { from: ['image'], model_config: { model_name: 'ts/clip-vit-b-p32' } },
    },
  ],
  // Voice search: Typesense transcribes voice_query audio with Whisper.
  voice_query_model: { model_name: 'ts/whisper/base.en' },
} as const

// image_url is served from public/, so "/archive-images/x.jpg" lives at "public/archive-images/x.jpg".
async function withImage(record: { id: string; image_url?: string }) {
  if (!record.image_url) return record
  const file = join('public', record.image_url)
  try {
    return { ...record, image: (await readFile(file)).toString('base64') }
  } catch {
    throw new Error(`Record "${record.id}": image file not found at ${file}`)
  }
}

async function main() {
  // Recreate every run so schema changes always apply; records.json is the source of truth.
  const existing = await client.collections().retrieve()
  if (existing.some((collection) => collection.name === 'archive')) {
    await client.collections('archive').delete()
  }
  console.log(enableMediaSearch ? 'Creating archive with CLIP and Whisper models…' : 'Creating archive collection…')
  const fields = enableMediaSearch
    ? [...schema.fields]
    : schema.fields.filter((field) => !['image_url', 'image', 'embedding'].includes(field.name))
  const collectionSchema = enableMediaSearch
    ? { ...schema, fields }
    : { name: schema.name, fields }
  await client.collections().create(collectionSchema)

  const records = JSON.parse(await readFile('content/records.json', 'utf8'))
  if (!Array.isArray(records)) throw new Error('content/records.json must be an array')
  const documents = await Promise.all(records.map(withImage))
  const imported = await client.collections('archive').documents().import(documents, { action: 'upsert' })
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
  console.log(`Imported ${imported.length} archive records`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
