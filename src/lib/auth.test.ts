import { describe, expect, it } from 'vitest'
import { validatePatientCredentials, validateProfessionalCredentials } from './auth'

describe('validación de credenciales', () => {
  it('rechaza un acceso profesional vacío o con correo inválido', () => {
    expect(validateProfessionalCredentials('', '')).toMatch(/correo profesional y la contraseña/i)
    expect(validateProfessionalCredentials('profesional', 'secreto')).toMatch(/correo profesional válido/i)
    expect(validateProfessionalCredentials('profesional@ejemplo.com', 'secreto')).toBeNull()
  })

  it('acepta únicamente un usuario y un PIN o cédula temporal válidos', () => {
    expect(validatePatientCredentials('', '')).toMatch(/usuario y el PIN/i)
    expect(validatePatientCredentials('paciente', '12')).toMatch(/PIN de 4 dígitos/i)
    expect(validatePatientCredentials('paciente', '2468')).toBeNull()
    expect(validatePatientCredentials('Paciente.Uno', '45678901')).toBeNull()
  })
})
