import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LoginPage } from './LoginPage'
import { AuthProvider } from '../features/auth/AuthProvider'

describe('LoginPage', () => {
  it('presenta ambos tipos de acceso y aclara el modo demo', () => {
    render(
      <MemoryRouter>
        <AuthProvider><LoginPage /></AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Ingresar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Profesional/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Paciente/i })).toBeInTheDocument()
    expect(screen.getByText(/modo demo/i)).toBeInTheDocument()
  })
})
