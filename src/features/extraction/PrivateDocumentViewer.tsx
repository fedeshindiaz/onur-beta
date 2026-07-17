import { useEffect, useState } from 'react'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { SourceRegion } from './types'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export function PrivateDocumentViewer({ url, mimeType, pageNumber, region }: { url: string; mimeType: string; pageNumber: number; region: SourceRegion | null }) {
  const [renderedUrl, setRenderedUrl] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (!url || mimeType !== 'application/pdf') { setRenderedUrl(''); return }
    let disposed = false
    let objectUrl = ''
    void (async () => {
      try {
        setError('')
        const pdf = await getDocument({ url }).promise
        const page = await pdf.getPage(pageNumber)
        const viewport = page.getViewport({ scale: 1.45 })
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(viewport.width); canvas.height = Math.round(viewport.height)
        const context = canvas.getContext('2d')
        if (!context) throw new Error('render')
        await page.render({ canvas, canvasContext: context, viewport }).promise
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('render')), 'image/jpeg', .9))
        objectUrl = URL.createObjectURL(blob)
        if (!disposed) setRenderedUrl(objectUrl)
        page.cleanup(); await pdf.cleanup()
      } catch { if (!disposed) setError('No fue posible mostrar esta página del original privado.') }
    })()
    return () => { disposed = true; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [url, mimeType, pageNumber])
  if (!url) return <div className="grid min-h-[540px] place-items-center p-8 text-center text-sm text-[#60777d]">El modo demo conserva la trazabilidad del borrador, pero no persiste el archivo original. En staging y producción se muestra desde Storage privado mediante URL temporal.</div>
  if (error) return <div className="grid min-h-[540px] place-items-center p-8 text-center text-sm text-[#a94952]">{error}</div>
  const imageUrl = mimeType === 'application/pdf' ? renderedUrl : url
  if (!imageUrl) return <div className="grid min-h-[540px] place-items-center text-sm text-[#60777d]">Renderizando página privada…</div>
  return <div className="relative mx-auto w-fit"><img src={imageUrl} alt={`Página ${pageNumber} del documento clínico privado`} className="max-h-[680px] max-w-full object-contain"/>{region && <span aria-label="Región de origen" className="pointer-events-none absolute border-2 border-[#e39a24] bg-[#ffd98a]/25" style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%` }}/>}</div>
}
