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
    <div className="flex h-screen bg-[#070b14] text-slate-100 overflow-hidden font-sans antialiased">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-200 ease-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${sidebarCollapsed ? 'w-[68px]' : 'w-60'}`}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onClose={() => setSidebarOpen(false)}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#070b14]">
        <header className="bg-[#0b1329]/95 border-b border-slate-800/70 h-14 flex items-center px-3 sm:px-4 shrink-0 gap-2 z-10">
          <button
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            className="hidden lg:inline-flex p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80"
            onClick={() => setSidebarCollapsed((v) => !v)}
            title={sidebarCollapsed ? 'Expandir menú (Ctrl+B)' : 'Minimizar menú (Ctrl+B)'}
            aria-label="Minimizar menú"
          >
            {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>

          <span className="text-sm font-semibold text-slate-200 tracking-tight lg:hidden">
            Bitácora E.E.
          </span>

          <HealthStatus className="hidden md:inline-block" />

          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 rounded-lg text-xs text-slate-400 hover:text-slate-200 w-48 md:w-56"
          >
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <span className="flex-1 text-left truncate">Buscar…</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-500 rounded border border-slate-700">
              <Command className="h-2.5 w-2.5 inline" /> K
            </kbd>
          </button>

          <div className="flex-1" />

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span>Cuota</span>
            <span className={`font-mono tabular-nums ${isComplete ? 'text-emerald-400' : 'text-slate-200'}`}>
              {shiftCounter}/{cuota}
            </span>
            <div className="w-20 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${isComplete ? 'bg-emerald-500' : 'bg-cyan-600'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <NotificationCenter />

          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="h-7 w-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-200 text-xs font-semibold">
              {(user?.nombre || user?.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate max-w-[130px]">
                {user?.nombre || user?.username || 'Técnico'}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {user?.isAdmin || user?.es_admin ? 'Admin' : `Cód. ${user?.codigo || user?.codigo_empleado || 'TEC'}`}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-5 bg-[#070b14]">
          <Outlet />
        </main>
      </div>

      <CommandPalette 
        isOpen={commandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)} 
      />

      <SystemHealthModal
        isOpen={healthModalOpen}
        onClose={() => setHealthModalOpen(false)}
      />
    </div>
  );
}
