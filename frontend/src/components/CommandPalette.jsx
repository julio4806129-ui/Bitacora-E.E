import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  LayoutDashboard, 
  Radio, 
  Layers, 
  Cpu, 
  BarChart3, 
  History, 
  Database, 
  MapPin, 
  Users, 
  Settings, 
  Sliders, 
  Bus,
  ArrowRight,
  Sparkles,
  X
} from 'lucide-react';

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const baseItems = [
    { id: 'dashboard', title: 'Dashboard Ejecutivo', category: 'Navegación', icon: LayoutDashboard, path: '/' },
    { id: 'bitacora', title: 'Bitácora Técnica (Workstation)', category: 'Operaciones', icon: Radio, path: '/bitacora' },
    { id: 'ee-moviles', title: 'E.E. Móviles (Hardware Embarcado)', category: 'Hardware', icon: Cpu, path: '/ee-moviles' },
    { id: 'inventario', title: 'Inventario & Repuestos E.E.', category: 'Hardware', icon: Layers, path: '/inventario' },
    { id: 'reportes', title: 'Reportes & Analytics OLAP', category: 'Analítica', icon: BarChart3, path: '/reportes' },
    { id: 'historial', title: 'Historial de Revisiones', category: 'Operaciones', icon: History, path: '/historial' },
    { id: 'genesis', title: 'Datos Genesis (Turnos & Despachos)', category: 'Telemetría', icon: Database, path: '/genesis' },
    { id: 'busae', title: 'Datos BUSAE (GPS & Monitoreo)', category: 'Telemetría', icon: MapPin, path: '/busae' },
    { id: 'schema-editor', title: 'Schema Editor (Campos Dinámicos)', category: 'Administración', icon: Sliders, path: '/schema-editor' },
    { id: 'usuarios', title: 'Gestión de Usuarios & Cuotas', category: 'Administración', icon: Users, path: '/usuarios' },
    { id: 'configuracion', title: 'Configuración del Sistema', category: 'Administración', icon: Settings, path: '/configuracion' },
  ];

  // Dynamic search items if user inputs numbers (bus search)
  const isBusNumber = /^\d+$/.test(query.trim());
  const busQuery = query.trim();

  let filteredItems = baseItems.filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  if (isBusNumber && busQuery.length > 0) {
    filteredItems = [
      {
        id: `bus-bitacora-${busQuery}`,
        title: `Ver Bus #${busQuery} en Bitácora Técnica`,
        category: 'Búsqueda de Móvil',
        icon: Bus,
        path: `/bitacora?search=${busQuery}`
      },
      {
        id: `bus-ee-${busQuery}`,
        title: `Ver Equipamiento de Bus #${busQuery} en E.E. Móviles`,
        category: 'Búsqueda de Móvil',
        icon: Cpu,
        path: `/ee-moviles?search=${busQuery}`
      },
      {
        id: `bus-historial-${busQuery}`,
        title: `Historial de revisiones de Bus #${busQuery}`,
        category: 'Búsqueda de Móvil',
        icon: History,
        path: `/historial?search=${busQuery}`
      },
      ...filteredItems
    ];
  }

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        executeItem(filteredItems[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const executeItem = (item) => {
    onClose();
    navigate(item.path);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-md transition-all animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-[#0b1329]/95 border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/10 overflow-hidden flex flex-col backdrop-blur-2xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-[#070b14]/80">
          <Search className="h-5 w-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar módulo, acción o número de bus (ej. 1042)..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-medium"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="text-slate-500 hover:text-slate-300 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <span className="text-[10px] font-mono bg-slate-800/80 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
            ESC
          </span>
        </div>

        {/* Results list */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-800/40">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center">
              <Sparkles className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-medium">No se encontraron resultados para "{query}"</p>
              <p className="text-xs text-slate-500 mt-1">Prueba con "bitacora", "reportes", "inventario" o un número de bus</p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => executeItem(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                    isSelected 
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-cyan-200 border border-cyan-500/40 shadow-md shadow-cyan-500/10' 
                      : 'text-slate-300 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-cyan-500/30 text-cyan-300' : 'bg-slate-800 text-slate-400'}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{item.title}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{item.category}</p>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-1 text-cyan-400 text-xs font-semibold">
                      <span>Ir</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-800 bg-[#070b14]/90 text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 border border-slate-700">↑</kbd> <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 border border-slate-700">↓</kbd> Navegar</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 border border-slate-700">↵</kbd> Seleccionar</span>
          </div>
          <span className="text-[10px] text-cyan-400 font-mono">Bitácora E.E. Enterprise Command Engine</span>
        </div>
      </div>
    </div>
  );
}
