import React, { useState, useEffect } from 'react';
import { format, subDays, subMonths, subYears, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

export default function DateRangePicker({ onChange }) {
  const today = new Date();
  
  const [fechaInicio, setFechaInicio] = useState(format(subDays(today, 7), 'yyyy-MM-dd'));
  const [fechaFin, setFechaFin] = useState(format(today, 'yyyy-MM-dd'));
  const [agrupacion, setAgrupacion] = useState('Diario');

  const agrupacionMap = {
    'Diario': 'day',
    'Semanal': 'week',
    'Mensual': 'month',
    'Anual': 'year',
  };

  useEffect(() => {
    if (onChange) {
      onChange({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        fechaInicio,
        fechaFin,
        agrupacion: agrupacionMap[agrupacion] || 'day',
        agrupacionLabel: agrupacion,
      });
    }
  }, [fechaInicio, fechaFin, agrupacion]);

  const handlePreset = (preset) => {
    let start = today;
    let end = today;

    switch (preset) {
      case 'Hoy':
        break;
      case 'Última Semana':
        start = subDays(today, 7);
        break;
      case 'Último Mes':
        start = subMonths(today, 1);
        break;
      case 'Último Trimestre':
        start = subMonths(today, 3);
        break;
      case 'Último Año':
        start = subYears(today, 1);
        break;
      default:
        break;
    }

    setFechaInicio(format(start, 'yyyy-MM-dd'));
    setFechaFin(format(end, 'yyyy-MM-dd'));
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-col sm:flex-row flex-wrap gap-4 items-end">
      <div className="flex-1 min-w-[200px]">
        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
        <input
          type="date"
          value={fechaInicio}
          onChange={(e) => setFechaInicio(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        />
      </div>
      <div className="flex-1 min-w-[200px]">
        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
        <input
          type="date"
          value={fechaFin}
          onChange={(e) => setFechaFin(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        />
      </div>
      <div className="flex-1 min-w-[150px]">
        <label className="block text-sm font-medium text-gray-700 mb-1">Agrupación</label>
        <select
          value={agrupacion}
          onChange={(e) => setAgrupacion(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        >
          <option>Diario</option>
          <option>Semanal</option>
          <option>Mensual</option>
          <option>Anual</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-2 w-full mt-2">
        {['Hoy', 'Última Semana', 'Último Mes', 'Último Trimestre', 'Último Año'].map(preset => (
          <button
            key={preset}
            type="button"
            onClick={() => handlePreset(preset)}
            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            {preset}
          </button>
        ))}
      </div>
    </div>
  );
}
