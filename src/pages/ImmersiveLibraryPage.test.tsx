import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ImmersiveLibraryPage } from './ImmersiveLibraryPage'

vi.mock('../features/immersive/ImmersivePanorama', () => ({
  ImmersivePanorama: ({ scenario }: { scenario: { title: string } }) => <div>Vista 360° {scenario.title}</div>,
}))

afterEach(cleanup)

describe('Biblioteca 360°', () => {
  it('expone el flujo de asignación, trazabilidad y escenarios pendientes', () => {
    render(<MemoryRouter><ImmersiveLibraryPage/></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Biblioteca 360°' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Asignar desde un paciente/i })).toHaveAttribute('href', '/app/pacientes')
    expect(screen.getByRole('link', { name: /Configurar ejercicio/i })).toHaveAttribute('href', '/app/ejercicios?scenario=street_quiet')
    expect(screen.getByText('Escenarios que requieren captura propia')).toBeInTheDocument()
    expect(screen.getByText('Supermercado con cámara fija')).toBeInTheDocument()
  })

  it('filtra por texto, intensidad y movimiento sin perder el detalle seleccionado', () => {
    render(<MemoryRouter><ImmersiveLibraryPage/></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('Buscar escenario'), { target: { value: 'metro' } })
    expect(screen.getByRole('button', { name: /Interior de transporte público/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Calle tranquila/i })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Filtrar intensidad'), { target: { value: '3' } })
    expect(screen.getByText('No hay escenarios que coincidan con esos filtros.')).toBeInTheDocument()
  })
})
