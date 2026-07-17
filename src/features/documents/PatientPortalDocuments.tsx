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

  return <section className="mt-8"><h2 className="text-lg font-black text-[#123238]">Mis documentos y estudios</h2><p className="mt-1 text-xs leading-5 text-[#71878c]">Los documentos bloqueados requieren autorización previa de tu profesional.</p>
    {error&&<p role="alert" className="mt-3 rounded-2xl bg-[#fff6e4] p-3 text-xs font-bold text-[#805b16]">{error}</p>}{notice&&<p className="mt-3 rounded-2xl bg-[#e8f5f2] p-3 text-xs font-bold text-[#08746e]">{notice}</p>}
    {isPending?<p className="mt-4 text-sm text-[#71878c]">Cargando documentos…</p>:documents.length===0?<p className="mt-4 rounded-2xl border border-[#dce7e5] bg-white p-5 text-sm text-[#71878c]">Todavía no hay documentos asociados a tu perfil.</p>:<div className="mt-4 space-y-3">{documents.map(document=><article key={document.id} className="rounded-2xl border border-[#dce7e5] bg-white p-4"><div className="flex items-center gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${document.canView?'bg-[#e8f5f2] text-[#0b7a75]':'bg-[#eef1f2] text-[#71878c]'}`}>{document.canView?<FileText size={18}/>:<LockKeyhole size={18}/>}</span><span className="min-w-0 flex-1"><strong className="block text-sm text-[#29474d]">{documentTypeLabels[document.documentType]}</strong><small className="mt-1 block truncate text-[#71878c]">{document.documentDate} · {document.originalFilename}</small></span>{document.canView&&<ShieldCheck size={17} className="text-[#27734c]"/>}</div>
      {document.canView?<div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" onClick={()=>open(document)} className="inline-flex items-center gap-2 rounded-xl border border-[#b9d5d1] px-3 py-2 text-xs font-black text-[#0b7a75]"><ExternalLink size={14}/> Visualizar</button>{document.canDownload&&<button type="button" onClick={()=>open(document,true)} className="inline-flex items-center gap-2 rounded-xl bg-[#0b7a75] px-3 py-2 text-xs font-black text-white"><Download size={14}/> Descargar</button>}</div>:<div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-[#f5f8f7] p-3"><p className="text-xs text-[#60777d]">{document.requestStatus==='pending'?'Solicitud pendiente de respuesta.':document.requestStatus==='denied'?'La solicitud anterior no fue autorizada.':document.requestStatus==='approved'?'El permiso anterior fue revocado.':'Acceso bloqueado.'}</p><button type="button" disabled={document.requestStatus==='pending'||request.isPending} onClick={()=>requestAccess(document.id)} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#123238] px-3 py-2 text-xs font-black text-white disabled:bg-[#9aa8aa]"><Send size={13}/>{document.requestStatus==='pending'?'Enviada':'Solicitar acceso'}</button></div>}
    </article>)}</div>}
  </section>
}
