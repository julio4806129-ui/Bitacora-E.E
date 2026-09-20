import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function SortableTh({ label, column, sortKey, sortDir, onSort, className = '' }) {
  const active = sortKey === column;
  return (
    <th
      className={`cursor-pointer select-none hover:text-white ${className}`}
      onClick={() => onSort(column)}
      title={`Ordenar por ${label}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          sortDir === 'asc' ? <ChevronUp className="h-3 w-3 text-cyan-400" /> : <ChevronDown className="h-3 w-3 text-cyan-400" />
        ) : (
          <ChevronDown className="h-3 w-3 text-slate-600" />
        )}
      </span>
    </th>
  );
}
