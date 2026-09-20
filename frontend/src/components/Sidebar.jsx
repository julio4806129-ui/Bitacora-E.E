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
  Sliders
} from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import clsx from 'clsx';

export default function Sidebar({ onClose, collapsed = false, onToggleCollapse }) {
  const { isAdmin, user } = useAuth();

  const operationsNav = [
    { name: 'Dashboard', to: '/', icon: LayoutDashboard, exact: true },
    { name: 'Bitácora', to: '/bitacora', icon: Radio },
    { name: 'Historial', to: '/historial', icon: History },
    { name: 'Fuera de servicio', to: '/fuera-servicio', icon: AlertOctagon },
  ];

  const fleetHardwareNav = [
    { name: 'Inventario equipos', to: '/inventario-equipos', icon: HardDrive },
    { name: 'Padrón de buses', to: '/inventario', icon: Bus },
    { name: 'Componentes', to: '/ee-moviles', icon: Cpu },
    { name: 'Mantenimiento', to: '/mantenimiento-predictivo', icon: CalendarClock },
  ];

  const telemetryNav = [
    { name: 'GPS BUSAE', to: '/busae', icon: MapPin },
    { name: 'Genesis', to: '/genesis', icon: Database },
    { name: 'Reportes', to: '/reportes', icon: BarChart3 },
  ];

  const adminNavigation = [
    { name: 'Catálogo', to: '/catalogo-componentes', icon: ListOrdered },
    { name: 'Tablas y formularios', to: '/schema-editor', icon: Sliders },
    { name: 'Usuarios', to: '/usuarios', icon: Users },
    { name: 'Configuración', to: '/configuracion', icon: Settings },
    { name: 'Auditoría', to: '/auditoria', icon: ShieldCheck },
  ];

  const NavItem = ({ item }) => (
    <NavLink
      to={item.to}
      end={item.exact}
      onClick={onClose}
      title={collapsed ? item.name : undefined}
      className={({ isActive }) =>
        clsx(
          'group flex items-center rounded-lg mx-2 my-0.5 transition-colors duration-150',
          collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2 text-xs font-medium',
          isActive
            ? 'bg-slate-800 text-cyan-300'
            : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
        )
      }
    >
      {({ isActive }) => (
        <>
          <item.icon
            className={clsx(
              'h-4 w-4 shrink-0',
              isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
            )}
          />
          {!collapsed && <span className="truncate flex-1">{item.name}</span>}
        </>
      )}
    </NavLink>
  );

  const Section = ({ label, items }) => (
    <div>
      {!collapsed && (
        <div className="px-4 mb-1 mt-3">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
            {label}
          </p>
        </div>
      )}
      {items.map((item) => (
        <NavItem key={item.to} item={item} />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#0b1329] border-r border-slate-800/80">
      <div className={clsx(
        'flex items-center border-b border-slate-800/80 shrink-0',
        collapsed ? 'flex-col gap-2 px-2 py-3' : 'justify-between px-3 py-3'
      )}>
        <div className={clsx('flex items-center min-w-0', collapsed ? 'justify-center' : 'gap-2.5')}>
          <div className="p-1 bg-white rounded-lg shrink-0">
            <img
              src="/logo-mibus.png"
              alt="MiBus"
              className={clsx('object-contain', collapsed ? 'h-7 w-7' : 'h-7 w-7')}
            />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-white truncate">Bitácora E.E.</h1>
              <p className="text-[10px] text-slate-500">MiBus · Telemetría</p>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="lg:hidden text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:inline-flex text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            title={collapsed ? 'Expandir menú' : 'Minimizar menú'}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="mx-2 mt-2 px-2.5 py-2 bg-slate-900/50 border border-slate-800/80 rounded-lg shrink-0">
          <p className="text-xs font-medium text-slate-200 truncate">
            {user?.nombre || user?.username || 'Técnico'}
          </p>
          <p className="text-[10px] text-slate-500 truncate">
            {isAdmin ? 'Administrador' : `Cód. ${user?.codigo || user?.codigo_empleado || 'N/A'}`}
            {user?.patio_asignado ? ` · ${user.patio_asignado}` : ''}
          </p>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto pt-2 pb-3">
        <Section label="Operaciones" items={operationsNav} />
        {isAdmin && <Section label="Flota" items={fleetHardwareNav} />}
        {isAdmin && <Section label="Telemetría" items={telemetryNav} />}
        {isAdmin && <Section label="Admin" items={adminNavigation} />}
      </nav>
    </div>
  );
}
