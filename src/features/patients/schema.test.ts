import { describe, expect, it } from 'vitest'
import { patientFormSchema, suggestUsername } from './schema'

const base = { fullName:'Ana Pereira',birthDate:'1958-03-10',insurer:'Mutualista',affiliateNumber:'',phone:'',status:'active' as const,privateNotes:'',createPortalAccount:false,username:'',temporaryCi:'' }

describe('patientFormSchema',()=>{
  it('permite crear un paciente sin portal',()=>expect(patientFormSchema.safeParse(base).success).toBe(true))
  it('exige usuario y cédula si se crea el portal',()=>expect(patientFormSchema.safeParse({...base,createPortalAccount:true}).success).toBe(false))
  it('normaliza una sugerencia de usuario legible',()=>expect(suggestUsername('Ána Pérez Silva')).toBe('AnaPerezSilva'))
})
