import {
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  ChevronDown,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorPlay,
  Upload,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Brand } from './Brand'
import { useAuth } from '../features/auth/AuthProvider'

interface NavigationItem {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
}

const navigation: NavigationItem[] = [
  { label: 'Inicio', to: '/app', icon: LayoutDashboard, end: true },
  { label: 'Pacientes', to: '/app/pacientes', icon: Users },
  { label: 'Sesiones', to: '/app/sesiones', icon: MonitorPlay },
  { label: 'Ejercicios', to: '/app/ejercicios', icon: BrainCircuit },
  { label: 'Estudios', to: '/app/estudios', icon: Upload },
  { label: 'Sugerencias', to: '/app/sugerencias', icon: BookOpenCheck },
  { label: 'Evaluaciones', to: '/app/evaluaciones', icon: ClipboardList },
  { label: 'Informes', to: '/app/informes', icon: FileText },
  { label: 'Estadísticas', to: '/app/estadisticas', icon: BarChart3 },
]

export function ProfessionalShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const auth = useAuth()
  const initials = auth.displayName.split(/\s+/).filter(Boolean).slice(0,2).map((part)=>part[0]).join('').toUpperCase() || 'ON'

  const logout = async () => {
    await auth.signOut()
    navigate('/ingresar')
  }

  return (
    <div className="min-h-screen bg-[#f3f7f6]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[278px] flex-col bg-[#123238] px-4 py-5 text-white transition-transform lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-2">
          <Brand light />
          <button
            type="button"
            className="grid size-10 place-items-center rounded-xl text-white/70 hover:bg-white/10 lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="mt-8 space-y-1" aria-label="Navegación principal">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-bold transition ${
                  isActive
                    ? 'bg-[#79d8cd] text-[#123238] shadow-[0_8px_20px_rgba(0,0,0,0.13)]'
                    : 'text-white/68 hover:bg-white/8 hover:text-white'
                }`
              }
            >
              <item.icon aria-hidden="true" size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto rounded-3xl border border-white/10 bg-white/[0.055] p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#79d8cd]">Modo seguro</p>
          <p className="mt-2 text-xs leading-5 text-white/62">
            Demo sin datos clínicos reales. Las sugerencias requieren revisión profesional.
          </p>
        </div>
      </aside>

      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-[#061a1e]/45 lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-label="Cerrar menú"
        />
      )}

      <div className="lg:pl-[278px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#dce7e5] bg-white/90 px-4 backdrop-blur-xl sm:px-7">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="grid size-10 place-items-center rounded-xl border border-[#dce7e5] text-[#123238] lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu size={20} />
            </button>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0b7a75]">Espacio profesional</p>
              <p className="text-sm font-bold text-[#123238]">{auth.displayName || 'Profesional'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="hidden items-center gap-2 rounded-2xl border border-[#dce7e5] bg-white px-3 py-2 text-xs font-bold text-[#526a70] sm:flex"
            >
              {initials}
              <ChevronDown size={14} />
            </button>
            <button
              type="button"
              onClick={logout}
              className="grid size-10 place-items-center rounded-xl text-[#667d82] transition hover:bg-[#f0f5f4] hover:text-[#123238]"
              aria-label="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1480px] px-4 py-7 sm:px-7 lg:py-9">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
