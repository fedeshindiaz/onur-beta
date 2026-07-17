import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string
  detail: string
  tone?: 'teal' | 'amber' | 'blue' | 'rose'
}

const tones = {
  teal: 'bg-[#e8f5f2] text-[#08746e]',
  amber: 'bg-[#fff3d9] text-[#9a6511]',
  blue: 'bg-[#eaf1f8] text-[#35658a]',
  rose: 'bg-[#fceced] text-[#ad4d55]',
}

export function StatCard({ icon: Icon, label, value, detail, tone = 'teal' }: StatCardProps) {
  return (
    <article className="rounded-3xl border border-[#dce7e5] bg-white p-5 shadow-[0_12px_30px_rgba(21,54,60,0.055)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#71878c]">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-[#123238]">{value}</p>
          <p className="mt-1 text-xs text-[#71878c]">{detail}</p>
        </div>
        <span className={`grid size-11 place-items-center rounded-2xl ${tones[tone]}`}>
          <Icon aria-hidden="true" size={20} />
        </span>
      </div>
    </article>
  )
}
