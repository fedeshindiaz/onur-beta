import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { defaultExerciseConfig } from '../exercise/types'
import type { SessionAssignmentRecord } from './repository'
import { SessionRunner } from './SessionRunner'

const exercisePlayerMock = vi.hoisted(() => vi.fn())

vi.mock('../exercise/ExercisePlayer', () => ({
  ExercisePlayer: (props: { preparationSeconds?: number; onComplete?: (activeSeconds: number) => void }) => {
    exercisePlayerMock(props)
    return <button type="button" onClick={() => props.onComplete?.(1)}>Completar ejercicio</button>
  },
}))

const session: SessionAssignmentRecord = {
  id: 'assignment-test', patientId: 'patient-test', patientName: 'Paciente', treatmentCycleId: 'cycle-test', sessionPlanId: 'plan-test',
  title: 'Sesión', instructions: '', mode: 'home', availableFrom: '2026-07-18', availableUntil: '', status: 'assigned', createdAt: '2026-07-18',
  activeSeconds: 0, completedAt: '', initialDiscomfort: null, finalDiscomfort: null, perceivedDifficulty: null, patientComment: '',
  exercises: [
    { ...defaultExerciseConfig, name: 'Primero', rounds: 1, restSeconds: 0, preparationSeconds: 20 },
    { ...defaultExerciseConfig, name: 'Segundo', rounds: 1, restSeconds: 0, preparationSeconds: 10 },
  ],
}

describe('SessionRunner', () => {
  it('aplica la preparación únicamente al primer ejercicio', async () => {
    exercisePlayerMock.mockClear()
    render(<SessionRunner session={session} onFinish={vi.fn()} onExit={vi.fn()} />)

    expect(exercisePlayerMock.mock.calls.at(-1)?.[0]).toMatchObject({ preparationSeconds: 20 })
    fireEvent.click(screen.getByRole('button', { name: 'Completar ejercicio' }))

    await waitFor(() => expect(exercisePlayerMock.mock.calls.at(-1)?.[0]).toMatchObject({ preparationSeconds: 0 }))
  })
})
