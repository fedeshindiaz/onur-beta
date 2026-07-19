import { Camera, ClipboardPaste, FileImage, RefreshCw, UploadCloud } from 'lucide-react'
import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from 'react'
import { validateClinicalFile } from './localOcr'

interface Props {
  file: File | null
  previewUrl: string
  pageCount: number
  disabled?: boolean
  onFile: (file: File) => void
  onError: (message: string) => void
}

export function ClinicalFileDropzone({ file, previewUrl, pageCount, disabled, onFile, onError }: Props) {
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const accept = (candidate?: File) => { if (!candidate) return; try { validateClinicalFile(candidate); onFile(candidate) } catch (caught) { onError(caught instanceof Error ? caught.message : 'Archivo no válido.') } }
  useEffect(() => {
    const paste = (event: globalThis.ClipboardEvent) => {
      if (disabled) return
      const candidate = Array.from(event.clipboardData?.files ?? []).find((item) => item.type.startsWith('image/') || item.type === 'application/pdf')
      if (candidate) { event.preventDefault(); accept(candidate) }
    }
    window.addEventListener('paste', paste)
    return () => window.removeEventListener('paste', paste)
  })
  const drop = (event: DragEvent) => { event.preventDefault(); setDragging(false); accept(event.dataTransfer.files[0]) }
  const pasteHere = (event: ClipboardEvent) => accept(Array.from(event.clipboardData.files).find((item) => item.type.startsWith('image/') || item.type === 'application/pdf'))
  return <section onPaste={pasteHere} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={drop} className={`rounded-2xl border-2 border-dashed p-5 transition ${dragging ? 'border-[#E49A02] bg-[#FFF7E8]' : 'border-[#E8CE99] bg-[#F7F6F4]'}`}>
    {file ? <div className="grid gap-4 sm:grid-cols-[120px_1fr] sm:items-center">
      <div className="grid h-28 place-items-center overflow-hidden rounded-2xl border border-[#E9E7E7] bg-white">{previewUrl ? <img src={previewUrl} alt="Vista previa local" className="h-full w-full object-contain"/> : <FileImage className="text-[#E49A02]"/>}</div>
      <div><p className="break-all text-sm font-black text-[#2F2F2F]">{file.name}</p><p className="mt-1 text-xs text-[#747474]">{(file.size / 1024 / 1024).toFixed(2)} MB · {pageCount || 1} página{pageCount === 1 ? '' : 's'}</p><button type="button" disabled={disabled} onClick={() => input.current?.click()} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#E9E7E7] bg-white px-3 py-2 text-xs font-black text-[#2F2F2F]"><RefreshCw size={14}/> Reemplazar antes de confirmar</button></div>
    </div> : <button type="button" disabled={disabled} onClick={() => input.current?.click()} className="grid min-h-40 w-full place-items-center text-center"><span><UploadCloud className="mx-auto text-[#E49A02]" size={30}/><strong className="mt-3 block text-sm text-[#2F2F2F]">Arrastrá, seleccioná o pegá con Ctrl+V</strong><span className="mt-2 block text-xs leading-5 text-[#747474]">PDF, JPG, JPEG, PNG o WEBP · máximo 25 MB</span><span className="mt-3 inline-flex items-center gap-2 text-xs font-black text-[#E49A02]"><ClipboardPaste size={14}/> El procesamiento ocurre en este navegador</span></span></button>}
    <input ref={input} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={(event) => accept(event.target.files?.[0])}/>
    <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#171717] px-3 py-2 text-xs font-black text-white"><Camera size={14}/> Tomar fotografía<input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => accept(event.target.files?.[0])}/></label>
  </section>
}
