import type { SourceRegion } from './types'

// Zona habitual de resumen y conducta en los informes vestibulares escaneados.
// La lectura adicional como bloque conserva renglones que el OCR disperso corta.
export const clinicalReportSummaryRegion: SourceRegion = { x: .08, y: .62, width: .84, height: .22 }
