import { copyFile, mkdir, readdir, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const distDirectory = 'dist'
const clientDirectory = join(distDirectory, 'client')
const serverDirectory = join(distDirectory, 'server')
const hostingDirectory = join(distDirectory, '.openai')

const worker = `export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    let response = await env.ASSETS.fetch(request)
    const acceptsHtml = request.headers.get('accept')?.includes('text/html')

    if (response.status === 404 && request.method === 'GET' && acceptsHtml) {
      const fallbackUrl = new URL('/index.html', request.url)
      response = await env.ASSETS.fetch(new Request(fallbackUrl, request))
    }

    const contentType = response.headers.get('content-type') ?? ''
    const requiresFreshResponse =
      contentType.includes('text/html') ||
      url.pathname === '/sw.js' ||
      url.pathname === '/registerSW.js'

    const headers = new Headers(response.headers)
    headers.set('Permissions-Policy', 'xr-spatial-tracking=(self)')

    if (requiresFreshResponse) {
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
      headers.set('Expires', '0')
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  },
}
`

await mkdir(clientDirectory, { recursive: true })

for (const entry of await readdir(distDirectory, { withFileTypes: true })) {
  if (entry.name === 'client' || entry.name === 'server') continue

  await rename(join(distDirectory, entry.name), join(clientDirectory, entry.name))
}

await mkdir(serverDirectory, { recursive: true })
await writeFile(join(serverDirectory, 'index.js'), worker, 'utf8')
await mkdir(hostingDirectory, { recursive: true })
await copyFile(join('.openai', 'hosting.json'), join(hostingDirectory, 'hosting.json'))
