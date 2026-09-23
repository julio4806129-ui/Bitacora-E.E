#!/usr/bin/env python3
from pathlib import Path
import sys

p = Path(__file__).resolve().parent.parent / "frontend" / "src" / "pages" / "InventarioPage.jsx"
src = p.read_text(encoding="utf-8")

if "<BajaReactivarButtons item={r}" in src:
    print("OK: botones ya inyectados")
    sys.exit(0)

needle = '''                      <button 
                        onClick={() => { if (window.confirm("¿Eliminar bus " + r.bus_movil + " del inventario?")) delMut.mutate(r.id); }}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Eliminar móvil"
                      >
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    </div>
                  </td>'''

insert = '''                      <button 
                        onClick={() => { if (window.confirm("¿Eliminar bus " + r.bus_movil + " del inventario?")) delMut.mutate(r.id); }}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Eliminar móvil"
                      >
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                      <BajaReactivarButtons item={r} />
                    </div>
                  </td>'''

if needle not in src:
    print("ERROR: no se encontró el bloque de acciones TabFlota")
    sys.exit(1)

p.write_text(src.replace(needle, insert, 1), encoding="utf-8")
print("OK: BajaReactivarButtons inyectado en TabFlota")