import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createCanvas, loadImage, type Canvas } from '@napi-rs/canvas'
import { createWorker, OEM, PSM } from 'tesseract.js'
import { bapRecognitionRegions, binarizeBapDarkText } from '../src/features/extraction/bapOcrProfile'
import { classifyPage, extractFields } from '../src/features/extraction/extractor'
import type { ExtractedPage, OcrLine, SourceRegion } from '../src/features/extraction/types'

interface CorpusCase {
  file: string
  variant: string
  expected: Record<string, string>
}

interface CorpusManifest {
  synthetic: boolean
  clinical_use: boolean
  cases: CorpusCase[]
}

function resultLines(result: any, canvas: Canvas, target: SourceRegion = { x: 0, y: 0, width: 1, height: 1 }) {
  const lines: OcrLine[] = []
  for (const block of result.data.blocks ?? []) for (const paragraph of block.paragraphs) for (const line of paragraph.lines) {
    lines.push({
      text: line.text.trim(),
      confidence: line.confidence,
      region: {
        x: target.x + line.bbox.x0 / canvas.width * target.width,
        y: target.y + line.bbox.y0 / canvas.height * target.height,
        width: (line.bbox.x1 - line.bbox.x0) / canvas.width * target.width,
        height: (line.bbox.y1 - line.bbox.y0) / canvas.height * target.height,
      },
    })
  }
  return lines.filter((line) => line.text)
}

function mergeLines(groups: OcrLine[][]) {
  const merged: OcrLine[] = []
  for (const line of groups.flat()) {
    const key = line.text.toLocaleLowerCase('es-UY').replace(/\s+/g, ' ').trim()
    const duplicate = merged.findIndex((candidate) => candidate.text.toLocaleLowerCase('es-UY').replace(/\s+/g, ' ').trim() === key && Math.abs(candidate.region.y - line.region.y) < .025)
    if (duplicate < 0) merged.push(line)
    else if (line.confidence > merged[duplicate].confidence) merged[duplicate] = line
  }
  return merged.sort((a, b) => a.region.y - b.region.y || a.region.x - b.region.x)
}

function darkTextRegion(source: Canvas, region: SourceRegion, threshold = 145) {
  const sourceX = Math.round(source.width * region.x)
  const sourceY = Math.round(source.height * region.y)
  const sourceWidth = Math.max(1, Math.round(source.width * region.width))
  const sourceHeight = Math.max(1, Math.round(source.height * region.height))
  const scale = Math.min(3, 2600 / Math.max(sourceWidth, sourceHeight))
  const target = createCanvas(Math.max(1, Math.round(sourceWidth * scale)), Math.max(1, Math.round(sourceHeight * scale)))
  const context = target.getContext('2d')
  context.drawImage(source, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, target.width, target.height)
  const image = context.getImageData(0, 0, target.width, target.height)
  binarizeBapDarkText(image.data, threshold)
  context.putImageData(image, 0, 0)
  return target
}

function normalized(value: string) {
  return value.trim().replace(',', '.').replace(/\.0+$/, '')
}

export async function evaluateBapOcrCorpus() {
  const fixtureRoot = resolve('tests/fixtures/synthetic-clinical')
  const manifest = JSON.parse(await readFile(resolve(fixtureRoot, 'bap_ocr_corpus_synthetic.json'), 'utf8')) as CorpusManifest
  if (!manifest.synthetic || manifest.clinical_use) throw new Error('El benchmark solo admite un corpus sintético sin uso clínico.')

  const worker = await createWorker(['spa', 'eng'], OEM.LSTM_ONLY, {
    langPath: resolve('public/ocr/lang'),
    // Vitest puede convertir la ruta por defecto en una URL localhost al
    // ejecutar en Linux. Node Worker exige una ruta real del sistema.
    workerPath: resolve('node_modules/tesseract.js/src/worker-script/node/index.js'),
  })
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, preserve_interword_spaces: '1', user_defined_dpi: '300' })
  let correct = 0
  let total = 0
  const failures: string[] = []
  try {
    for (const fixture of manifest.cases) {
      const path = resolve(fixtureRoot, fixture.file)
      const image = await loadImage(path)
      const canvas = createCanvas(image.width, image.height)
      canvas.getContext('2d').drawImage(image, 0, 0)
      const full = await worker.recognize(path, { rotateAuto: false }, { text: true, blocks: true })
      const groups = [resultLines(full, canvas)]
      for (const [regionIndex, region] of bapRecognitionRegions.entries()) {
        const thresholds = regionIndex === 1 ? [128, 145] : [145]
        for (const threshold of thresholds) {
          const prepared = darkTextRegion(canvas, region, threshold)
          const result = await worker.recognize(prepared.toBuffer('image/png'), { rotateAuto: false }, { text: true, blocks: true })
          groups.push(resultLines(result, prepared, region))
        }
      }
      const lines = mergeLines(groups)
      const text = lines.map((line) => line.text).join('\n')
      const classification = classifyPage(text)
      const page: ExtractedPage = {
        pageNumber: 1,
        proposedClassification: classification.classification,
        classification: classification.classification,
        classificationConfidence: classification.confidence,
        rotationDegrees: 0,
        width: canvas.width,
        height: canvas.height,
        previewUrl: '',
        text,
        lines,
      }
      const fields = new Map(extractFields([page], 'posturography_bap').map((field) => [field.code, field.normalizedValue]))
      const caseFailures: string[] = []
      for (const [code, expected] of Object.entries(fixture.expected)) {
        total += 1
        const actual = normalized(fields.get(code) ?? '')
        if (actual === normalized(expected)) correct += 1
        else caseFailures.push(`${code}: esperado ${expected}, obtenido ${actual || 'vacío'}`)
      }
      const caseTotal = Object.keys(fixture.expected).length
      const caseCorrect = caseTotal - caseFailures.length
      console.log(`${fixture.file} [${fixture.variant}]: ${caseCorrect}/${caseTotal}`)
      if (caseFailures.length) {
        const evidence = lines
          .filter((line) => line.region.x > .62 && /\d/.test(line.text))
          .map((line) => `${line.text.replace(/\s+/g, ' ')}@${line.region.x.toFixed(3)},${line.region.y.toFixed(3)}`)
          .join(' | ')
        failures.push(`${fixture.file}: ${caseFailures.join('; ')} | OCR: ${evidence}`)
      }
    }
  } finally {
    await worker.terminate()
  }

  const accuracy = total ? correct / total : 0
  console.log(`Precisión total: ${correct}/${total} (${(accuracy * 100).toFixed(1)} %)`)
  if (failures.length) console.log(failures.join('\n'))
  if (accuracy < .95) throw new Error('La precisión del corpus BAP quedó por debajo del mínimo de 95 %.')
}
