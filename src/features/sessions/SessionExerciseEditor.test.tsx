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

  it.each(['gaze_stabilization_x2', 'gaze_substitution_remembered'])('mantiene %s fuera de visores sin referencia espacial', (purpose) => {
    render(<EditorHarness/>)
    fireEvent.change(screen.getByLabelText('Objetivo del ejercicio'), { target: { value: purpose } })
    expect(screen.getByRole('option', { name: /VR Box/ })).toBeDisabled()
    expect(screen.getByRole('option', { name: /Meta Quest/ })).toBeDisabled()
  })

  it('ofrece modo Libre con advertencia y conserva combinaciones arbitrarias', () => {
    render(<EditorHarness/>)
    fireEvent.change(screen.getByLabelText('Objetivo del ejercicio'), { target: { value: 'custom_free' } })
    fireEvent.change(screen.getByLabelText('Fondo'), { target: { value: 'spiral' } })
    fireEvent.change(screen.getByLabelText('Comportamiento'), { target: { value: 'saccades' } })
    expect(screen.getByText('Configuración Libre · sin validación clínica')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /VR Box/ })).not.toBeDisabled()
    expect(screen.getByLabelText('Fondo')).toHaveValue('spiral')
    expect(screen.getByLabelText('Comportamiento')).toHaveValue('saccades')
  })

  it('ofrece diagonales para pelota y barras, pero no para la espiral', () => {
    render(<EditorHarness/>)
    fireEvent.change(screen.getByLabelText('Objetivo del ejercicio'), { target: { value: 'custom_free' } })
    fireEvent.change(screen.getByLabelText('Fondo'), { target: { value: 'bars' } })
    fireEvent.change(screen.getByLabelText('Dirección'), { target: { value: 'up_right' } })
    fireEvent.change(screen.getByLabelText('Comportamiento'), { target: { value: 'tracking' } })
    const directions = screen.getAllByLabelText('Dirección')
    fireEvent.change(directions[1], { target: { value: 'diagonal_up' } })
    expect(directions[0]).toHaveValue('up_right')
    expect(directions[1]).toHaveValue('diagonal_up')

    fireEvent.change(screen.getByLabelText('Fondo'), { target: { value: 'spiral' } })
    expect(screen.getAllByLabelText('Dirección')[0]).toHaveValue('clockwise')
    expect(screen.queryByRole('option', { name: 'Diagonal ↗' })).not.toBeInTheDocument()
  })

  it.each(['solid', 'bars', 'spiral', 'checkerboard', 'dots'])('permite seleccionar el fondo %s', (backgroundType) => {
    render(<EditorHarness/>)
    fireEvent.change(screen.getByLabelText('Fondo'), { target: { value: backgroundType } })
    expect(screen.getByLabelText('Fondo')).toHaveValue(backgroundType)
  })

  it.each([
    ['rare_target', /Contá mentalmente cuántas veces/],
    ['go_no_go', /Decí “sí” solamente/],
    ['short_memory', /Decí “igual” solamente/],
  ])('configura %s con consigna previa, tiempo y confirmación manual', (mode, instruction) => {
    render(<EditorHarness/>)
    fireEvent.change(screen.getByLabelText('Tipo de tarea cognitiva'), { target: { value: mode } })
    expect(screen.getAllByText(instruction).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: 'Por repeticiones' })).toBeDisabled()
    expect(screen.getByLabelText('Avance')).toBeDisabled()
    expect(screen.getByLabelText('Avance')).toHaveValue('manual')
    expect(screen.getByRole('option', { name: /VR Box/ })).toBeDisabled()
  })

  it('habilita respuesta táctil en tarea cognitiva aislada pero no durante RVO', () => {
    render(<EditorHarness/>)
    fireEvent.change(screen.getByLabelText('Tipo de tarea cognitiva'), { target: { value: 'go_no_go' } })
    expect(screen.getByRole('option', { name: 'Tocar botón en pantalla' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Objetivo del ejercicio'), { target: { value: 'cognitive_visual' } })
    expect(screen.getByRole('option', { name: 'Tocar botón en pantalla' })).not.toBeDisabled()
  })
})
