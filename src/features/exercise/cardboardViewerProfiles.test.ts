import { beforeEach, describe, expect, it } from 'vitest'
import { CARDBOARD_VIEWER_PROFILE_STORAGE_KEY, cardboardEyeOpticalOffset, defaultCardboardViewerProfile, normalizeCardboardViewerProfile, readCardboardViewerProfileStore } from './cardboardViewerProfiles'

beforeEach(() => localStorage.clear())

describe('perfiles ópticos Cardboard', () => {
  it('recupera un perfil estándar cuando no hay configuración local', () => {
    expect(readCardboardViewerProfileStore().profiles[0]).toEqual(defaultCardboardViewerProfile)
  })

  it('normaliza valores dañados o fuera del rango seguro de interfaz', () => {
    expect(normalizeCardboardViewerProfile({ imageSeparationPercent: 99, verticalOffsetPercent: -99, horizontalFovDegrees: 10, verticalFovDegrees: 200 })).toMatchObject({
      imageSeparationPercent: 15,
      verticalOffsetPercent: -15,
      horizontalFovDegrees: 60,
      verticalFovDegrees: 105,
    })
  })

  it('aplica separación simétrica y el mismo desplazamiento vertical a ambos ojos', () => {
    const profile = { ...defaultCardboardViewerProfile, imageSeparationPercent: 5, verticalOffsetPercent: -4 }
    expect(cardboardEyeOpticalOffset(profile, 'left', 400, 300)).toEqual({ offsetX: -20, offsetY: -12 })
    expect(cardboardEyeOpticalOffset(profile, 'right', 400, 300)).toEqual({ offsetX: 20, offsetY: -12 })
  })

  it('descarta almacenamiento inválido sin romper el reproductor', () => {
    localStorage.setItem(CARDBOARD_VIEWER_PROFILE_STORAGE_KEY, '{incorrecto')
    expect(readCardboardViewerProfileStore().activeProfileId).toBe('standard')
  })
})
