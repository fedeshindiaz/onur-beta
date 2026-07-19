import { mkdir, readdir, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const distDirectory = 'dist'
const clientDirectory = join(distDirectory, 'client')
const serverDirectory = join(distDirectory, 'server')

const worker = `export default {
  async fetch(request, env) {
    let response = await env.ASSETS.fetch(request)
    const acceptsHtml = request.headers.get('accept')?.includes('text/html')

    if (response.status === 404 && request.method === 'GET' && acceptsHtml) {
      const fallbackUrl = new URL('/index.html', request.url)
      response = await env.ASSETS.fetch(new Request(fallbackUrl, request))
    }

    return response
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
