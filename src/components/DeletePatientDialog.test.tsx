import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DeletePatientDialog } from './DeletePatientDialog'

describe('DeletePatientDialog', () => {
  it('exige la confirmación escrita antes de eliminar', () => {
    const onConfirm = vi.fn()
    render(
      <DeletePatientDialog
        patientName="Paciente de prueba"
        isPending={false}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    )

    const deleteButton = screen.getByRole('button', { name: /Eliminar definitivamente/i })
    expect(deleteButton).toBeDisabled()

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ELIMINAR' } })
    expect(deleteButton).toBeEnabled()

    fireEvent.click(deleteButton)
    expect(onConfirm).toHaveBeenCalledOnce()
  })
})
