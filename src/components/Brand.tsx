import { Crosshair } from 'lucide-react'

interface BrandProps {
  compact?: boolean
  light?: boolean
}

export function Brand({ compact = false, light = false }: BrandProps) {
  return (
    <div className="flex items-center gap-3" aria-label="ONUr">
      <span
        className={`grid size-10 place-items-center rounded-2xl ${
          light ? 'bg-white/12 text-[#79ddd0]' : 'bg-[#123238] text-[#79ddd0]'
        }`}
      >
        <Crosshair aria-hidden="true" size={22} strokeWidth={2.3} />
      </span>
      {!compact && (
        <span>
          <span className={`block text-lg font-black tracking-tight ${light ? 'text-white' : 'text-[#123238]'}`}>
            ONUr
          </span>
          <span className={`block text-[10px] font-semibold uppercase tracking-[0.18em] ${light ? 'text-white/55' : 'text-[#668087]'}`}>
            Beta profesional
          </span>
        </span>
      )}
    </div>
  )
}
