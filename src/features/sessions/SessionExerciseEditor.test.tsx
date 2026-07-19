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
    fireEvent.change(screen.getByLabelText('Objetivo del ejercicio'), { target: { value: 'optokinetic' } })
    fireEvent.change(screen.getByLabelText('Modo'), { target: { value: 'vr_box' } })

    expect(screen.getByRole('button', { name: 'Por repeticiones' })).toBeDisabled()
    expect(screen.getByLabelText('Avance')).toBeDisabled()
    expect(screen.getByLabelText('Avance')).toHaveValue('automatic')
    expect(screen.getByText(/No usa botones, mirada ni controles externos/)).toBeInTheDocument()
    expect(screen.getByText('Configuración coherente')).toBeInTheDocument()
  })

  it('Quest conserva dosis por tiempo o repeticiones desde el navegador', () => {
    render(<EditorHarness/>)
    fireEvent.change(screen.getByLabelText('Objetivo del ejercicio'), { target: { value: 'saccades' } })
    fireEvent.change(screen.getByLabelText('Modo'), { target: { value: 'quest_browser' } })
    fireEvent.click(screen.getByRole('button', { name: 'Por repeticiones' }))

    expect(screen.getByRole('button', { name: 'Por repeticiones' })).not.toBeDisabled()
    expect(screen.getByLabelText('Avance')).not.toBeDisabled()
    expect(screen.getByLabelText('Avance')).toHaveValue('manual')
    expect(screen.getByRole('spinbutton', { name: /Objetivo/ })).toBeInTheDocument()
  })

  it('al elegir ejercicio físico muestra postura, superficie y supervisión', () => {
    render(<EditorHarness/>)
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'guided_physical' } })

    expect(screen.getByLabelText('Postura')).toBeInTheDocument()
    expect(screen.getByLabelText('Superficie')).toBeInTheDocument()
    expect(screen.getByLabelText('Supervisión')).toBeInTheDocument()
    expect(screen.queryByText('Fondo visual')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Modo')).toHaveValue('standard')
  })

  it('no ofrece RVO x1 ni tareas físicas dentro de visores', () => {
    render(<EditorHarness/>)
    expect(screen.getByRole('option', { name: /VR Box/ })).toBeDisabled()
    expect(screen.getByRole('option', { name: /Meta Quest/ })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'guided_physical' } })
    expect(screen.getByRole('option', { name: /VR Box/ })).toBeDisabled()
    expect(screen.getByRole('option', { name: /Meta Quest/ })).toBeDisabled()
  })

  it.each(['solid', 'bars', 'spiral', 'checkerboard', 'dots'])('permite seleccionar el fondo %s', (backgroundType) => {
    render(<EditorHarness/>)
    fireEvent.change(screen.getByLabelText('Fondo'), { target: { value: backgroundType } })
    expect(screen.getByLabelText('Fondo')).toHaveValue(backgroundType)
  })
})
