import { beforeEach, describe, expect, it } from 'vitest'
import { createTreatmentReport, listPatientReports } from './repository'

describe('informes versionados',()=>{
  beforeEach(()=>localStorage.clear())
  it('crea una nueva versión sin sobrescribir la anterior',async()=>{const input={patientId:'ana-p',treatmentCycleId:'cycle-ana-2',professionalSummary:'Resumen',snapshot:{sessions:1},status:'draft' as const};const first=await createTreatmentReport(input);const second=await createTreatmentReport({...input,status:'final'});expect(first.version).toBe(1);expect(second.version).toBe(2);expect(await listPatientReports('ana-p')).toHaveLength(2)})
})
