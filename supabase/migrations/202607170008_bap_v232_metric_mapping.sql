-- Ajusta el diccionario a los campos y unidades que presenta BAP 2.3.2.
-- No altera estudios ni valores ya confirmados.

update public.metric_definitions
set allowed_units = array['deg']
where code in ('los_forward', 'los_backward', 'los_left', 'los_right');

update public.metric_definitions
set allowed_units = array['unknown'], label = 'Área BAP'
where code = 'los_area';

insert into public.metric_definitions (code, version, domain, label, value_kind, allowed_units, requires_unit, requires_condition, zero_policy, status)
values
  ('sway_per_second_x', 1, 'posturography', 'Sway/s X (anteroposterior)', 'numeric', array['oscillations_per_second'], true, false, 'allowed', 'draft'),
  ('sway_per_second_y', 1, 'posturography', 'Sway/s Y (lateral)', 'numeric', array['oscillations_per_second'], true, false, 'allowed', 'draft'),
  ('sway_per_minute_x', 1, 'posturography', 'Sway/m X (anteroposterior)', 'numeric', array['oscillations_per_minute'], true, false, 'allowed', 'draft'),
  ('sway_per_minute_y', 1, 'posturography', 'Sway/m Y (lateral)', 'numeric', array['oscillations_per_minute'], true, false, 'allowed', 'draft'),
  ('aphysiological_pattern', 1, 'posturography', 'Patrón afisiológico', 'numeric', array['percent'], true, false, 'unknown', 'draft')
on conflict (code, version) do nothing;
