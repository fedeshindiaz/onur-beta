import { cp, mkdir, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

const projectRoot = process.cwd()
const target = join(projectRoot, 'public', 'ocr')
const coreSource = join(projectRoot, 'node_modules', 'tesseract.js-core')
const workerSource = join(projectRoot, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js')

await rm(target, { recursive: true, force: true })
await mkdir(join(target, 'core'), { recursive: true })
await mkdir(join(target, 'lang'), { recursive: true })
await cp(workerSource, join(target, 'worker.min.js'))

for (const filename of await readdir(coreSource)) {
  if (/^tesseract-core.*\.(?:js|wasm)$/.test(filename)) {
    await cp(join(coreSource, filename), join(target, 'core', filename))
  }
}

for (const language of ['spa', 'eng']) {
  const source = join(projectRoot, 'node_modules', `@tesseract.js-data/${language}`, '4.0.0_best_int', `${language}.traineddata.gz`)
  await cp(source, join(target, 'lang', `${language}.traineddata.gz`))
}
