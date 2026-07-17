import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(join(process.cwd(), 'supabase/migrations/202607160009_structured_study_import.sql'), 'utf8')
const questionnaireMigration = readFileSync(join(process.cwd(), 'supabase/migrations/202607160010_perception_questionnaire_v2.sql'), 'utf8')
const documentRequestMigration = readFileSync(join(process.cwd(), 'supabase/migrations/202607160011_document_access_requests.sql'), 'utf8')
const studyFinalizationMigration = readFileSync(join(process.cwd(), 'supabase/migrations/202607160012_finalize_clinical_studies.sql'), 'utf8')

describe('contrato SQL de importación', () => {
  it('protege importaciones con RLS y propiedad del paciente', () => {
    expect(migration).toContain('alter table public.import_jobs enable row level security')
    expect(migration).toContain('public.owns_patient(study.patient_id)')
  })

  it('impide reemplazar estudios finalizados', () => {
    expect(migration).toContain("if study_record.status = 'finalized'")
  })

  it('audita confirmaciones y revisiones profesionales', () => {
    expect(migration).toContain("'study_import_confirmed'")
    expect(migration).toContain("'statistical_suggestion_reviewed'")
  })

  it('mantiene las funciones sensibles restringidas a authenticated', () => {
    expect(migration).toContain('revoke all on function public.replace_study_import')
    expect(migration).toContain('revoke all on function public.review_statistical_suggestion')
  })
})

describe('contrato SQL del cuestionario v2', () => {
  it('amplía el instrumento sin sobrescribir registros v1', () => {
    expect(questionnaireMigration).toContain("instrument_code set default 'ONUR_PERCEPCION_18'")
    expect(questionnaireMigration).toContain('instrument_version set default 2')
    expect(questionnaireMigration).toContain('total_score between 0 and 54')
    expect(questionnaireMigration).toContain('answered_count between 0 and 18')
  })

  it('diferencia respuestas aplicables y datos complementarios', () => {
    expect(questionnaireMigration).toContain('applicable_count')
    expect(questionnaireMigration).toContain('general_rating')
    expect(questionnaireMigration).toContain('falls_count')
    expect(questionnaireMigration).toContain('walking_aid_used')
  })
})

describe('contrato SQL de solicitudes de documentos', () => {
  it('expone al paciente un catálogo seguro mediante una función restringida', () => {
    expect(documentRequestMigration).toContain('create or replace function public.list_my_document_catalog()')
    expect(documentRequestMigration).toContain('security definer')
    expect(documentRequestMigration).toContain('revoke all on function public.list_my_document_catalog() from public')
    const returnContract=documentRequestMigration.slice(documentRequestMigration.indexOf('returns table ('),documentRequestMigration.indexOf(')\nlanguage sql'))
    expect(returnContract).not.toContain('storage_path')
  })

  it('valida propiedad, cuenta activa y decisión profesional', () => {
    expect(documentRequestMigration).toContain('public.is_patient_self(target_patient_id)')
    expect(documentRequestMigration).toContain('public.owns_patient(request.patient_id)')
    expect(documentRequestMigration).toContain('public.is_professional()')
  })

  it('audita solicitudes, decisiones, vistas y descargas', () => {
    expect(documentRequestMigration).toContain("'document_access_requested'")
    expect(documentRequestMigration).toContain("'document_access_approved'")
    expect(documentRequestMigration).toContain("'document_viewed'")
    expect(documentRequestMigration).toContain("'document_downloaded'")
  })
})

describe('contrato SQL de finalización de estudios', () => {
  it('calcula una huella SHA-256 y audita el cierre', () => {
    expect(studyFinalizationMigration).toContain('final_snapshot_sha256')
    expect(studyFinalizationMigration).toContain('extensions.digest')
    expect(studyFinalizationMigration).toContain("'clinical_study_finalized'")
  })

  it('bloquea cambios posteriores en estudio, métricas, incidencias e importación', () => {
    expect(studyFinalizationMigration).toContain('clinical_studies_protect_finalized')
    expect(studyFinalizationMigration).toContain('metric_values_reject_finalized_change')
    expect(studyFinalizationMigration).toContain('data_quality_issues_reject_finalized_change')
    expect(studyFinalizationMigration).toContain('import_jobs_reject_finalized_change')
    expect(studyFinalizationMigration).toContain('pg_advisory_xact_lock')
    expect(studyFinalizationMigration).toContain("auth.role() = 'service_role'")
  })

  it('restringe el cierre a un profesional propietario y a la función autorizada', () => {
    expect(studyFinalizationMigration).toContain('public.owns_patient(study.patient_id)')
    expect(studyFinalizationMigration).toContain('public.is_professional()')
    expect(studyFinalizationMigration).toContain('revoke all on function public.finalize_clinical_study(uuid) from public')
  })
})
