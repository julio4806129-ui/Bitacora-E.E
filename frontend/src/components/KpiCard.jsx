import React from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

/**
 * KpiCard — Tarjeta KPI premium y reutilizable.
 *
 * Props:
 *   label      {string}       — Etiqueta del KPI
 *   value      {number|string}— Valor principal
 *   sub        {string}       — Descripción secundaria debajo del valor
 *   icon       {LucideIcon}   — Ícono decorativo
 *   color      {string}       — 'cyan' | 'emerald' | 'rose' | 'blue' | 'amber' | 'violet'
 *   loading    {boolean}      — Estado de carga
 *   trend      {string}       — Texto de tendencia (opcional)
 *   trendUp    {boolean}      — true=positivo, false=negativo
 *   onClick    {function}     — Acción al hacer click
 *   accent     {boolean}      — Agrega borde top de color
 */

const COLOR_MAP = {
  cyan:    { text: 'text-cyan-400',    border: 'border-cyan-500/30',    glow: 'shadow-cyan-500/10',    bg: 'bg-cyan-500/10',    bar: 'bg-cyan-400' },
  emerald: { text: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/10', bg: 'bg-emerald-500/10', bar: 'bg-emerald-400' },
  rose:    { text: 'text-rose-400',    border: 'border-rose-500/30',    glow: 'shadow-rose-500/10',    bg: 'bg-rose-500/10',    bar: 'bg-rose-400' },
  blue:    { text: 'text-blue-400',    border: 'border-blue-500/30',    glow: 'shadow-blue-500/10',    bg: 'bg-blue-500/10',    bar: 'bg-blue-400' },
  amber:   { text: 'text-amber-400',   border: 'border-amber-500/30',   glow: 'shadow-amber-500/10',   bg: 'bg-amber-500/10',   bar: 'bg-amber-400' },
  violet:  { text: 'text-violet-400',  border: 'border-violet-500/30',  glow: 'shadow-violet-500/10',  bg: 'bg-violet-500/10',  bar: 'bg-violet-400' },
  slate:   { text: 'text-slate-400',   border: 'border-slate-700',      glow: '',                      bg: 'bg-slate-700/20',   bar: 'bg-slate-500' },
};

export default function KpiCard({ label, value, sub, icon: Icon, color = 'cyan', loading, trend, trendUp = true, onClick, accent = false }) {
  const c = COLOR_MAP[color] || COLOR_MAP.cyan;

  return (
    <div
      onClick={onClick}
      className={clsx(
        'relative bg-[#0b1329]/90 backdrop-blur-xl rounded-2xl border p-4 sm:p-5',
        'flex flex-col justify-between gap-3',
        'shadow-xl ring-1 ring-white/5',
        'transition-all duration-300',
        'hover:shadow-2xl hover:-translate-y-0.5',
        c.border,
        onClick && 'cursor-pointer',
        accent && 'overflow-hidden'
      )}
    >
      {/* Accent top bar */}
      {accent && (
        <div className={clsx('absolute top-0 inset-x-0 h-0.5 rounded-t-2xl opacity-70', c.bar)} />
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">
            {label}
          </p>
        </div>
        {Icon && (
          <div className={clsx('p-2 rounded-xl shrink-0', c.bg)}>
            <Icon className={clsx('h-4 w-4', c.text)} />
          </div>
        )}
      </div>

      {/* Value */}
      <div>
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        ) : (
          <p className={clsx('text-2xl sm:text-3xl font-black tabular-nums tracking-tight', c.text)}>
            {value ?? '—'}
          </p>
        )}
        {sub && (
          <p className="text-[10px] sm:text-xs text-slate-500 mt-1 leading-tight">
            {sub}
          </p>
        )}
      </div>

      {/* Trend badge */}
      {trend && !loading && (
        <div className={clsx(
          'inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border self-start',
          trendUp
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        )}>
          {trendUp ? '▲' : '▼'} {trend}
        </div>
      )}
    </div>
  );
}
