import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultExerciseConfig, type ExerciseCompletionReport, type ExerciseConfig } from '../exercise/types'
import { applyExercisePurpose } from '../exercise/compatibility'
import type { SessionAssignmentRecord } from './repository'
import { SessionRunner } from './SessionRunner'

const exercisePlayerMock = vi.hoisted(() => vi.fn())

afterEach(() => { cleanup(); vi.useRealTimers() })

vi.mock('../exercise/ExercisePlayer', () => ({
  ExercisePlayer: (props: { config: ExerciseConfig; preparationSeconds?: number; onComplete?: (activeSeconds: number, report?: ExerciseCompletionReport) => void }) => {
    exercisePlayerMock(props)
    return <button type="button" onClick={() => props.onComplete?.(1, { doseMode: props.config.doseMode, completion: 'target_completed', targetRepetitions: props.config.doseMode === 'repetitions' ? props.config.targetRepetitions : undefined, reportedRepetitions: props.config.doseMode === 'repetitions' ? props.config.targetRepetitions : undefined })}>Completar ejercicio</button>
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
  it('marca la ejecución activa para diferir una actualización de la PWA', () => {
    const view = render(<SessionRunner session={session} onFinish={vi.fn()} onExit={vi.fn()} />)
    expect(document.body.dataset.onurSessionRunning).toBe('true')
    view.unmount()
    expect(document.body.dataset.onurSessionRunning).toBeUndefined()
  })

  it('aplica la preparación únicamente al primer ejercicio', async () => {
    exercisePlayerMock.mockClear()
    render(<SessionRunner session={session} onFinish={vi.fn()} onExit={vi.fn()} />)

    expect(exercisePlayerMock.mock.calls.at(-1)?.[0]).toMatchObject({ preparationSeconds: 20 })
    fireEvent.click(screen.getByRole('button', { name: 'Completar ejercicio' }))

    await waitFor(() => expect(exercisePlayerMock.mock.calls.at(-1)?.[0]).toMatchObject({ preparationSeconds: 0 }))
  })

  it('registra la cantidad informada y finaliza la fase por repeticiones solo tras confirmación', async () => {
    const onFinish = vi.fn()
    const repetitionSession = { ...session, exercises: [{ ...defaultExerciseConfig, name: 'Repeticiones', doseMode: 'repetitions' as const, targetRepetitions: 8, rounds: 1, restSeconds: 0 }] }
    render(<SessionRunner session={repetitionSession} onFinish={onFinish} onExit={vi.fn()} />)

    expect(onFinish).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Completar ejercicio' }))

    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1))
    expect(onFinish.mock.calls[0][2][0]).toMatchObject({
      type: 'exercise_completed', dose_mode: 'repetitions', target_repetitions: 8,
      reported_repetitions: 8, completion: 'target_completed',
    })
  })

  it('inserta 20 segundos para colocar y retirar el VR Box sin pedir controles dentro del visor', async () => {
    vi.useFakeTimers()
    const onFinish = vi.fn()
    const vrSession = { ...session, exercises: [{ ...applyExercisePurpose(defaultExerciseConfig, 'optokinetic'), name: 'Optocinético VR', displayMode: 'vr_box' as const, doseMode: 'time' as const, advanceMode: 'automatic' as const, rounds: 1, restSeconds: 0 }] }
    render(<SessionRunner session={vrSession} onFinish={onFinish} onExit={vi.fn()} />)

    expect(screen.getByText('El próximo ejercicio usa el visor')).toBeInTheDocument()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Comenzar preparación de 20 segundos' })) })
    expect(screen.getAllByText('20')).toHaveLength(2)

    for (let second = 0; second < 20; second += 1) await act(async () => { vi.advanceTimersByTime(1_000) })
    fireEvent.click(screen.getByRole('button', { name: 'Completar ejercicio' }))
    expect(screen.getAllByText('Retirar visor')).toHaveLength(2)

    for (let second = 0; second < 20; second += 1) await act(async () => { vi.advanceTimersByTime(1_000) })
    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(onFinish.mock.calls[0][2].map((event: { type: string }) => event.type)).toEqual(['vr_box_put_on', 'exercise_completed', 'vr_box_take_off'])
  })
})
