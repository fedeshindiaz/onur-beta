import type { SourceRegion } from './types'

export const bapRecognitionRegions: SourceRegion[] = [
  // Panel izquierdo de resultados numéricos.
  { x: 0, y: .16, width: .31, height: .62 },
  // Gráficos de condiciones y organización sensorial. Incluye ambas variantes
  // de relación de aspecto observadas en BAP 2.32.
  { x: .63, y: .06, width: .37, height: .86 },
  // Pie con fecha, edad y estado.
  { x: .34, y: .82, width: .66, height: .18 },
]

export function binarizeBapDarkText(data: Uint8ClampedArray, threshold = 145) {
  for (let index = 0; index < data.length; index += 4) {
    const red = data[index]
    const green = data[index + 1]
    const blue = data[index + 2]
    const luminance = red * .299 + green * .587 + blue * .114
    // Los informes BAP dibujan texto oscuro sobre paneles celestes, verdes,
    // grises y rosados. El enmascarado elimina esos fondos sin borrar dígitos.
    const value = luminance < threshold ? 0 : 255
    data[index] = value
    data[index + 1] = value
    data[index + 2] = value
  }
}
