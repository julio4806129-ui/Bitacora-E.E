import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { 
  Menu, 
  LogOut, 
  Search, 
  Command,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import Sidebar from './Sidebar';
import CommandPalette from './CommandPalette';
import NotificationCenter from './NotificationCenter';
import SystemHealthModal from './SystemHealthModal';
import HealthStatus from './HealthStatus';
import { useAuth } from '../hooks/useAuth';

const SIDEBAR_KEY = 'bitacora.sidebarCollapsed';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const { user, logout, shiftCounter } = useAuth();

  const cuota = user?.cuota_diaria || user?.cuotaDiaria || 20;
  const pct = Math.min(Math.round((shiftCounter / cuota) * 100), 100);
  const isComplete = pct >= 100;

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

    return (
    <div className="flex h-screen bg-[#060a12] text-slate-100 overflow-hidden font-sans antialiased">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-200 ease-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${sidebarCollapsed ? 'w-[72px]' : 'w-64'}`}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onClose={() => setSidebarOpen(false)}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 flex items-center gap-2 px-3 sm:px-4 shrink-0 z-10
          bg-[#0a1220]/90 backdrop-blur-md border-b border-slate-800/50">
          <button
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            className="hidden lg:inline-flex p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80"
            onClick={() => setSidebarCollapsed((v) => !v)}
            title={sidebarCollapsed ? 'Expandir menú (Ctrl+B)' : 'Minimizar menú (Ctrl+B)'}
          >
            {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>

          <div className="lg:hidden flex items-center gap-2 min-w-0">
            <span className="text-sm font-bold text-white tracking-tight">Bitácora E.E.</span>
            <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded-md">
              V2
            </span>
          </div>

          <HealthStatus className="hidden md:inline-block" />

          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800
              border border-slate-800/80 hover:border-cyan-500/30 rounded-xl text-xs text-slate-400
              hover:text-slate-200 w-44 md:w-56 transition-all"
          >
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <span className="flex-1 text-left truncate">Buscar módulo o bus…</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono
              bg-slate-800 text-slate-500 rounded-md border border-slate-700">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>

          <div className="flex-1" />

          {/* Cuota turno */}
          <div className="hidden sm:flex items-center gap-2.5 px-2.5 py-1 rounded-xl bg-slate-900/60 border border-slate-800/60">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Cuota</span>
            <span className={`text-xs font-mono font-bold tabular-nums ${isComplete ? 'text-emerald-400' : 'text-cyan-300'}`}>
              {shiftCounter}/{cuota}
            </span>
            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isComplete
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                    : 'bg-gradient-to-r from-cyan-600 to-cyan-400'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <NotificationCenter />

          <div className="flex items-center gap-2 pl-2 ml-1 border-l border-slate-800/80">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700
              flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-cyan-900/40">
              {(user?.nombre || user?.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block min-w-0">
              <p className="text-xs font-semibold text-slate-100 truncate max-w-[120px]">
                {user?.nombre || user?.username || 'Técnico'}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {user?.isAdmin || user?.es_admin ? 'Admin' : `Cód. ${user?.codigo || user?.codigo_empleado || 'TEC'}`}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-[#060a12]">
          <div className="min-h-full p-3 sm:p-5 max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      <SystemHealthModal isOpen={healthModalOpen} onClose={() => setHealthModalOpen(false)} />
    </div>
  );
}
