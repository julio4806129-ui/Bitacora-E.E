import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  History,
  BarChart3,
  Cpu,
  Database,
  MapPin,
  Settings,
  Users,
  X,
  Bus,
  Radio,
  ShieldCheck,
  HardDrive,
  AlertOctagon,
  CalendarClock,
  ListOrdered,
  PanelLeftClose,
  PanelLeft,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import clsx from 'clsx';

export default function Sidebar({ onClose, collapsed = false, onToggleCollapse }) {
  const { isAdmin, user } = useAuth();

  const operationsNav = [
    { name: 'Inicio', to: '/', icon: LayoutDashboard, exact: true },
    { name: 'Bandeja', to: '/bitacora', icon: Radio },
    { name: 'Historial', to: '/historial', icon: History },
  ];

  const fleetNav = [
    { name: 'Flota', to: '/inventario', icon: Bus },
    { name: 'Equipos E.E.', to: '/inventario-equipos', icon: HardDrive },
    { name: 'EE Móviles', to: '/ee-moviles', icon: Cpu },
    { name: 'Planes PM', to: '/mantenimiento-predictivo', icon: CalendarClock },
    { name: 'Fuera de servicio', to: '/fuera-servicio', icon: AlertOctagon },
  ];

  const telemetryNav = [
    { name: 'BUSAE GPS', to: '/busae', icon: MapPin },
    { name: 'Genesis', to: '/genesis', icon: Database },
    { name: 'Reportes', to: '/reportes', icon: BarChart3 },
  ];

  const adminNav = [
    { name: 'Catálogo', to: '/catalogo-componentes', icon: ListOrdered },
    { name: 'Usuarios', to: '/usuarios', icon: Users },
    { name: 'Auditoría', to: '/auditoria', icon: ShieldCheck },
    { name: 'Configuración', to: '/configuracion', icon: Settings },
  ];

  const NavItem = ({ item }) => (
    <NavLink
      to={item.to}
      end={item.exact}
      onClick={onClose}
      title={collapsed ? item.name : undefined}
      className={({ isActive }) =>
        clsx(
          'group relative flex items-center rounded-xl mx-2 my-0.5 transition-all duration-150',
          collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2 text-[13px] font-medium',
          isActive
            ? 'bg-cyan-500/15 text-cyan-300 shadow-[inset_3px_0_0_0_#22d3ee]'
            : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
        )
      }
    >
      {({ isActive }) => (
        <>
          <item.icon
            className={clsx(
              'h-[18px] w-[18px] shrink-0 transition-colors',
              isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
            )}
          />
          {!collapsed && <span className="truncate flex-1 tracking-tight">{item.name}</span>}
        </>
      )}
    </NavLink>
  );

  const Section = ({ label, items }) => {
    if (!items?.length) return null;
    return (
      <div className="mb-1">
        {!collapsed && (
          <div className="px-4 pt-3 pb-1">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.12em]">
              {label}
            </p>
          </div>
        )}
        {collapsed && <div className="my-2 mx-3 border-t border-slate-800/80" />}
        {items.map((item) => (
          <NavItem key={item.to} item={item} />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#080e1c] border-r border-slate-800/60">
      {/* Brand */}
      <div
        className={clsx(
          'flex items-center border-b border-slate-800/60 shrink-0',
          collapsed ? 'flex-col gap-2 px-2 py-3' : 'justify-between px-3 py-3.5'
        )}
      >
        <div className={clsx('flex items-center min-w-0', collapsed ? 'justify-center' : 'gap-2.5')}>
          <div className="p-1.5 bg-white rounded-xl shrink-0 shadow-sm shadow-cyan-500/10">
            <img
              src="/logo-mibus.png"
              alt="MiBus"
              className="h-7 w-7 object-contain"
            />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white tracking-tight leading-tight">
                Bitácora E.E.
              </h1>
              <p className="text-[10px] font-semibold text-cyan-400/90 tracking-wide">
                V2 · MiBus Panamá
              </p>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="lg:hidden text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:inline-flex text-slate-500 hover:text-cyan-300 p-1.5 rounded-lg hover:bg-slate-800"
            title={collapsed ? 'Expandir (Ctrl+B)' : 'Minimizar (Ctrl+B)'}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* User chip */}
      {!collapsed && (
        <div className="mx-2.5 mt-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800/80 shrink-0">
          <p className="text-xs font-semibold text-slate-100 truncate">
            {user?.nombre || user?.username || 'Técnico'}
          </p>
          <p className="text-[10px] text-slate-500 truncate mt-0.5">
            {isAdmin ? 'Administrador' : `Cód. ${user?.codigo || user?.codigo_empleado || 'N/A'}`}
            {user?.patio_asignado ? ` · ${user.patio_asignado}` : ''}
          </p>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        <Section label="Operación" items={operationsNav} />
        {isAdmin && <Section label="Flota & Equipos" items={fleetNav} />}
        {isAdmin && <Section label="Telemetría" items={telemetryNav} />}
        {isAdmin && <Section label="Administración" items={adminNav} />}
      </nav>

      {!collapsed && (
        <div className="px-3 py-2.5 border-t border-slate-800/60 shrink-0">
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <Wrench className="h-3 w-3 text-cyan-500/70" />
            <span>Plataforma V2 · Operación 24/7</span>
          </div>
        </div>
      )}
    </div>
  );
}