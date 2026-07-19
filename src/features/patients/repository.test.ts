import { beforeEach, describe, expect, it } from 'vitest'
import { deletePatient, listPatients } from './repository'

describe('eliminación demo de pacientes', () => {
  beforeEach(() => localStorage.clear())

  it('elimina el paciente y lo quita del listado persistido', async () => {
    const patients = await listPatients()
    const patient = patients[0]

    await deletePatient(patient.id)

    expect((await listPatients()).some((item) => item.id === patient.id)).toBe(false)
  })

  it('rechaza la eliminación de un paciente inexistente', async () => {
    await expect(deletePatient('patient-that-does-not-exist')).rejects.toThrow('Paciente no encontrado.')
  })
})
