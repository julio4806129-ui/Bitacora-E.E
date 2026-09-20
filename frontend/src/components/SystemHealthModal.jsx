import React from 'react';
import { 
  Activity, 
  CheckCircle2, 
  Database, 
  Cpu, 
  Server, 
  Radio, 
  Clock, 
  ShieldCheck, 
  X,
  RefreshCw
} from 'lucide-react';

export default function SystemHealthModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const services = [
    {
      name: 'API Backend REST (Django 5)',
      status: 'Operativo',
      latency: '34 ms',
      detail: 'Endpoints de alta velocidad activos con JWT / CORS',
      icon: Server,
      color: 'emerald'
    },
    {
      name: 'Persistencia Híbrida (PostgreSQL / JSONB)',
      status: 'Conectado',
      latency: '12 ms',
      detail: 'Índices GIN activos en datos_dinamicos',
      icon: Database,
      color: 'emerald'
    },
    {
      name: 'Colas & Workers (Redis + Celery)',
      status: 'Activo',
      latency: '2 ms',
      detail: 'Broker de exportaciones y poller asíncrono en escucha',
      icon: Cpu,
      color: 'emerald'
    },
    {
      name: 'Gateway BUSAE GPS (Playwright Poller)',
      status: 'En Línea',
      latency: '142 ms',
      detail: 'Sincronización de coordenadas activas cada 5 minutos',
      icon: Radio,
      color: 'emerald'
    },
    {
      name: 'Gateway Genesis (Turnos & Patios)',
      status: 'En Línea',
      latency: '98 ms',
      detail: 'Integración de entrada/salida y patio de asignación',
      icon: Clock,
      color: 'emerald'
    }
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-[#0b1329]/95 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/90 overflow-hidden ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#070b14]/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Monitor de Salud del Sistema</h2>
              <p className="text-[11px] text-slate-400">Arquitectura de Alta Disponibilidad · MiBus Panamá</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body services list */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <p className="text-xs font-bold text-emerald-300">Todos los sistemas operativos</p>
                <p className="text-[10px] text-emerald-400/80 font-mono">Disponibilidad de plataforma: 99.98% SLA</p>
              </div>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/40">
              Nivel Enterprise
            </span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {services.map((srv, idx) => {
              const Icon = srv.icon;
              return (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-800 text-cyan-400 border border-slate-700/60">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">{srv.name}</p>
                      <p className="text-[10px] text-slate-400">{srv.detail}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{srv.status}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{srv.latency}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-[#070b14]/90 text-xs text-slate-400">
          <span className="font-mono text-[11px]">Corte de turno: 08:00 AM / 16:00 PM</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-cyan-600/20"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
