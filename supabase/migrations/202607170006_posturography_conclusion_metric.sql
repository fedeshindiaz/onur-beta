-- Métrica textual separada para no mezclar dominios en la revisión profesional.
insert into public.metric_definitions (code, version, domain, label, value_kind, allowed_units, requires_unit, requires_condition, zero_policy, status)
values ('posturography_conclusion_text', 1, 'posturography', 'Conclusión de posturografía transcripta', 'text', '{}', false, false, 'allowed', 'draft')
on conflict (code, version) do nothing;
