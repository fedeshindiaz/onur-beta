import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string
  detail: string
  tone?: 'teal' | 'amber' | 'blue' | 'rose'
}

const tones = {
  teal: 'bg-[#EEF5F0] text-[#55745F]',
  amber: 'bg-[#FFF3D7] text-[#8A5B00]',
  blue: 'bg-[#F1EFEC] text-[#525252]',
  rose: 'bg-[#fceced] text-[#ad4d55]',
}

export function StatCard({ icon: Icon, label, value, detail, tone = 'teal' }: StatCardProps) {
  return (
    <article className="rounded-2xl border border-[#E2DED9] bg-white p-5 shadow-[0_6px_18px_rgba(23,23,23,0.025)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-[#747474]">{label}</p>
          <p className="mt-2 font-['Poppins'] text-[27px] font-semibold tracking-[-0.04em] text-[#171717]">{value}</p>
          <p className="mt-1 text-[10px] text-[#8B8782]">{detail}</p>
        </div>
        <span className={`grid size-9 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon aria-hidden="true" size={17} />
        </span>
      </div>
    </article>
  )
}
