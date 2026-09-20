import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  X, 
  Trash2, 
  ExternalLink,
  Radio,
  Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const INITIAL_NOTIFICATIONS = [
  {
    id: 'n1',
    title: 'Móvil sin transmisión GPS > 8h',
    description: 'Bus #1042 reportado sin coordenadas en Patio Curundú. Requiere revisión técnica.',
    type: 'critical',
    time: 'Hace 12 min',
    path: '/bitacora?search=1042',
    read: false
  },
  {
    id: 'n2',
    title: 'Sincronización BUSAE completada',
    description: 'La tarea en segundo plano sincronizó 1,420 móviles con coordenadas en vivo.',
    type: 'success',
    time: 'Hace 28 min',
    path: '/busae',
    read: false
  },
  {
    id: 'n3',
    title: 'Alerta de Firmware desactualizado',
    description: 'Detectados 8 buses con versión v2.1 en Patio La Cabima. Actualización recomendada.',
    type: 'warning',
    time: 'Hace 1 h',
    path: '/ee-moviles',
    read: false
  },
  {
    id: 'n4',
    title: 'Despacho Genesis detectado',
    description: 'Se registraron 34 turnos nuevos con entrada programada para el corte de las 08:00 AM.',
    type: 'info',
    time: 'Hace 2 h',
    path: '/genesis',
    read: true
  }
];

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const handleItemClick = (item) => {
    setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
    setIsOpen(false);
    if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all border border-transparent hover:border-slate-700/60"
        aria-label="Notificaciones"
        title="Centro de Alertas y Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-[#0b1329]"></span>
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#0b1329]/95 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 backdrop-blur-2xl z-50 overflow-hidden ring-1 ring-white/10 animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-[#070b14]/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide uppercase">Centro de Alertas</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full">
                  {unreadCount} nuevas
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                >
                  Marcar leídas
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                  title="Limpiar todo"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/40">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-slate-500">
                <CheckCircle2 className="h-7 w-7 text-emerald-500/60 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-300">No hay alertas activas</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Todos los sistemas de flota operan con normalidad</p>
              </div>
            ) : (
              notifications.map((item) => {
                let iconColor = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
                let Icon = Info;
                if (item.type === 'critical') {
                  iconColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
                  Icon = AlertTriangle;
                } else if (item.type === 'warning') {
                  iconColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                  Icon = AlertTriangle;
                } else if (item.type === 'success') {
                  iconColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                  Icon = CheckCircle2;
                }

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`p-3.5 transition-colors cursor-pointer flex gap-3 items-start ${
                      item.read ? 'hover:bg-slate-800/40 opacity-70' : 'bg-cyan-950/10 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className={`p-2 rounded-xl border shrink-0 ${iconColor}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className={`text-xs font-semibold truncate ${item.read ? 'text-slate-300' : 'text-white'}`}>
                          {item.title}
                        </p>
                        <span className="text-[10px] text-slate-500 shrink-0 font-mono flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {item.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-[#070b14]/90 border-t border-slate-800 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/bitacora');
              }}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <span>Ver Bitácora Técnica de Flota</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
