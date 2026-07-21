import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QuestStationPage } from './QuestStationPage'

const mocks = vi.hoisted(() => ({ claim: vi.fn(), submit: vi.fn() }))

vi.mock('../features/sessions/questRepository', () => ({
  claimQuestSessionPairing: mocks.claim,
  submitQuestSessionCapture: mocks.submit,
}))

vi.mock('../features/sessions/SessionRunner', () => ({
  SessionRunner: ({ onFinish }: { onFinish: (activeSeconds: number, skippedExercises: number, eventLog: never[]) => void }) => <div><p>Reproductor Quest</p><button type="button" onClick={() => onFinish(32, 0, [])}>Terminar Quest</button></div>,
}))

describe('página pública de estación Quest', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mocks.claim.mockReset().mockResolvedValue({
      pairingId: 'pairing-fictitious', deviceToken: 'device-token-fictitious', expiresAt: '2099-01-01T00:00:00.000Z', patientLabel: 'Paciente F.',
      session: { id: 'assignment-fictitious', title: 'Sesión Quest ficticia', instructions: 'Indicación ficticia', exercises: [{ displayMode: 'quest_browser' }] },
    })
    mocks.submit.mockReset().mockResolvedValue('pairing-fictitious')
  })

  it('reclama por código, ejecuta y envía para revisión profesional', async () => {
    render(<QuestStationPage/>)
    fireEvent.change(screen.getByLabelText(/código temporal/i), { target: { value: 'AB12CD34' } })
    fireEvent.click(screen.getByRole('button', { name: /cargar sesión/i }))
    expect(await screen.findByRole('heading', { name: /sesión quest ficticia/i })).toBeInTheDocument()
    expect(screen.getByText(/ventana 2D del navegador/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /comenzar ejecución/i }))
    expect(screen.getByText('Reproductor Quest')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /terminar quest/i }))

    await waitFor(() => expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({ pairingId: 'pairing-fictitious' }), { activeSeconds: 32, skippedExercises: 0, eventLog: [] }))
    expect(await screen.findByRole('heading', { name: /ejecución enviada/i })).toBeInTheDocument()
  })

  it('conserva el resultado y permite reenviarlo si falla la conexión', async () => {
    mocks.submit.mockRejectedValueOnce(new Error('Sin conexión')).mockResolvedValueOnce('pairing-fictitious')
    render(<QuestStationPage/>)
    fireEvent.change(screen.getByLabelText(/código temporal/i), { target: { value: 'AB12CD34' } })
    fireEvent.click(screen.getByRole('button', { name: /cargar sesión/i }))
    fireEvent.click(await screen.findByRole('button', { name: /comenzar ejecución/i }))
    fireEvent.click(screen.getByRole('button', { name: /terminar quest/i }))

    expect(await screen.findByText(/no repitas los ejercicios/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /reintentar envío/i }))
    expect(await screen.findByRole('heading', { name: /ejecución enviada/i })).toBeInTheDocument()
    expect(mocks.submit).toHaveBeenCalledTimes(2)
  })
})
