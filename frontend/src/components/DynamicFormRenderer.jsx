import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import apiClient from '../api/client';
import clsx from 'clsx';
import { AlertCircle, Check, Upload, Calendar, Hash, AlignLeft, List, CheckSquare } from 'lucide-react';

export default function DynamicFormRenderer({ 
  moduleName, 
  initialData = {}, 
  onSubmit, 
  isLoading = false, 
  defaultValues = {},
  isReadOnly = false,
  customCampos = null // If provided directly (e.g. preview mode in Schema Editor)
}) {
  const { data: fetchedCampos, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['campos-configuracion', moduleName],
    queryFn: async () => {
      const res = await apiClient.get(`/campos-configuracion/?modulo__nombre=${moduleName}&activo=true`);
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      if (res && Array.isArray(res.results)) return res.results;
      return [];
    },
    enabled: !customCampos && !!moduleName
  });

  const configCampos = customCampos || fetchedCampos || [];

  const schema = useMemo(() => {
    if (!configCampos || !configCampos.length) return z.object({});
    
    const shape = {};
    configCampos.forEach((campo) => {
      let fieldSchema;
      const validaciones = campo.validaciones || {};

      switch (campo.tipo) {
        case 'NUMBER':
          if (!campo.requerido) {
            fieldSchema = z.preprocess(
              (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
              z.number().optional()
            );
          } else {
            fieldSchema = z.preprocess(
              (val) => (val === '' || val === null || val === undefined ? NaN : Number(val)),
              z.number({ invalid_type_error: 'Debe ser un número válido' })
            );
          }
          if (validaciones.min !== undefined) fieldSchema = fieldSchema.refine(val => val === undefined || val >= validaciones.min, { message: `Mínimo ${validaciones.min}` });
          if (validaciones.max !== undefined) fieldSchema = fieldSchema.refine(val => val === undefined || val <= validaciones.max, { message: `Máximo ${validaciones.max}` });
          break;
        case 'SELECT':
        case 'RADIO':
          if (campo.requerido) {
            fieldSchema = z.string().min(1, 'Seleccione una opción');
          } else {
            fieldSchema = z.string().optional().or(z.literal(''));
          }
          break;
        case 'MULTISELECT':
          fieldSchema = z.array(z.string()).optional().default([]);
          if (campo.requerido) {
            fieldSchema = fieldSchema.refine(val => val && val.length > 0, { message: 'Seleccione al menos una opción' });
          }
          break;
        case 'BOOLEAN':
          fieldSchema = z.boolean().optional().default(false);
          break;
        case 'DATE':
          if (campo.requerido) {
            fieldSchema = z.string().min(1, 'La fecha es obligatoria');
          } else {
            fieldSchema = z.string().optional().or(z.literal(''));
          }
          break;
        case 'FILE':
          fieldSchema = z.any().optional();
          break;
        case 'TEXTAREA':
        case 'TEXT':
        default:
          if (campo.requerido) {
            fieldSchema = z.string().min(1, 'Este campo es requerido');
          } else {
            fieldSchema = z.string().optional().or(z.literal(''));
          }
          if (validaciones.minLength !== undefined) fieldSchema = fieldSchema.refine(val => !val || val.length >= validaciones.minLength, { message: `Mínimo ${validaciones.minLength} caracteres` });
          if (validaciones.maxLength !== undefined) fieldSchema = fieldSchema.refine(val => !val || val.length <= validaciones.maxLength, { message: `Máximo ${validaciones.maxLength} caracteres` });
          if (validaciones.regex) fieldSchema = fieldSchema.refine(val => !val || new RegExp(validaciones.regex).test(val), { message: 'Formato no cumple con la regla de validación' });
          break;
      }

      shape[campo.clave] = fieldSchema;
    });

    return z.object(shape);
  }, [configCampos]);

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { ...defaultValues, ...initialData }
  });

  if (isLoadingConfig) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse space-y-4">
        <div className="h-4 bg-slate-800 rounded w-1/3"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-10 bg-slate-800 rounded"></div>
          <div className="h-10 bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (!configCampos?.length) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center text-slate-400 text-xs">
        No hay campos dinámicos activos configurados para el módulo <span className="font-mono text-cyan-400 font-bold">"{moduleName}"</span>.
      </div>
    );
  }

  const sortedCampos = [...configCampos].sort((a, b) => (a.orden || 0) - (b.orden || 0));

  const handleFormSubmit = (data) => {
    if (onSubmit) onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sortedCampos.map((campo) => {
          const hasError = !!errors[campo.clave];
          const isWide = campo.tipo === 'TEXTAREA' || campo.tipo === 'MULTISELECT';

          return (
            <div 
              key={campo.clave} 
              className={clsx("flex flex-col", isWide ? 'sm:col-span-2' : '')}
            >
              <label className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
                <span>
                  {campo.etiqueta}{' '}
                  {campo.requerido && <span className="text-rose-400">*</span>}
                </span>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  {campo.clave}
                </span>
              </label>

              {/* INPUT TYPES */}
              {campo.tipo === 'TEXT' || campo.tipo === 'DATE' || campo.tipo === 'NUMBER' ? (
                <div className="relative rounded-xl shadow-inner">
                  <input
                    type={campo.tipo === 'DATE' ? 'date' : campo.tipo === 'NUMBER' ? 'number' : 'text'}
                    disabled={isReadOnly}
                    {...register(campo.clave)}
                    className={clsx(
                      "w-full rounded-xl bg-[#070b14] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 border transition-all duration-200 outline-none",
                      hasError 
                        ? "border-rose-500/80 focus:ring-2 focus:ring-rose-500/20" 
                        : "border-slate-800 focus:border-cyan-500/80 focus:ring-2 focus:ring-cyan-500/20",
                      isReadOnly && "opacity-60 cursor-not-allowed"
                    )}
                    placeholder={campo.tipo === 'NUMBER' ? '0' : `Ingrese ${campo.etiqueta.toLowerCase()}...`}
                  />
                </div>
              ) : campo.tipo === 'TEXTAREA' ? (
                <textarea
                  disabled={isReadOnly}
                  {...register(campo.clave)}
                  rows={3}
                  className={clsx(
                    "w-full rounded-xl bg-[#070b14] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 border transition-all duration-200 outline-none resize-y",
                    hasError 
                      ? "border-rose-500/80 focus:ring-2 focus:ring-rose-500/20" 
                      : "border-slate-800 focus:border-cyan-500/80 focus:ring-2 focus:ring-cyan-500/20",
                    isReadOnly && "opacity-60 cursor-not-allowed"
                  )}
                  placeholder={`Detalles de ${campo.etiqueta.toLowerCase()}...`}
                />
              ) : campo.tipo === 'SELECT' ? (
                <div className="relative">
                  <select
                    disabled={isReadOnly}
                    {...register(campo.clave)}
                    className={clsx(
                      "w-full rounded-xl bg-[#070b14] px-3.5 py-2.5 text-xs text-white border transition-all duration-200 outline-none appearance-none cursor-pointer",
                      hasError 
                        ? "border-rose-500/80 focus:ring-2 focus:ring-rose-500/20" 
                        : "border-slate-800 focus:border-cyan-500/80 focus:ring-2 focus:ring-cyan-500/20",
                      isReadOnly && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    <option value="" className="bg-slate-900 text-slate-400">Seleccione una opción...</option>
                    {campo.opciones?.map((opt, i) => (
                      <option key={i} value={opt} className="bg-slate-900 text-white">{opt}</option>
                    ))}
                  </select>
                </div>
              ) : campo.tipo === 'RADIO' ? (
                <div className="flex flex-wrap gap-2.5 mt-1">
                  {campo.opciones?.map((opt, i) => (
                    <label 
                      key={i} 
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 cursor-pointer text-xs text-slate-200"
                    >
                      <input
                        type="radio"
                        value={opt}
                        disabled={isReadOnly}
                        {...register(campo.clave)}
                        className="text-cyan-500 focus:ring-cyan-500 bg-slate-800 border-slate-700"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              ) : campo.tipo === 'BOOLEAN' ? (
                <label className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    disabled={isReadOnly}
                    {...register(campo.clave)}
                    className="h-4 w-4 rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-xs text-slate-200 font-medium">Habilitado / Verificado</span>
                </label>
              ) : campo.tipo === 'MULTISELECT' ? (
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800 mt-1">
                  {campo.opciones?.map((opt, i) => (
                    <label key={i} className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        value={opt}
                        disabled={isReadOnly}
                        {...register(campo.clave)}
                        className="h-3.5 w-3.5 rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-cyan-500"
                      />
                      <span className="truncate">{opt}</span>
                    </label>
                  ))}
                </div>
              ) : campo.tipo === 'FILE' ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-dashed border-slate-700 hover:border-cyan-500/50 cursor-pointer transition-colors">
                  <Upload className="h-5 w-5 text-cyan-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-300">Adjuntar archivo o fotografía</p>
                    <p className="text-[10px] text-slate-500">PNG, JPG, PDF hasta 10MB</p>
                  </div>
                  <input 
                    type="file" 
                    disabled={isReadOnly}
                    {...register(campo.clave)}
                    className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30"
                  />
                </div>
              ) : null}

              {/* Validation Error Message */}
              {hasError && (
                <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>{errors[campo.clave]?.message || 'Valor inválido'}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>

      {!isReadOnly && onSubmit && (
        <div className="pt-3 flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Guardar Datos Dinámicos</span>
              </>
            )}
          </button>
        </div>
      )}
    </form>
  );
}
