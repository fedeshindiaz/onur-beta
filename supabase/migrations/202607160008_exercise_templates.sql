-- Biblioteca profesional de configuraciones visuales reutilizables.

create table public.exercise_templates (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references auth.users (id),
  name text not null,
  config jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index exercise_templates_professional_name_idx
on public.exercise_templates (professional_id, name);

create trigger exercise_templates_set_updated_at before update on public.exercise_templates
for each row execute function public.set_updated_at();

alter table public.exercise_templates enable row level security;

create policy exercise_templates_professional_all on public.exercise_templates
for all to authenticated
using (professional_id = auth.uid() and public.is_professional())
with check (professional_id = auth.uid() and public.is_professional());

grant select, insert, update, delete on public.exercise_templates to authenticated;
