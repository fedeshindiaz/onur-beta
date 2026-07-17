-- Endurece la resolución de identidad y mantiene las páginas de secciones ya creadas.

create or replace function public.protect_extraction_patient_match()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.patient_match_status = 'mismatch'
     and new.patient_match_status not in ('mismatch', 'confirmed_by_professional') then
    raise exception 'La discrepancia solo puede resolverse mediante confirmación profesional explícita.';
  end if;
  if new.patient_match_status = 'confirmed_by_professional' and auth.uid() is null then
    raise exception 'Se requiere un profesional autenticado.';
  end if;
  return new;
end;
$$;

create trigger extraction_jobs_protect_patient_match
before update of patient_match_status on public.document_extraction_jobs
for each row execute function public.protect_extraction_patient_match();

create or replace function public.sync_extraction_section_pages()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.study_extraction_sections section
  set page_numbers = coalesce((
    select array_agg(page.page_number order by page.page_number)
    from public.document_extraction_pages page
    where page.job_id = new.job_id and page.classification = 'posturography'
  ), '{}')
  where section.job_id = new.job_id and section.study_type = 'posturography';

  update public.study_extraction_sections section
  set page_numbers = coalesce((
    select array_agg(page.page_number order by page.page_number)
    from public.document_extraction_pages page
    where page.job_id = new.job_id and page.classification in ('vestibular_report', 'vhit_graph', 'referral', 'other_clinical')
  ), '{}')
  where section.job_id = new.job_id and section.study_type = 'vhit';
  return new;
end;
$$;

create trigger extraction_pages_sync_sections
after update of classification on public.document_extraction_pages
for each row when (old.classification is distinct from new.classification)
execute function public.sync_extraction_section_pages();

revoke all on function public.protect_extraction_patient_match() from public;
revoke all on function public.sync_extraction_section_pages() from public;
