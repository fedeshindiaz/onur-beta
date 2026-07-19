import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExercisePlayer } from './ExercisePlayer'
import { applyExercisePurpose } from './compatibility'
import { defaultExerciseConfig } from './types'

vi.mock('./ExerciseCanvas', () => ({ ExerciseCanvas: () => <div>Vista visual</div> }))
vi.mock('./StereoscopicExerciseCanvas', () => ({ StereoscopicExerciseCanvas: () => <div>Vista VR</div> }))

afterEach(() => vi.useRealTimers())

describe('avance del reproductor', () => {
  it('finaliza automáticamente un ejercicio VR Box por tiempo', async () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()
    render(<ExercisePlayer config={{ ...applyExercisePurpose(defaultExerciseConfig, 'optokinetic'), displayMode: 'vr_box', doseMode: 'time', advanceMode: 'automatic', durationSeconds: 1, preparationSeconds: 0 }} onExit={vi.fn()} onComplete={onComplete}/>)

    await act(async () => { vi.advanceTimersByTime(1_000) })
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0][1]).toMatchObject({ doseMode: 'time', completion: 'target_completed' })
  })

  it('pide confirmación al finalizar un ejercicio 2D por tiempo con avance manual', async () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()
    render(<ExercisePlayer config={{ ...defaultExerciseConfig, doseMode: 'time', advanceMode: 'manual', durationSeconds: 1, preparationSeconds: 0 }} onExit={vi.fn()} onComplete={onComplete}/>)

    await act(async () => { vi.advanceTimersByTime(1_000) })
    expect(onComplete).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('en repeticiones acepta una cantidad parcial', () => {
    const onComplete = vi.fn()
    render(<ExercisePlayer config={{ ...defaultExerciseConfig, doseMode: 'repetitions', targetRepetitions: 8, preparationSeconds: 0 }} onExit={vi.fn()} onComplete={onComplete}/>)

    fireEvent.click(screen.getByRole('button', { name: 'Informar finalización' }))
    fireEvent.click(screen.getByRole('button', { name: 'Hice menos' }))
    fireEvent.change(screen.getByLabelText('Repeticiones realizadas aproximadamente'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y continuar' }))

    expect(onComplete).toHaveBeenCalledWith(0, expect.objectContaining({ doseMode: 'repetitions', completion: 'partial', targetRepetitions: 8, reportedRepetitions: 5 }))
  })

  it('impide ejecutar un RVO x1 heredado dentro de VR Box', () => {
    const onExit = vi.fn()
    render(<ExercisePlayer config={{ ...defaultExerciseConfig, displayMode: 'vr_box', advanceMode: 'automatic' }} onExit={onExit}/>)
    expect(screen.getByRole('alert')).toHaveTextContent('el blanco está unido al celular y acompaña la cabeza')
    fireEvent.click(screen.getByRole('button', { name: 'Salir y avisar al profesional' }))
    expect(onExit).toHaveBeenCalledOnce()
  })
})
