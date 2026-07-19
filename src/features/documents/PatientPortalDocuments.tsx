import { Download, ExternalLink, FileText, LockKeyhole, Send, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { createDocumentUrl } from './repository'
import { useCurrentPatientDocuments, useRequestDocumentAccess } from './hooks'
import { documentTypeLabels } from './types'

export function PatientPortalDocuments() {
  const {data:documents=[],isPending}=useCurrentPatientDocuments()
  const request=useRequestDocumentAccess()
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')

  const open=async(document:typeof documents[number],download=false)=>{setError('');try{const url=await createDocumentUrl(document,download);window.open(url,'_blank','noopener,noreferrer')}catch(caught){setError(caught instanceof Error?caught.message:'No fue posible abrir el documento.')}}
  const requestAccess=async(documentId:string)=>{setError('');setNotice('');try{await request.mutateAsync(documentId);setNotice('Solicitud enviada. Tu profesional decidirá si habilita el acceso.')}catch(caught){setError(caught instanceof Error?caught.message:'No fue posible enviar la solicitud.')}}

  return <section className="mt-8"><h2 className="text-lg font-black text-[#171717]">Mis documentos y estudios</h2><p className="mt-1 text-xs leading-5 text-[#747474]">Los documentos bloqueados requieren autorización previa de tu profesional.</p>
    {error&&<p role="alert" className="mt-3 rounded-2xl bg-[#FFF7E8] p-3 text-xs font-bold text-[#8A5B00]">{error}</p>}{notice&&<p className="mt-3 rounded-2xl bg-[#FFF7E8] p-3 text-xs font-bold text-[#A36B00]">{notice}</p>}
    {isPending?<p className="mt-4 text-sm text-[#747474]">Cargando documentos…</p>:documents.length===0?<p className="mt-4 rounded-2xl border border-[#E9E7E7] bg-white p-5 text-sm text-[#747474]">Todavía no hay documentos asociados a tu perfil.</p>:<div className="mt-4 space-y-3">{documents.map(document=><article key={document.id} className="rounded-2xl border border-[#E9E7E7] bg-white p-4"><div className="flex items-center gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${document.canView?'bg-[#FFF7E8] text-[#E49A02]':'bg-[#F1EFEC] text-[#747474]'}`}>{document.canView?<FileText size={18}/>:<LockKeyhole size={18}/>}</span><span className="min-w-0 flex-1"><strong className="block text-sm text-[#2F2F2F]">{documentTypeLabels[document.documentType]}</strong><small className="mt-1 block truncate text-[#747474]">{document.documentDate} · {document.originalFilename}</small></span>{document.canView&&<ShieldCheck size={17} className="text-[#27734c]"/>}</div>
      {document.canView?<div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" onClick={()=>open(document)} className="inline-flex items-center gap-2 rounded-xl border border-[#E8CE99] px-3 py-2 text-xs font-black text-[#E49A02]"><ExternalLink size={14}/> Visualizar</button>{document.canDownload&&<button type="button" onClick={()=>open(document,true)} className="inline-flex items-center gap-2 rounded-xl bg-[#E49A02] px-3 py-2 text-xs font-black text-white"><Download size={14}/> Descargar</button>}</div>:<div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-[#F7F6F4] p-3"><p className="text-xs text-[#747474]">{document.requestStatus==='pending'?'Solicitud pendiente de respuesta.':document.requestStatus==='denied'?'La solicitud anterior no fue autorizada.':document.requestStatus==='approved'?'El permiso anterior fue revocado.':'Acceso bloqueado.'}</p><button type="button" disabled={document.requestStatus==='pending'||request.isPending} onClick={()=>requestAccess(document.id)} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#171717] px-3 py-2 text-xs font-black text-white disabled:bg-[#747474]"><Send size={13}/>{document.requestStatus==='pending'?'Enviada':'Solicitar acceso'}</button></div>}
    </article>)}</div>}
  </section>
}
