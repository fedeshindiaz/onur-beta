import { beforeEach, describe, expect, it } from 'vitest'
import { acceptPatientAcknowledgement, getPatientAcknowledgement, PATIENT_ACKNOWLEDGEMENT } from './patientAcknowledgement'

describe('confirmación de uso del portal',()=>{
  beforeEach(()=>localStorage.clear())
  it('se solicita una vez por versión y conserva la fecha',async()=>{expect((await getPatientAcknowledgement()).accepted).toBe(false);const accepted=await acceptPatientAcknowledgement();expect(accepted.accepted).toBe(true);expect((await getPatientAcknowledgement()).acceptedAt).toBe(accepted.acceptedAt)})
  it('mantiene una versión explícita para renovar el texto de forma controlada',()=>expect(PATIENT_ACKNOWLEDGEMENT.version).toBe('1.0-beta'))
})
