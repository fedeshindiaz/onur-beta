import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultExerciseConfig, type ExerciseConfig } from '../exercise/types'
import { SessionExerciseEditor } from './SessionExerciseEditor'

vi.mock('../exercise/ExerciseCanvas', () => ({ ExerciseCanvas: () => <div>Vista visual</div> }))
vi.mock('../exercise/ExercisePlayer', () => ({ ExercisePlayer: () => <div>Reproductor</div> }))

afterEach(cleanup)

function EditorHarness() {
  const [config, setConfig] = useState<ExerciseConfig>(defaultExerciseConfig)
  return <SessionExerciseEditor config={config} isFirst onChange={setConfig}/>
}

describe('creación de ejercicios', () => {
  it('VR Box fuerza tiempo y avance automático sin controles externos', () => {
    render(<EditorHarness/>)
    fireEvent.change(screen.getByLabelText('Modo'), { target: { value: 'vr_box' } })

    expect(screen.getByRole('button', { name: 'Por repeticiones' })).toBeDisabled()
    expect(screen.getByLabelText('Avance')).toBeDisabled()
    expect(screen.getByLabelText('Avance')).toHaveValue('automatic')
    expect(screen.getByText(/No requiere botones, mirada ni controles externos/)).toBeInTheDocument()
  })

  it('Quest conserva dosis por tiempo o repeticiones desde el navegador', () => {
    render(<EditorHarness/>)
    fireEvent.change(screen.getByLabelText('Modo'), { target: { value: 'quest_browser' } })
    fireEvent.click(screen.getByRole('button', { name: 'Por repeticiones' }))

    expect(screen.getByRole('button', { name: 'Por repeticiones' })).not.toBeDisabled()
    expect(screen.getByLabelText('Avance')).not.toBeDisabled()
    expect(screen.getByLabelText('Avance')).toHaveValue('manual')
    expect(screen.getByLabelText(/Objetivo/)).toBeInTheDocument()
  })

  it('al elegir ejercicio físico muestra postura, superficie y supervisión', () => {
    render(<EditorHarness/>)
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'guided_physical' } })

    expect(screen.getByLabelText('Postura')).toBeInTheDocument()
    expect(screen.getByLabelText('Superficie')).toBeInTheDocument()
    expect(screen.getByLabelText('Supervisión')).toBeInTheDocument()
    expect(screen.queryByText('Fondo visual')).not.toBeInTheDocument()
  })

  it.each(['solid', 'bars', 'spiral', 'checkerboard', 'dots'])('permite seleccionar el fondo %s', (backgroundType) => {
    render(<EditorHarness/>)
    fireEvent.change(screen.getByLabelText('Fondo'), { target: { value: backgroundType } })
    expect(screen.getByLabelText('Fondo')).toHaveValue(backgroundType)
  })
})
