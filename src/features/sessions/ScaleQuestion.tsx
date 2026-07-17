export function ScaleQuestion({ label, hint, min, max, value, onChange }: { label: string; hint: string; min: number; max: number; value: number | null; onChange: (value: number) => void }) {
  return <fieldset className="rounded-3xl border border-[#d8e4e1] bg-white p-5">
    <legend className="px-1 text-base font-black text-[#123238]">{label}</legend>
    <p className="mt-1 text-xs leading-5 text-[#60777d]">{hint}</p>
    <div className={`mt-4 grid gap-2 ${max === 10 ? 'grid-cols-6 sm:grid-cols-11' : 'grid-cols-5'}`}>
      {Array.from({ length: max - min + 1 }, (_, index) => index + min).map((option) => <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)} className={`min-h-12 rounded-xl border text-base font-black transition ${value === option ? 'border-[#0b7a75] bg-[#0b7a75] text-white' : 'border-[#cfddda] bg-[#f8faf9] text-[#29474d] hover:border-[#74aaa4]'}`}>{option}</button>)}
    </div>
  </fieldset>
}
