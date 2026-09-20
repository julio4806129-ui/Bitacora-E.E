import React from 'react';

/**
 * PageHeader — Cabecera estándar premium para todas las páginas.
 *
 * Props:
 *   breadcrumb  {string}        — Subtítulo pequeño (ej. "GESTIÓN DE HARDWARE")
 *   icon        {LucideIcon}    — Ícono para el breadcrumb
 *   title       {string}        — Título principal de la página
 *   badge       {string}        — Badge opcional junto al título
 *   description {string}        — Descripción breve debajo del título
 *   children                   — Slot para botones de acción al lado derecho
 */
export default function PageHeader({ breadcrumb, icon: Icon, title, badge, description, children }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/70 pb-5 mb-6 animate-fadeIn">
      <div>
        {(breadcrumb || Icon) && (
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-[11px] font-bold uppercase tracking-widest mb-1.5">
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
            {breadcrumb && <span>{breadcrumb}</span>}
          </div>
        )}
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex flex-wrap items-center gap-3">
          <span>{title}</span>
          {badge && (
            <span className="text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full shadow-sm shadow-cyan-500/10">
              {badge}
            </span>
          )}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}
