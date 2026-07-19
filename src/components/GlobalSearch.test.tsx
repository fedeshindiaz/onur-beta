import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { GlobalSearch } from './GlobalSearch'

afterEach(cleanup)

function renderSearch() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter><GlobalSearch /></MemoryRouter></QueryClientProvider>)
}

describe('GlobalSearch', () => {
  it('busca pacientes y entrega un enlace real a la ficha', async () => {
    renderSearch()
    fireEvent.click(screen.getByRole('button', { name: 'Buscar en ONUr' }))
    const input = screen.getByRole('textbox', { name: 'Término de búsqueda' })
    fireEvent.change(input, { target: { value: 'Jorge' } })

    const patientLink = await screen.findByRole('link', { name: /Jorge Martínez/i })
    expect(patientLink).toHaveAttribute('href', '/app/pacientes/jorge-m')
  })

  it('abre con Ctrl+K, cierra con Escape y normaliza tildes', async () => {
    renderSearch()
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(screen.getByRole('dialog', { name: 'Buscar paciente o estudio' })).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: 'Término de búsqueda' }), { target: { value: 'Rodriguez' } })
    expect(await screen.findByRole('link', { name: /Marta Rodríguez/i })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
