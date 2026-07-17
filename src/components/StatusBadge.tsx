interface StatusBadgeProps {
  status: string
}

const labels: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  enabled: 'Habilitado',
  disabled: 'Deshabilitado',
  pending: 'Pendiente',
  assigned: 'Asignada',
  paused: 'Pausado',
  revoked: 'Revocada',
  completed: 'Completada',
  partial: 'Parcial',
  interrupted: 'Interrumpida',
  accepted: 'Aceptada',
  edited: 'Editada',
  discarded: 'Descartada',
  ok: 'Correcto',
  review: 'Revisar',
  quarantine: 'Cuarentena',
  blocked: 'Bloqueado',
  not_applicable: 'No aplica',
  draft: 'Borrador',
  reviewed: 'Revisado',
  finalized: 'Finalizado',
}

const tones: Record<string, string> = {
  active: 'bg-[#e6f5ee] text-[#27734c]',
  enabled: 'bg-[#e6f5ee] text-[#27734c]',
  completed: 'bg-[#e6f5ee] text-[#27734c]',
  accepted: 'bg-[#e6f5ee] text-[#27734c]',
  ok: 'bg-[#e6f5ee] text-[#27734c]',
  pending: 'bg-[#fff3d9] text-[#98620b]',
  assigned: 'bg-[#fff3d9] text-[#98620b]',
  paused: 'bg-[#eaf1f8] text-[#35658a]',
  revoked: 'bg-[#eef1f2] text-[#687a7e]',
  review: 'bg-[#fff3d9] text-[#98620b]',
  partial: 'bg-[#eaf1f8] text-[#35658a]',
  edited: 'bg-[#eaf1f8] text-[#35658a]',
  inactive: 'bg-[#eef1f2] text-[#687a7e]',
  disabled: 'bg-[#eef1f2] text-[#687a7e]',
  interrupted: 'bg-[#fceced] text-[#a94952]',
  discarded: 'bg-[#eef1f2] text-[#687a7e]',
  quarantine: 'bg-[#fceced] text-[#a94952]',
  blocked: 'bg-[#fceced] text-[#a94952]',
  not_applicable: 'bg-[#eef1f2] text-[#687a7e]',
  draft: 'bg-[#eef1f2] text-[#687a7e]',
  reviewed: 'bg-[#eaf1f8] text-[#35658a]',
  finalized: 'bg-[#e6f5ee] text-[#27734c]',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${tones[status] ?? tones.inactive}`}>
      {labels[status] ?? status}
    </span>
  )
}
