interface BrandProps {
  compact?: boolean
  light?: boolean
}

export function Brand({ compact = false, light = false }: BrandProps) {
  const ink = light ? 'text-white' : 'text-[#171717]'
  const muted = light ? 'text-white/55' : 'text-[#747474]'

  return (
    <div className="flex items-center gap-3" aria-label="Otoneuro Uruguay, ONUr Beta">
      <span className="relative grid size-10 shrink-0 place-items-center rounded-xl border border-[#E9E7E7] bg-white" aria-hidden="true">
        <span className="absolute h-[2px] w-5 rounded-full bg-[#171717]" />
        <span className="absolute h-5 w-[2px] rounded-full bg-[#171717]" />
        <span className="relative size-2.5 rounded-full bg-[#E49A02] ring-4 ring-white" />
      </span>
      {!compact && (
        <div className="flex min-w-0 items-center gap-3">
          <span className="leading-none">
            <span className={`block font-['Poppins'] text-[13px] font-semibold tracking-[-0.02em] ${ink}`}>
              Otoneuro
            </span>
            <span className={`mt-1 block text-[8px] font-bold uppercase tracking-[0.24em] ${muted}`}>
              Uruguay
            </span>
          </span>
          <span className={`h-7 w-px ${light ? 'bg-white/20' : 'bg-[#E9E7E7]'}`} />
          <span className="leading-none">
            <span className={`block font-['Poppins'] text-[13px] font-semibold ${ink}`}>ONUr</span>
            <span className="mt-1 block text-[8px] font-bold uppercase tracking-[0.18em] text-[#A36B00]">Beta</span>
          </span>
        </div>
      )}
    </div>
  )
}
