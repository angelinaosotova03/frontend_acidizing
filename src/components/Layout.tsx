import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Layers, FlaskConical, TrendingUp, Database, User, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const doLogout = async () => {
    try { await logout(); navigate('/login') }
    catch { toast.error('Ошибка при выходе') }
  }

  const navItems = [
    { to: '/',              icon: <Layers size={15}/>,     label: 'Дашборд' },
    { to: '/volumes',       icon: <FlaskConical size={15}/>,      label: 'Расчёт объёмов' },
    { to: '/predict',       icon: <TrendingUp size={15}/>, label: 'Прогноз эффекта' },
    { to: '/predict/batch', icon: <Database size={15}/>,   label: 'Батч‑прогноз' },
    { to: '/profile',       icon: <User size={15}/>,       label: 'Профиль' },
  ]

  const initial = (user?.username ?? '?')[0].toUpperCase()

  return (
    <div className="min-h-screen flex bg-ink-50">
      {/* Sidebar */}
      <aside className="hidden md:flex md:flex-col w-[232px] shrink-0 border-r border-ink-200 bg-white">
        <div className="px-4 py-4 border-b border-ink-200">
          <NavLink to="/" className="block"><BrandLogo /></NavLink>
        </div>
        <nav className="flex-1 p-3 space-y-5">
          <div>
            <div className="nav-section-title">Расчёты</div>
            <div className="space-y-0.5">
              {navItems.slice(0, 4).map(item => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  {item.icon} {item.label}
                </NavLink>
              ))}
            </div>
          </div>
          <div>
            <div className="nav-section-title">Аккаунт</div>
            <div className="space-y-0.5">
              <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <User size={15}/> Профиль
              </NavLink>
            </div>
          </div>
        </nav>
        <div className="px-3 pb-3 pt-2 border-t border-ink-200">
          <div className="px-3 py-2 rounded-md bg-ink-50 border border-ink-200/70">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center text-[12px] font-semibold">{initial}</div>
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-ink-900 truncate">{user?.username}</div>
                <div className="text-[11px] text-ink-500 truncate">{user?.email}</div>
              </div>
            </div>
            <button onClick={doLogout} className="mt-2 w-full text-left text-[12px] text-ink-500 hover:text-ink-900 flex items-center gap-1.5 px-1">
              <LogOut size={13}/> Выйти
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-ink-200 flex items-center justify-between px-4 h-12">
        <button onClick={() => setMenuOpen(o => !o)} className="text-ink-700 p-1.5 -ml-1.5"><Layers size={18}/></button>
        <BrandLogo />
        <button onClick={doLogout} className="text-ink-500 p-1.5 -mr-1.5"><LogOut size={16}/></button>
      </div>
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMenuOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-[260px] bg-white p-3" onClick={e => e.stopPropagation()}>
            <BrandLogo />
            <div className="mt-4 space-y-0.5">
              {navItems.map(item => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMenuOpen(false)}>
                  {item.icon} {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col md:ml-0 mt-12 md:mt-0">
        <TopHeader />
        <main className="flex-1 p-5 md:p-7 max-w-[1380px] w-full mx-auto">
          <div className="page-enter">{children}</div>
        </main>
        <footer className="px-5 md:px-7 py-3 text-[11px] text-ink-400 mono flex justify-between border-t border-ink-200 bg-white">
          <span>ОПЗ‑Моделирование · v1.5.0</span>
          <span>React 18 + TypeScript</span>
        </footer>
      </div>
    </div>
  )
}

function TopHeader() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const crumbs: Record<string, string[]> = {
    '/':             ['Дашборд'],
    '/volumes':      ['Расчёты', 'Расчёт объёмов'],
    '/predict':      ['Расчёты', 'Прогноз эффекта'],
    '/predict/batch':['Расчёты', 'Батч‑прогноз'],
    '/profile':      ['Аккаунт', 'Профиль'],
  }
  const parts = crumbs[pathname] ?? ['Страница']
  const initial = (user?.username ?? '?')[0].toUpperCase()

  return (
    <div className="hidden md:flex items-center justify-between px-7 h-12 border-b border-ink-200 bg-white">
      <div className="flex items-center gap-2 text-[12px]">
        {parts.map((c, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-ink-300">/</span>}
            <span className={i === parts.length - 1 ? 'text-ink-900 font-medium' : 'text-ink-500'}>{c}</span>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-[12px] text-ink-500">
          <span className="dot green" /><span className="mono">API · OK</span>
        </div>
        <div className="flex items-center gap-2 pl-4 border-l border-ink-200">
          <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center text-[11px] font-semibold">{initial}</div>
          <span className="text-[13px] text-ink-900 font-medium">{user?.username}</span>
        </div>
      </div>
    </div>
  )
}

export function BrandLogo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <div className="leading-tight">
      <div className={size === 'lg' ? 'text-base font-semibold tracking-tight text-ink-900' : 'text-[13px] font-semibold tracking-tight text-ink-900'}>
        ОПЗ‑Моделирование
      </div>
    </div>
  )
}
