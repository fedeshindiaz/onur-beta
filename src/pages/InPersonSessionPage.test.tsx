import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InPersonSessionPage } from './InPersonSessionPage'

const mocks = vi.hoisted(() => ({
  status: 'assigned' as 'assigned' | 'started',
  start: vi.fn(),
  complete: vi.fn(),
}))

vi.mock('../features/patients/hooks', () => ({
  usePatient: () => ({ data: { id: 'patient-fictitious', fullName: 'Paciente Ficticio' }, isPending: false }),
}))

vi.mock('../features/sessions/hooks', () => ({
  useSessionAssignments: () => ({
    data: [{
      id: 'assignment-in-person', patientId: 'patient-fictitious', patientName: 'Paciente Ficticio',
      treatmentCycleId: 'cycle-fictitious', sessionPlanId: 'plan-fictitious', title: 'Sesión presencial ficticia',
      instructions: 'Indicaciones ficticias', mode: 'in_person', exercises: [{ rounds: 1, durationSeconds: 10, restSeconds: 0 }],
      availableFrom: '2026-07-17T00:00:00.000Z', availableUntil: '', status: mocks.status, createdAt: '2026-07-17T00:00:00.000Z',
      activeSeconds: 0, completedAt: '', initialDiscomfort: null, finalDiscomfort: null, perceivedDifficulty: null, patientComment: '',
    }],
    isPending: false,
  }),
  useStartSupervisedInPersonSession: () => ({ mutateAsync: mocks.start, isPending: false }),
  useCompleteSupervisedInPersonSession: () => ({ mutateAsync: mocks.complete, isPending: false }),
}))

vi.mock('../features/sessions/SessionRunner', () => ({
  SessionRunner: ({ onExit, onFinish }: { onExit: () => void; onFinish: (activeSeconds: number, skippedExercises: number) => void }) => <div>
    <p>Reproductor reutilizado</p>
    <button type="button" onClick={onExit}>Salir de la sesión</button>
    <button type="button" onClick={() => onFinish(37, 1)}>Omitir y finalizar</button>
  </div>,
}))

function renderPage() {
  return render(<MemoryRouter initialEntries={['/app/pacientes/patient-fictitious/sesiones/assignment-in-person/presencial']}><Routes><Route path="/app/pacientes/:patientId/sesiones/:assignmentId/presencial" element={<InPersonSessionPage/>}/></Routes></MemoryRouter>)
}

describe('ejecución presencial desde la cuenta profesional', () => {
  beforeEach(() => {
    mocks.status = 'assigned'
    mocks.start.mockReset().mockResolvedValue('execution-fictitious')
    mocks.complete.mockReset().mockResolvedValue('execution-fictitious')
  })

  it('exige malestar inicial y completa el flujo con omisión y cierre supervisado', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /comenzar sesión presencial/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/malestar inicial/i)

    const initialScale = screen.getByRole('group', { name: /malestar antes de comenzar/i })
    fireEvent.click(within(initialScale).getByRole('button', { name: '2' }))
    fireEvent.click(screen.getByRole('button', { name: /comenzar sesión presencial/i }))
    await waitFor(() => expect(mocks.start).toHaveBeenCalledWith(expect.objectContaining({ initialDiscomfort: 2 })))
    expect(screen.getByText('Reproductor reutilizado')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /omitir y finalizar/i }))
    const finalScale = screen.getByRole('group', { name: /malestar al finalizar/i })
    const difficultyScale = screen.getByRole('group', { name: /dificultad percibida/i })
    fireEvent.click(within(finalScale).getByRole('button', { name: '3' }))
    fireEvent.click(within(difficultyScale).getByRole('button', { name: '2' }))
    fireEvent.change(screen.getByPlaceholderText(/transcribí lo declarado/i), { target: { value: 'Comentario ficticio del paciente' } })
    fireEvent.change(screen.getByPlaceholderText(/observación clínica/i), { target: { value: 'Observación profesional ficticia' } })
    fireEvent.click(screen.getByRole('button', { name: /guardar y finalizar/i }))

    await waitFor(() => expect(mocks.complete).toHaveBeenCalledWith(expect.objectContaining({ activeSeconds: 37, skippedExercises: 1, finalDiscomfort: 3, perceivedDifficulty: 2, patientComment: 'Comentario ficticio del paciente', professionalObservation: 'Observación profesional ficticia' })))
    expect(await screen.findByRole('heading', { name: /sesión presencial registrada/i })).toBeInTheDocument()
  })

  it('muestra reanudación desde el principio para una asignación iniciada', () => {
    mocks.status = 'started'
    renderPage()
    expect(screen.getByRole('button', { name: /reanudar desde el principio/i })).toBeInTheDocument()
  })
})
