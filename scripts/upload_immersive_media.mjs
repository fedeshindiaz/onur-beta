import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { Upload } from 'tus-js-client'

function parseEnvironment(text) {
  return Object.fromEntries(text.split(/\r?\n/).flatMap((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return []
    const separator = trimmed.indexOf('=')
    if (separator < 1) return []
    return [[trimmed.slice(0, separator), trimmed.slice(separator + 1).replace(/^['"]|['"]$/g, '')]]
  }))
}

const environmentFile = process.env.ONUR_ENV_FILE ?? '.env.staging.local'
const fileEnvironment = parseEnvironment(await readFile(environmentFile, 'utf8'))
const supabaseUrl = process.env.SUPABASE_URL ?? fileEnvironment.SUPABASE_URL ?? fileEnvironment.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? fileEnvironment.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) throw new Error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.')

const derivativeDirectory = resolve(process.env.ONUR_IMMERSIVE_MEDIA_DIR ?? '..\\ONUr Media\\360-library\\derivatives')
const files = [
  ['street_quiet_quest.jpg', 'street_quiet/quest.jpg', 'image/jpeg', '47e93af2b6bfb3ccebac3a55e9b4f6e2aa7d6647b4a96fe2ce928009950de5c6'],
  ['street_quiet_vrbox.jpg', 'street_quiet/vrbox.jpg', 'image/jpeg', 'e6e66fa13e45fb60edd75b7a3442945435f0e10126d97be5401529dd33865dae'],
  ['street_quiet_thumb.jpg', 'street_quiet/thumb.jpg', 'image/jpeg', '4c666c86c43882e588425e36f22ba2ba7c7a1263b9b162c3840940caedce4246'],
  ['crosswalk_static_quest.jpg', 'crosswalk_static/quest.jpg', 'image/jpeg', '52d3e27c24bb1fd73e8b18ecc50b517e709be32491e5285bbfc5120f44a87625'],
  ['crosswalk_static_vrbox.jpg', 'crosswalk_static/vrbox.jpg', 'image/jpeg', '388e22084ddecd5605179aa36ce83cf48970a12f4392adeb145487bc9a54cd95'],
  ['crosswalk_static_thumb.jpg', 'crosswalk_static/thumb.jpg', 'image/jpeg', 'def60a2d6412b121288e69b83de9ca19bda13fc8c94bd1cbfd8bd72951ef89c1'],
  ['retail_phone_shop_quest.jpg', 'retail_phone_shop/quest.jpg', 'image/jpeg', '9229aa930922281a7fb981f243dc3036dd90aed66cce1d6558df1b9c736789bb'],
  ['retail_phone_shop_vrbox.jpg', 'retail_phone_shop/vrbox.jpg', 'image/jpeg', 'b5a758e4d5f7679000029e9ee5015eba4b49b7830a91f1e6bc0d44a373802af2'],
  ['retail_phone_shop_thumb.jpg', 'retail_phone_shop/thumb.jpg', 'image/jpeg', '31f9acbbac673edb4a45a92baff021688180872a0e6600f14ed3b3a29bee538f'],
  ['mall_triangeln_quest.jpg', 'mall_triangeln/quest.jpg', 'image/jpeg', 'b63912c6265e7e8d97584a076b0a020210dc0b78c9f3281f8d664b5a1c10a022'],
  ['mall_triangeln_vrbox.jpg', 'mall_triangeln/vrbox.jpg', 'image/jpeg', 'e2095130ecfb13659f013a459665f1fff8646a24ce75003fa3d8736316f8a273'],
  ['mall_triangeln_thumb.jpg', 'mall_triangeln/thumb.jpg', 'image/jpeg', 'e18350fa2a8ea9038c51b8c59fdf720c46102f0d076f8f49390726f3b70d7b07'],
  ['station_hamburg_quest.jpg', 'station_hamburg/quest.jpg', 'image/jpeg', '95a0e45bb503476b52fcfe1422058bfba388b0ff949f10076097b117012285c7'],
  ['station_hamburg_vrbox.jpg', 'station_hamburg/vrbox.jpg', 'image/jpeg', 'febada7f39348f5a89bd48d231567359d77cd405f2ed37e9c6ed5f5b3844ea8a'],
  ['station_hamburg_thumb.jpg', 'station_hamburg/thumb.jpg', 'image/jpeg', '67336656ddac8dceca1a875b6a82dff10bebb4919838ed5e2f8c21ba3f5081c3'],
  ['metro_moscow_quest.mp4', 'metro_moscow/quest.mp4', 'video/mp4', 'a71d1bc2ed584a3e57a5ddc894a572ff6b489f13e5a43f1593ca0c92fa5687f6'],
  ['metro_moscow_vrbox.mp4', 'metro_moscow/vrbox.mp4', 'video/mp4', '4280c4ae87afc4aeb78352bfda76efe61325739f29402b7a69f97a5a3592fbae'],
  ['metro_moscow_thumb.jpg', 'metro_moscow/thumb.jpg', 'image/jpeg', 'b5c3d42c1e4c4f8371f142992b377959a2c9b6e4353469116e43f44126041fc4'],
  ['urban_ride_nyc_quest.mp4', 'urban_ride_nyc/quest.mp4', 'video/mp4', 'dd193fc3f6a5748417d4d7532e69d51f8db19a1df6e64cffdb3b72ccb61acd98'],
  ['urban_ride_nyc_vrbox.mp4', 'urban_ride_nyc/vrbox.mp4', 'video/mp4', '2c47ba6977441f27a7e54c6f74f799b70b47eb70e2a67d07850db57081f420b0'],
  ['urban_ride_nyc_thumb.jpg', 'urban_ride_nyc/thumb.jpg', 'image/jpeg', '4f3d3e7370a1f093908ef0b15dc4cf8be7a93ad40f7caada2a866c136a68fb45'],
]

const client = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
const { error: createBucketError } = await client.storage.createBucket('immersive-media', {
  public: true,
  allowedMimeTypes: ['image/jpeg', 'video/mp4'],
})
if (createBucketError && !/already exists|duplicate/i.test(createBucketError.message)) throw createBucketError
const { data: bucket, error: bucketError } = await client.storage.getBucket('immersive-media')
if (bucketError) throw bucketError
process.stderr.write(`Bucket immersive-media · ${JSON.stringify(bucket)}\n`)
if (process.argv.includes('--inspect')) process.exit(0)
const limitArgument = process.argv.find((argument) => argument.startsWith('--set-limit='))
if (limitArgument) {
  const fileSizeLimit = Number(limitArgument.split('=')[1])
  if (!Number.isFinite(fileSizeLimit) || fileSizeLimit < 1) throw new Error('El límite solicitado no es válido.')
  const { error } = await client.storage.updateBucket('immersive-media', { public: true, fileSizeLimit, allowedMimeTypes: ['image/jpeg', 'video/mp4'] })
  if (error) throw new Error(`El proyecto no admite un límite de ${fileSizeLimit} bytes: ${error.message}`)
  process.stdout.write(`Límite actualizado a ${fileSizeLimit} bytes.\n`)
  process.exit(0)
}

function resumableUpload(storagePath, contentType, body, sha256) {
  return new Promise((resolveUpload, rejectUpload) => {
    const upload = new Upload(body, {
      endpoint: `${supabaseUrl.replace(/\/$/, '')}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000],
      headers: { authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey, 'x-upsert': 'true' },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      metadata: { bucketName: 'immersive-media', objectName: storagePath, contentType, cacheControl: '31536000', sha256 },
      onError: (error) => rejectUpload(new Error(`Falló la carga reanudable de ${storagePath}: ${String(error?.message ?? error).split(', originated from request')[0]}`)),
      onSuccess: resolveUpload,
    })
    upload.start()
  })
}

for (const [fileName, storagePath, contentType, expectedSha256] of files) {
  const body = await readFile(resolve(derivativeDirectory, fileName))
  const sha256 = createHash('sha256').update(body).digest('hex')
  if (sha256 !== expectedSha256) throw new Error(`Checksum inesperado en ${fileName}.`)
  process.stderr.write(`Subiendo ${storagePath} · ${body.byteLength} bytes…\n`)
  if (body.byteLength > 6 * 1024 * 1024) await resumableUpload(storagePath, contentType, body, sha256)
  else {
    const { error } = await client.storage.from('immersive-media').upload(storagePath, body, { contentType, cacheControl: '31536000', metadata: { sha256 }, upsert: true })
    if (error) throw error
  }
  process.stdout.write(`Publicado ${storagePath} · ${body.byteLength} bytes · ${sha256}\n`)
}
