import React, { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import apiClient from '../api/client';
import clsx from 'clsx';
import { AlertCircle, Upload } from 'lucide-react';

export default function DynamicFormRenderer({
  moduleName,
  initialData = {},
  onSubmit,
  onChange,
  isLoading = false,
  defaultValues = {},
  isReadOnly = false,
  hideSubmit = false,
  customCampos = null,
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
    enabled: !customCampos && !!moduleName,
  });

  const configCampos = customCampos || fetchedCampos || [];

  const schema = useMemo(() => {
    if (!configCampos?.length) return z.object({});
    const shape = {};
    configCampos.forEach((campo) => {
      let fieldSchema;
      const validaciones = campo.validaciones || {};
      switch (campo.tipo) {
        case 'NUMBER':
          fieldSchema = campo.requerido
            ? z.preprocess((v) => (v === '' || v == null ? NaN : Number(v)), z.number({ invalid_type_error: 'Número válido requerido' }))
            : z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().optional());
          break;
        case 'SELECT':
        case 'RADIO':
          fieldSchema = campo.requerido ? z.string().min(1, 'Seleccione una opción') : z.string().optional().or(z.literal(''));
          break;
        case 'MULTISELECT':
          fieldSchema = z.array(z.string()).optional().default([]);
          if (campo.requerido) fieldSchema = fieldSchema.refine((v) => v?.length > 0, { message: 'Seleccione al menos una opción' });
          break;
        case 'BOOLEAN':
          fieldSchema = z.boolean().optional().default(false);
          break;
        case 'DATE':
          fieldSchema = campo.requerido ? z.string().min(1, 'Fecha obligatoria') : z.string().optional().or(z.literal(''));
          break;
        case 'FILE':
          fieldSchema = z.any().optional();
          break;
        default:
          fieldSchema = campo.requerido ? z.string().min(1, 'Campo requerido') : z.string().optional().or(z.literal(''));
          if (validaciones.maxLength != null) {
            fieldSchema = fieldSchema.refine((v) => !v || v.length <= validaciones.maxLength, { message: `Máx. ${validaciones.maxLength}` });
          }
      }
      shape[campo.clave] = fieldSchema;
    });
    return z.object(shape);
  }, [configCampos]);

  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { ...defaultValues, ...initialData },
    mode: 'onChange',
  });

  const watched = watch();
  useEffect(() => {
    if (onChange && typeof onChange === 'function') onChange(watched);
  }, [watched]);

  if (isLoadingConfig) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-slate-800/60" />
        ))}
      </div>
    );
  }

  if (!configCampos?.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-6 text-center">
        <p className="text-xs text-slate-400">
          Sin campos configurados para <span className="font-mono text-cyan-400">"{moduleName}"</span>.
        </p>
        <p className="text-[10px] text-slate-500 mt-1">Configúralos en Schema Editor · módulo bitácora</p>
      </div>
    );
  }

  const sorted = [...configCampos].sort((a, b) => (a.orden || 0) - (b.orden || 0));

  return (
    <form onSubmit={handleSubmit((d) => onSubmit?.(d))} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sorted.map((campo) => {
          const err = errors[campo.clave];
          const wide = campo.tipo === 'TEXTAREA' || campo.tipo === 'MULTISELECT';
          return (
            <div key={campo.clave} className={clsx('flex flex-col gap-1', wide && 'sm:col-span-2')}>
              <label className="text-[11px] font-semibold text-slate-300">
                {campo.etiqueta}
                {campo.requerido && <span className="text-rose-400 ml-0.5">*</span>}
              </label>

              {(campo.tipo === 'TEXT' || campo.tipo === 'DATE' || campo.tipo === 'NUMBER') && (
                <input
                  type={campo.tipo === 'DATE' ? 'date' : campo.tipo === 'NUMBER' ? 'number' : 'text'}
                  disabled={isReadOnly}
                  {...register(campo.clave)}
                  className={clsx(
                    'w-full rounded-lg bg-[#0a1020] border px-3 py-2 text-xs text-white outline-none transition',
                    err ? 'border-rose-500/70' : 'border-slate-700/80 focus:border-cyan-500/60'
                  )}
                  placeholder={campo.tipo === 'NUMBER' ? '0' : ''}
                />
              )}

              {campo.tipo === 'TEXTAREA' && (
                <textarea
                  disabled={isReadOnly}
                  rows={2}
                  {...register(campo.clave)}
                  className={clsx(
                    'w-full rounded-lg bg-[#0a1020] border px-3 py-2 text-xs text-white outline-none resize-none transition',
                    err ? 'border-rose-500/70' : 'border-slate-700/80 focus:border-cyan-500/60'
                  )}
                />
              )}

              {campo.tipo === 'SELECT' && (
                <select
                  disabled={isReadOnly}
                  {...register(campo.clave)}
                  className={clsx(
                    'w-full rounded-lg bg-[#0a1020] border px-3 py-2 text-xs text-white outline-none appearance-none transition',
                    err ? 'border-rose-500/70' : 'border-slate-700/80 focus:border-cyan-500/60'
                  )}
                >
                  <option value="">Seleccionar...</option>
                  {(campo.opciones || []).map((o, i) => (
                    <option key={i} value={o}>{o}</option>
                  ))}
                </select>
              )}

              {campo.tipo === 'RADIO' && (
                <div className="flex flex-wrap gap-2">
                  {(campo.opciones || []).map((o, i) => (
                    <label key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/70 border border-slate-700/60 text-xs text-slate-200 cursor-pointer">
                      <input type="radio" value={o} disabled={isReadOnly} {...register(campo.clave)} className="text-cyan-500" />
                      {o}
                    </label>
                  ))}
                </div>
              )}

              {campo.tipo === 'BOOLEAN' && (
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700/60 cursor-pointer">
                  <input type="checkbox" disabled={isReadOnly} {...register(campo.clave)} className="rounded text-cyan-500" />
                  <span className="text-xs text-slate-200">Sí / Verificado</span>
                </label>
              )}

              {campo.tipo === 'MULTISELECT' && (
                <div className="grid grid-cols-2 gap-1.5 p-2 rounded-lg bg-slate-900/50 border border-slate-700/60">
                  {(campo.opciones || []).map((o, i) => (
                    <label key={i} className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                      <input type="checkbox" value={o} disabled={isReadOnly} {...register(campo.clave)} className="rounded text-cyan-500" />
                      <span className="truncate">{o}</span>
                    </label>
                  ))}
                </div>
              )}

              {campo.tipo === 'FILE' && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-slate-600 bg-slate-900/40">
                  <Upload className="h-4 w-4 text-cyan-400 shrink-0" />
                  <input type="file" disabled={isReadOnly} {...register(campo.clave)} className="text-[10px] text-slate-400" />
                </div>
              )}

              {err && (
                <p className="text-[10px] text-rose-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {err.message || 'Inválido'}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {!isReadOnly && onSubmit && !hideSubmit && (
        <div className="flex justify-end pt-1">
          <button type="submit" disabled={isLoading} className="px-4 py-2 text-xs font-bold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50">
            Guardar campos
          </button>
        </div>
      )}
    </form>
  );
}
