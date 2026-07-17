import type { MetricSide, StudyType } from '../studies/types'

export type IntakeKind = 'posturography_bap' | 'vestibular_and_reports'
export type PageClassification = 'posturography' | 'vestibular_report' | 'vhit_graph' | 'referral' | 'other_clinical' | 'unrecognized'
export type ExtractionFieldStatus = 'read' | 'review' | 'unrecognized'
export type PatientMatchStatus = 'match' | 'mismatch' | 'not_checked' | 'confirmed_by_professional'

export interface SourceRegion { x: number; y: number; width: number; height: number }

export interface OcrLine {
  text: string
  confidence: number
  region: SourceRegion
}

export interface ExtractedPage {
  pageNumber: number
  proposedClassification: PageClassification
  classification: PageClassification
  classificationConfidence: number
  rotationDegrees: number
  width: number
  height: number
  previewUrl: string
  text: string
  lines: OcrLine[]
}

export interface ExtractionFieldDefinition {
  code: string
  label: string
  group: string
  studyType: StudyType
  required?: boolean
  metricCode?: string
  unitCode?: string
  side?: MetricSide
  conditionCode?: string
  aliases: string[]
}

export interface ExtractedField {
  clientId: string
  code: string
  label: string
  group: string
  studyType: StudyType
  required: boolean
  metricCode: string
  rawValue: string
  normalizedValue: string
  unitCode: string
  conditionCode: string
  side: MetricSide
  pageNumber: number
  region: SourceRegion | null
  confidence: number
  status: ExtractionFieldStatus
  extractorMethod: 'local_ocr' | 'embedded_pdf_text' | 'manual'
  extractorVersion: string
  professionalValue: string
  confirmed: boolean
}

export interface LocalExtractionDraft {
  intakeKind: IntakeKind
  extractorVersion: string
  pages: ExtractedPage[]
  fields: ExtractedField[]
  patientMatchStatus: PatientMatchStatus
  mismatchFields: string[]
}

export interface ExtractionProgress {
  currentPage: number
  totalPages: number
  phase: 'rendering' | 'ocr' | 'classifying' | 'done'
}

export interface PersistedExtractionDraft extends LocalExtractionDraft {
  id: string
  documentId: string
  studyIds: string[]
  status: 'review' | 'confirmed' | 'manual' | 'discarded'
}

export const pageClassificationLabels: Record<PageClassification, string> = {
  posturography: 'Posturografía',
  vestibular_report: 'Informe vestibular / vHIT',
  vhit_graph: 'Gráficos vHIT u oculomotores',
  referral: 'Orden o derivación',
  other_clinical: 'Otro documento clínico',
  unrecognized: 'No reconocido',
}
