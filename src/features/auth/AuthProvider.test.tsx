import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider, useAuth } from './AuthProvider'

function AuthProbe() {
  const auth = useAuth()
  return <span>{auth.ready ? auth.role ?? 'sin-acceso' : 'verificando'}</span>
}

describe('AuthProvider', () => {
  beforeEach(() => localStorage.clear())

  it('elimina una sesión demo antigua y no la acepta como autenticación', async () => {
    localStorage.setItem('onur-demo-role', 'professional')
    render(<AuthProvider><AuthProbe /></AuthProvider>)

    await waitFor(() => expect(screen.getByText('sin-acceso')).toBeInTheDocument())
    expect(localStorage.getItem('onur-demo-role')).toBeNull()
  })
})
