import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { api } from '../lib/api.js';

const NAV = [
  { to: '/', icon: HomeIcon, label: 'Dashboard' },
  { to: '/add', icon: PlusIcon, label: 'Ajouter' },
  { to: '/assets', icon: ChartBarIcon, label: 'Actifs' },
  { to: '/projection', icon: TrendingUpIcon, label: 'Projection' },
  { to: '/history', icon: ClockIcon, label: 'Historique' },
];

function useTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const toggle = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
  };
  return [dark, toggle];
}

export default function Layout({ children, onLogout }) {
  const [dark, toggleDark] = useTheme();
  const [showPwdModal, setShowPwdModal] = useState(false);
  const location = useLocation();

  async function handleLogout() {
    await api.auth.logout().catch(() => {});
    onLogout();
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-56 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shrink-0">
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-100 dark:border-gray-800">
          <div className="w-8 h-8 bg-ct rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0">TR</div>
          <div>
            <div className="text-sm font-semibold">Trade Republic</div>
            <div className="text-xs text-gray-400">Tracker</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 space-y-0.5">
          <button onClick={toggleDark} className="nav-link w-full text-left">
            {dark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
            {dark ? 'Mode clair' : 'Mode sombre'}
          </button>
          <button onClick={() => setShowPwdModal(true)} className="nav-link w-full text-left">
            <KeyIcon className="w-4 h-4" />
            Mot de passe
          </button>
          <button onClick={handleLogout} className="nav-link w-full text-left text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
            <LogoutIcon className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-ct rounded-md flex items-center justify-center text-white text-xs font-bold">TR</div>
            <span className="text-sm font-semibold">{NAV.find(n => n.to === location.pathname)?.label || 'Dashboard'}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleDark} className="btn-ghost p-2">
              {dark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
            </button>
            <button onClick={handleLogout} className="btn-ghost p-2 text-red-500">
              <LogoutIcon className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex z-40">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 gap-1 text-xs font-medium transition-colors ${isActive ? 'text-ct' : 'text-gray-400 dark:text-gray-500'}`
            }>
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {showPwdModal && <ChangePasswordModal onClose={() => setShowPwdModal(false)} />}
    </div>
  );
}

function ChangePasswordModal({ onClose }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.auth.changePassword(current, next);
      setSuccess(true);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={onClose} />
      <div className="relative card w-full max-w-sm z-10">
        <h2 className="font-semibold mb-4">Changer le mot de passe</h2>
        {success ? (
          <div className="text-sm text-emerald-600 dark:text-emerald-400">
            Mot de passe modifié.
            <button onClick={onClose} className="ml-2 underline">Fermer</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><label className="label">Mot de passe actuel</label><input type="password" className="input" value={current} onChange={e => setCurrent(e.target.value)} required /></div>
            <div><label className="label">Nouveau mot de passe</label><input type="password" className="input" value={next} onChange={e => setNext(e.target.value)} required /></div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="btn-ghost flex-1">Annuler</button>
              <button type="submit" className="btn-primary flex-1" disabled={loading}>{loading ? '…' : 'Confirmer'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// Inline SVG icons
function HomeIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>; }
function PlusIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>; }
function ChartBarIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>; }
function TrendingUpIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>; }
function ClockIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }
function SunIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1M4.22 4.22l.707.707m12.728 12.728l.707.707M1 12h1m20 0h1M4.22 19.78l.707-.707M18.364 5.636l.707-.707M12 5a7 7 0 100 14A7 7 0 0012 5z" /></svg>; }
function MoonIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>; }
function LogoutIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>; }
function KeyIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>; }
