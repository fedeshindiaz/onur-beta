insert into public.statistical_rules (
  code,
  version,
  title,
  domain,
  formula_definition,
  reference_definition,
  limitations,
  status
)
values
  ('DQ-001', 1, 'Campo obligatorio ausente', 'quality', '{"action":"block_interpretation"}', '{}', 'Regla técnica de completitud.', 'draft'),
  ('DQ-002', 1, 'Unidad desconocida', 'quality', '{"action":"block_comparison"}', '{}', 'Requiere unidad confirmada.', 'draft'),
  ('DQ-003', 1, 'Valor fuera de rango plausible', 'quality', '{"action":"quarantine"}', '{}', 'No corrige ni imputa el valor.', 'draft'),
  ('DQ-004', 1, 'Cero ambiguo', 'quality', '{"action":"request_review"}', '{}', 'Diferencia cero, ausente y no aplica.', 'draft'),
  ('DQ-005', 1, 'Protocolo incompatible', 'quality', '{"action":"block_comparison"}', '{}', 'Solo compara protocolos declarados compatibles.', 'draft'),
  ('LONG-001', 1, 'Cambio absoluto', 'longitudinal', '{"formula":"final - initial"}', '{}', 'No atribuye causalidad al tratamiento.', 'draft'),
  ('LONG-002', 1, 'Cambio porcentual', 'longitudinal', '{"formula":"(final - initial) / initial"}', '{}', 'No se ejecuta cuando el valor inicial es cero.', 'draft'),
  ('VOR-001', 1, 'Curva frecuencia-ganancia', 'vor', '{"output":"series"}', '{}', 'Salida descriptiva; no diagnóstica.', 'draft'),
  ('BAP-001', 1, 'Perfil de condiciones', 'posturography', '{"output":"condition_profile"}', '{}', 'Requiere protocolo aprobado y unidad explícita.', 'draft'),
  ('VPPB-001', 1, 'Resumen de episodio por canal y lado', 'vppb', '{"output":"episode_summary"}', '{}', 'No sugiere maniobras ni tratamiento.', 'draft'),
  ('PPPD-001', 1, 'Índice 3PD', 'pppd', '{"action":"none"}', '{}', 'Bloqueada por evidencia interna insuficiente.', 'blocked')
on conflict (code, version) do nothing;
