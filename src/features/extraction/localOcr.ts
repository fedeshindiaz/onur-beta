import { createWorker, OEM } from 'tesseract.js'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { classifyPage, comparePatientIdentity, EXTRACTOR_VERSION, extractFields, type PatientIdentityForMatch } from './extractor'
import type { ExtractedPage, ExtractionProgress, IntakeKind, LocalExtractionDraft, OcrLine } from './types'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const acceptedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
const maxFileSize = 25 * 1024 * 1024

function inferredMime(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  return file.type || ({ pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[extension ?? ''] ?? '')
}

export function validateClinicalFile(file: File) {
  if (file.size > maxFileSize) throw new Error('El archivo supera el máximo de 25 MB.')
  if (!acceptedTypes.has(inferredMime(file))) throw new Error('Usá un archivo PDF, JPG, JPEG, PNG o WEBP.')
}

function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('No fue posible preparar la vista previa.')), 'image/jpeg', .9))
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => { URL.revokeObjectURL(url); resolve(image) }
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No fue posible leer la imagen.')) }
    image.src = url
  })
}

function improveContrast(source: HTMLCanvasElement) {
  const target = document.createElement('canvas')
  target.width = source.width
  target.height = source.height
  const context = target.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('El navegador no permite procesar la imagen localmente.')
  context.drawImage(source, 0, 0)
  const image = context.getImageData(0, 0, target.width, target.height)
  for (let index = 0; index < image.data.length; index += 4) {
    const grey = image.data[index] * .299 + image.data[index + 1] * .587 + image.data[index + 2] * .114
    const contrasted = Math.max(0, Math.min(255, (grey - 128) * 1.35 + 128))
    image.data[index] = contrasted
    image.data[index + 1] = contrasted
    image.data[index + 2] = contrasted
  }
  context.putImageData(image, 0, 0)
  return target
}

async function recognizeCanvas(canvas: HTMLCanvasElement) {
  const base = `${import.meta.env.BASE_URL}ocr/`
  const worker = await createWorker(['spa', 'eng'], OEM.LSTM_ONLY, {
    workerPath: `${base}worker.min.js`, langPath: `${base}lang`, corePath: `${base}core`,
    workerBlobURL: false, gzip: true,
  })
  try {
    const result = await worker.recognize(improveContrast(canvas), { rotateAuto: true }, { text: true, blocks: true })
    const lines: OcrLine[] = []
    for (const block of result.data.blocks ?? []) for (const paragraph of block.paragraphs) for (const line of paragraph.lines) {
      lines.push({ text: line.text.trim(), confidence: line.confidence, region: { x: line.bbox.x0 / canvas.width, y: line.bbox.y0 / canvas.height, width: (line.bbox.x1 - line.bbox.x0) / canvas.width, height: (line.bbox.y1 - line.bbox.y0) / canvas.height } })
    }
    return { text: result.data.text, confidence: result.data.confidence, rotationDegrees: Math.round((result.data.rotateRadians ?? 0) * 180 / Math.PI), lines }
  } finally { await worker.terminate() }
}

async function imageCanvas(file: File) {
  const image = await loadImage(file)
  const maxDimension = 2200
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('El navegador no permite preparar la imagen.')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas
}

async function analyzeCanvas(canvas: HTMLCanvasElement, pageNumber: number, embeddedText = '', embeddedLines: OcrLine[] = []): Promise<ExtractedPage> {
  const ocr = embeddedText.trim().length > 80 ? { text: embeddedText, confidence: 95, rotationDegrees: 0, lines: embeddedLines } : await recognizeCanvas(canvas)
  const classification = classifyPage(ocr.text)
  const previewUrl = URL.createObjectURL(await canvasBlob(canvas))
  return { pageNumber, proposedClassification: classification.classification, classification: classification.classification, classificationConfidence: classification.confidence, rotationDegrees: ocr.rotationDegrees, width: canvas.width, height: canvas.height, previewUrl, text: ocr.text, lines: ocr.lines }
}

async function analyzePdf(file: File, progress: (value: ExtractionProgress) => void) {
  const pdf = await getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const pages: ExtractedPage[] = []
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    progress({ currentPage: pageNumber, totalPages: pdf.numPages, phase: 'rendering' })
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale: 1.7 })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('El navegador no permite renderizar el PDF.')
    await page.render({ canvas, canvasContext: context, viewport }).promise
    const textContent = await page.getTextContent()
    const embeddedLines: OcrLine[] = textContent.items.flatMap((item) => {
      if (!('str' in item) || !item.str.trim()) return []
      const point = viewport.convertToViewportPoint(item.transform[4], item.transform[5])
      const height = Math.max(8, Math.abs(item.transform[3]) * viewport.scale)
      return [{ text: item.str, confidence: 99, region: { x: Math.max(0, point[0] / canvas.width), y: Math.max(0, (point[1] - height) / canvas.height), width: Math.min(1, Math.max(.01, item.width * viewport.scale / canvas.width)), height: Math.min(1, height / canvas.height) } }]
    })
    const embeddedText = embeddedLines.map((line) => line.text).join('\n')
    progress({ currentPage: pageNumber, totalPages: pdf.numPages, phase: embeddedText.trim().length > 80 ? 'classifying' : 'ocr' })
    pages.push(await analyzeCanvas(canvas, pageNumber, embeddedText, embeddedLines))
    page.cleanup()
  }
  await pdf.cleanup()
  return pages
}

export async function analyzeClinicalFile(file: File, intakeKind: IntakeKind, patient: PatientIdentityForMatch, onProgress: (value: ExtractionProgress) => void): Promise<LocalExtractionDraft> {
  validateClinicalFile(file)
  let pages: ExtractedPage[] = []
  if (inferredMime(file) === 'application/pdf') pages = await analyzePdf(file, onProgress)
  else {
    onProgress({ currentPage: 1, totalPages: 1, phase: 'ocr' })
    pages = [await analyzeCanvas(await imageCanvas(file), 1)]
  }
  const match = comparePatientIdentity(pages, patient)
  onProgress({ currentPage: pages.length, totalPages: pages.length, phase: 'done' })
  return { intakeKind, extractorVersion: EXTRACTOR_VERSION, pages, fields: extractFields(pages, intakeKind), patientMatchStatus: match.status, mismatchFields: match.mismatchFields }
}

export function releaseExtractionPreviews(draft: LocalExtractionDraft | null) {
  draft?.pages.forEach((page) => URL.revokeObjectURL(page.previewUrl))
}
