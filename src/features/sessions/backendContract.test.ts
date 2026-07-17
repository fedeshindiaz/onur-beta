import { describe, expect, it } from 'vitest'
import migration from '../../../supabase/migrations/202607170002_supervised_in_person_sessions.sql?raw'

describe('contrato backend de sesiones presenciales supervisadas', () => {
  it('mantiene las funciones del paciente limitadas al modo domiciliario', () => {
    expect(migration).toContain('create or replace function public.start_session_assignment')
    expect(migration).toContain('create or replace function public.complete_session_assignment_v2')
    expect(migration.match(/coalesce\(plan\.plan_definition ->> 'mode', 'home'\) = 'home'/g)?.length).toBeGreaterThanOrEqual(2)
    expect(migration).toContain('drop policy if exists assignments_patient_select')
    expect(migration).toContain('public.can_patient_access_home_session_plan(session_plan_id)')
    expect(migration).toContain("execution_mode = 'home'")
  })

  it('exige rol profesional, propiedad y mode=in_person en inicio y cierre', () => {
    expect(migration).toContain('create or replace function public.start_supervised_in_person_session')
    expect(migration).toContain('create or replace function public.complete_supervised_in_person_session')
    expect(migration.match(/public\.is_professional\(\)/g)?.length).toBeGreaterThanOrEqual(3)
    expect(migration.match(/public\.owns_patient\(assignment_row\.patient_id\)/g)?.length).toBeGreaterThanOrEqual(3)
    expect(migration.match(/coalesce\(plan\.plan_definition ->> 'mode', 'home'\) = 'in_person'/g)?.length).toBeGreaterThanOrEqual(3)
  })

  it('registra operador, supervisión, reinicio, omisiones y auditoría', () => {
    expect(migration).toContain('one_open_supervised_execution_per_assignment')
    expect(migration).toContain("'restarted_from_beginning'")
    expect(migration).toContain("'supervised_in_person_session_started'")
    expect(migration).toContain("'supervised_in_person_session_restarted'")
    expect(migration).toContain("'supervised_in_person_session_finished'")
    expect(migration).toContain("'skipped_exercises', greatest(0, skipped_count_input)")
    expect(migration).toContain("'operated_by', auth.uid()")
    expect(migration).toContain("'supervised', true")
  })

  it('duplica en un plan y una asignación domiciliaria independientes', () => {
    expect(migration).toContain('create or replace function public.duplicate_in_person_assignment_as_home')
    expect(migration).toContain("jsonb_build_object('mode', 'home')")
    expect(migration).toContain("'session_assignment_duplicated_as_home'")
  })
})
