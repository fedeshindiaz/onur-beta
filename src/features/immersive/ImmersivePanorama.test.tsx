import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { immersiveScenarios } from './catalog'
import { ImmersivePanorama } from './ImmersivePanorama'

afterEach(cleanup)

describe('previsualización panorámica optimizada', () => {
  it('no crea WebGL ni descarga el medio clínico antes de una acción explícita', () => {
    const scenario = immersiveScenarios.find((item) => item.mediaKind === 'video')!
    const { container } = render(<div style={{ width: 360, height: 203 }}><ImmersivePanorama scenario={scenario}/></div>)

    expect(screen.getByRole('button', { name: `Cargar vista previa 360° de ${scenario.title}` })).toBeInTheDocument()
    expect(screen.getByText(/Carga bajo demanda/)).toBeInTheDocument()
    expect(container.querySelector('canvas')).toBeNull()
    expect(container.querySelector('video')).toBeNull()
    expect(container.querySelector('img')).toHaveAttribute('loading', 'lazy')
  })
})
