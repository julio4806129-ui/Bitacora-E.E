import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import apiClient from '../api/client';

export default function ExportButton({ tipoReporte, parametros, label = 'Exportar' }) {
  const [isExporting, setIsExporting] = useState(false);
  const [formato, setFormato] = useState('EXCEL');

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Initiate export
      const { task_id } = await apiClient.post('/reportes/exportar/', {
        tipo: tipoReporte,
        formato,
        parametros
      });

      // Poll status
      let finalUrl = null;
      while (true) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const statusData = await apiClient.get(`/reportes/exportar/estado/${task_id}/`);
        
        if (statusData.estado === 'COMPLETADO') {
          finalUrl = statusData.url;
          break;
        } else if (statusData.estado === 'ERROR') {
          throw new Error(statusData.error || 'Error en la exportación');
        }
      }

      if (finalUrl) {
        // Trigger download
        const a = document.createElement('a');
        a.href = finalUrl;
        a.download = '';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

    } catch (error) {
      console.error('Export failed:', error);
      alert('Error al exportar. Por favor, intente nuevamente.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <select
        value={formato}
        onChange={(e) => setFormato(e.target.value)}
        disabled={isExporting}
        className="block rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm h-[38px]"
      >
        <option value="EXCEL">Excel</option>
        <option value="CSV">CSV</option>
        <option value="PDF">PDF</option>
      </select>
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 h-[38px]"
      >
        {isExporting ? (
          <Loader2 className="animate-spin h-4 w-4 mr-2" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        {label}
      </button>
    </div>
  );
}
