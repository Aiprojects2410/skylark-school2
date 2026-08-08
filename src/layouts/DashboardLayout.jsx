import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, Bell, BookMarked, BookOpen, CalendarCheck, CalendarClock, CircleDollarSign, ClipboardList, GraduationCap, IdCard, LayoutDashboard, LogOut, Menu, Moon, QrCode, UserCheck, Search, Settings, Sun, Users, X, Ticket, Code2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { hasSupabase } from '../lib/supabase'
import BrandFooter from '../components/BrandFooter'
import FloatingSupport from '../components/FloatingSupport'

const NAV = [
  ['Dashboard', LayoutDashboard, '/', undefined],
  ['Developer Portal', Code2, '/super-admin/developer', ['super_admin']],
  ['Students', GraduationCap, '/students', ['super_admin', 'admin', 'principal']],
  ['Teachers', Users, '/teachers', ['super_admin', 'admin', 'principal']],
  ['Teacher Attendance', UserCheck, '/teacher-attendance', ['super_admin', 'admin', 'principal', 'teacher']],
  ['Classes', BookOpen, '/classes', ['super_admin', 'admin', 'principal']],
  ['Attendance', CalendarCheck, '/attendance', ['super_admin', 'admin', 'principal', 'teacher']],
  ['Identity & QR', IdCard, '/identity-cards', ['super_admin', 'admin', 'principal']],
  ['Scanner', QrCode, '/scanner', ['super_admin', 'admin', 'principal', 'teacher']],
  ['Timetable', CalendarClock, '/timetable', undefined],
  ['Homework', BookMarked, '/homework', undefined],
  ['Fees', CircleDollarSign, '/fees', ['super_admin', 'admin', 'principal', 'student']],
  ['Notice Board', Bell, '/notices', undefined],
  ['Leave', ClipboardList, '/leave', undefined],
  ['Reports', BarChart3, '/reports', ['super_admin', 'admin', 'principal']],
  ['Support Tickets', Ticket, '/support-tickets', ['super_admin', 'admin', 'principal']],
  ['Settings', Settings, '/settings', ['super_admin', 'admin', 'principal']],
]

function Avatar({ name }) { return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/10 font-bold text-brand">{(name || '?').split(' ').map(x => x[0]).slice(0, 2).join('')}</span> }

export default function DashboardLayout() {
  const [open, setOpen] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem('skylark-theme') === 'dark')
  const [notifOpen, setNotifOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { profile, role, signOut } = useAuth()
  const navigate = useNavigate()
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); localStorage.setItem('skylark-theme', dark ? 'dark' : 'light') }, [dark])
  const visibleNav = NAV.filter(([, , , roles]) => !roles || !role || roles.includes(role))
  async function handleLogout() { await signOut(); navigate('/login', { replace: true }) }
  return <div className="min-h-screen bg-[#f6f8fc] text-slate-700 dark:bg-slate-950 dark:text-slate-200">
    {open && <button aria-label="Close menu" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" />}
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="flex items-center gap-3 px-6 py-7"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-brand shadow-sm"><GraduationCap /></span><div><p className="font-bold leading-none text-white">Skylark</p><p className="mt-1 text-xs text-blue-200">SCHOOL ERP</p></div><button onClick={() => setOpen(false)} className="ml-auto text-white lg:hidden"><X /></button></div>
      <nav className="px-3">{visibleNav.map(([label, Icon, path]) => <NavLink key={label} to={path} end={path === '/'} onClick={() => setOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}><Icon size={19} /><span>{label}</span></NavLink>)}</nav>
      <div className="mx-5 mt-auto border-t border-white/10 py-5"><button onClick={handleLogout} className="nav-item w-full"><LogOut size={18} />Sign out</button></div>
    </aside>
    <div className="lg:ml-64">
      <header className="flex h-[76px] items-center gap-4 border-b border-slate-200/80 bg-white px-5 sm:px-8 dark:border-slate-800 dark:bg-slate-900">
        <button onClick={() => setOpen(true)} className="lg:hidden"><Menu /></button>
        <div className="hidden max-w-md flex-1 md:block"><label className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-400 dark:bg-slate-800"><Search size={17} /><input className="w-full bg-transparent outline-none" placeholder="Search anything..." /></label></div>
        <div className="ml-auto flex items-center gap-3"><span className={`hidden rounded-full px-3 py-1 text-xs font-semibold sm:inline ${hasSupabase ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{hasSupabase ? 'Connected' : 'Preview mode'}</span><button onClick={() => setDark(v => !v)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Toggle dark mode">{dark ? <Sun size={20} /> : <Moon size={20} />}</button>
          <div className="relative"><button onClick={() => setNotifOpen(v => !v)} className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Notifications"><Bell size={20} /><i className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" /></button>{notifOpen && <div className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-slate-100 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-900"><p className="px-2 pb-2 text-sm font-bold text-ink dark:text-white">Notifications</p><div className="space-y-1 text-sm"><p className="rounded-lg px-2 py-2">New notice: Term 1 examination timetable</p><p className="rounded-lg px-2 py-2">3 leave requests awaiting approval</p></div></div>}</div>
          <div className="relative"><button onClick={() => setMenuOpen(v => !v)} className="flex items-center gap-2"><Avatar name={profile?.full_name} /><div className="hidden text-left sm:block"><p className="text-sm font-bold text-ink dark:text-white">{profile?.full_name || 'Loading…'}</p><p className="text-xs capitalize text-slate-500 dark:text-slate-400">{role?.replace('_', ' ') || ''}</p></div></button>{menuOpen && <div className="absolute right-0 z-30 mt-2 w-60 rounded-xl border border-slate-100 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900"><button onClick={() => { setMenuOpen(false); navigate('/settings') }} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800">Settings</button>{role === 'super_admin' && <button onClick={() => { setMenuOpen(false); navigate('/super-admin/developer') }} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-brand hover:bg-slate-50 dark:hover:bg-slate-800">Developer Portal</button>}<button onClick={handleLogout} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">Sign out</button></div>}</div>
        </div>
      </header>
      <main className="p-5 sm:p-8"><Outlet /><BrandFooter /></main>
    </div>
    <FloatingSupport />
  </div>
}
