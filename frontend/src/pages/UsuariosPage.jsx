import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ShieldAlert, 
  X, 
  Users, 
  UserCheck, 
  UserX, 
  Shield, 
  KeyRound, 
  MapPin, 
  Activity, 
  Search, 
  AlertTriangle,
  Power
} from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../hooks/useAuth';

const PATIOS_LIST = [
  'Patio La Cabima',
  'Patio Chorrillo',
  'Patio Curundu',
  'Patio La Dona',
  'Patio Los Pueblos',
  'Patio Ojo de Agua',
  'Patio 24 de Diciembre'
];

export default function UsuariosPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'inactive'
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const res = await apiClient.get('/usuarios/');
      return Array.isArray(res) ? res : (res?.results || res?.data || []);
    },
  });

  const mutation = useMutation({
    mutationFn: (data) => {
      if (data.id) {
        return apiClient.put(`/usuarios/${data.id}/`, data);
      }
      return apiClient.post('/usuarios/', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['usuarios']);
      setIsModalOpen(false);
      setSelectedUser(null);
    },
    onError: (err) => {
      alert(`Error al guardar usuario: ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/usuarios/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries(['usuarios']);
      setUserToDelete(null);
    },
    onError: (err) => {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || err.message;
      alert(`Error al eliminar usuario: ${errorMsg}`);
      setUserToDelete(null);
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/usuarios/${id}/toggle_active/`),
    onSuccess: () => {
      queryClient.invalidateQueries(['usuarios']);
    },
    onError: (err) => {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || err.message;
      alert(`Error al cambiar estado: ${errorMsg}`);
    }
  });

  const handleEdit = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = (user) => {
    setUserToDelete(user);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteMutation.mutate(userToDelete.id);
    }
  };

  const handleToggleActive = (user) => {
    toggleActiveMutation.mutate(user.id);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const rol = formData.get('rol');
    const pwd = formData.get('password');
    const data = {
      username: formData.get('username'),
      codigo_empleado: formData.get('codigo_empleado'),
      first_name: formData.get('nombre') || '',
      patio_asignado: formData.get('patio_asignado') || '',
      es_admin: rol === 'admin',
      cuota_diaria: parseInt(formData.get('cuota_diaria') || '20', 10),
      is_active: formData.get('is_active') === 'on',
    };
    if (selectedUser) data.id = selectedUser.id;
    if (pwd) {
      data.password = pwd;
      data.password_confirmation = pwd;
    }
    mutation.mutate(data);
  };

  const rawList = Array.isArray(usuarios) ? usuarios : [];
  const filteredList = rawList.filter(u => {
    // Filter by status
    if (filterStatus === 'active' && u.is_active === false) return false;
    if (filterStatus === 'inactive' && u.is_active !== false) return false;
    // Filter by search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const code = (u.codigo_empleado || '').toLowerCase();
      const name = (u.first_name || u.nombre || '').toLowerCase();
      const username = (u.username || '').toLowerCase();
      const patio = (u.patio_asignado || '').toLowerCase();
      return code.includes(term) || name.includes(term) || username.includes(term) || patio.includes(term);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0f172a]/70 backdrop-blur-md p-5 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Users className="h-6 w-6 text-cyan-400" />
            Gestión de Técnicos y Personal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Administración de cuentas, roles de acceso, patios asignados y cuotas de turno
          </p>
        </div>
        <button
          onClick={() => { setSelectedUser(null); setIsModalOpen(true); }}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
        >
          <Plus className="h-4 w-4" />
          Nuevo Usuario
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-[#0f172a]/80 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Registrados</p>
            <p className="text-2xl font-black text-white mt-1">{rawList.length}</p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 bg-[#0f172a]/80 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Usuarios Activos</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              {rawList.filter(u => u.is_active !== false).length}
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 bg-[#0f172a]/80 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Administradores</p>
            <p className="text-2xl font-black text-purple-400 mt-1">
              {rawList.filter(u => u.es_admin || u.rol === 'admin').length}
            </p>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
            <Shield className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-[#0f172a]/60 backdrop-blur-md p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código, nombre, usuario o patio..."
            className="w-full pl-9 pr-4 py-2 bg-[#070b14] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all font-sans"
          />
        </div>

        <div className="flex items-center gap-1.5 self-center">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterStatus === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white bg-[#070b14] border border-slate-800'
            }`}
          >
            Todos ({rawList.length})
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterStatus === 'active'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white bg-[#070b14] border border-slate-800'
            }`}
          >
            Activos ({rawList.filter(u => u.is_active !== false).length})
          </button>
          <button
            onClick={() => setFilterStatus('inactive')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterStatus === 'inactive'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white bg-[#070b14] border border-slate-800'
            }`}
          >
            Inactivos ({rawList.filter(u => u.is_active === false).length})
          </button>
        </div>
      </div>

      {/* Tabla Usuarios */}
      <div className="bg-[#0f172a]/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#070b14] border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Código</th>
                <th className="py-3.5 px-4">Nombre / Usuario</th>
                <th className="py-3.5 px-4">Patio Asignado</th>
                <th className="py-3.5 px-4">Rol en Sistema</th>
                <th className="py-3.5 px-4">Cuota Turno</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoading ? (
                <tr><td colSpan="7" className="py-12 text-center text-slate-500">Cargando personal...</td></tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    {searchTerm ? 'No se encontraron usuarios que coincidan con la búsqueda.' : 'No hay usuarios registrados con este filtro.'}
                  </td>
                </tr>
              ) : (
                filteredList.map((user) => {
                  const isSelf = currentUser?.id === user.id || currentUser?.username === user.username;
                  const isActive = user.is_active !== false;

                  return (
                    <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                        {user.codigo_empleado || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-bold text-white flex items-center gap-1.5">
                              <span>{user.first_name ? `${user.first_name} ${user.last_name || ''}` : (user.nombre || user.username)}</span>
                              {isSelf && (
                                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">
                                  Tú
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          <span>{user.patio_asignado || 'Sin asignar'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          user.es_admin || user.rol === 'admin'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                            : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                        }`}>
                          {user.es_admin || user.rol === 'admin' ? 'Administrador' : 'Técnico'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {user.cuota_diaria || 20} buses / turno
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleActive(user)}
                          disabled={toggleActiveMutation.isPending}
                          title={isActive ? 'Click para desactivar' : 'Click para activar'}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                          <span>{isActive ? 'Activo' : 'Inactivo'}</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 rounded-lg transition-colors"
                            title="Editar usuario"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(user)}
                            disabled={isSelf}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isSelf
                                ? 'bg-slate-900 text-slate-600 cursor-not-allowed'
                                : 'bg-slate-800 hover:bg-rose-600/20 text-slate-400 hover:text-rose-400 hover:border-rose-500/30'
                            }`}
                            title={isSelf ? 'No puedes eliminar tu propia cuenta' : 'Eliminar usuario'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal CRUD Usuario */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan-400" />
                {selectedUser ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Código de Empleado</label>
                  <input
                    type="text"
                    name="codigo_empleado"
                    required
                    defaultValue={selectedUser?.codigo_empleado || ''}
                    placeholder="Ej. 13283"
                    className="w-full px-3 py-2 bg-[#0b1329] border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Nombre de Usuario (@username)</label>
                  <input
                    type="text"
                    name="username"
                    required
                    defaultValue={selectedUser?.username || ''}
                    placeholder="Ej. jperez"
                    className="w-full px-3 py-2 bg-[#0b1329] border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  name="nombre"
                  defaultValue={selectedUser?.first_name || selectedUser?.nombre || ''}
                  placeholder="Ej. Juan Pérez"
                  className="w-full px-3 py-2 bg-[#0b1329] border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Rol en Sistema</label>
                  <select
                    name="rol"
                    defaultValue={selectedUser?.es_admin ? 'admin' : 'tecnico'}
                    className="w-full px-3 py-2 bg-[#0b1329] border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="tecnico">Técnico Operativo</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Cuota Diaria (Buses)</label>
                  <input
                    type="number"
                    name="cuota_diaria"
                    defaultValue={selectedUser?.cuota_diaria || 20}
                    className="w-full px-3 py-2 bg-[#0b1329] border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Patio Asignado (Cruce Genesis)</label>
                <select
                  name="patio_asignado"
                  defaultValue={selectedUser?.patio_asignado || 'Patio Curundu'}
                  className="w-full px-3 py-2 bg-[#0b1329] border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Sin patio asignado</option>
                  {PATIOS_LIST.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Contraseña {selectedUser && '(Dejar en blanco para no modificar)'}
                </label>
                <input
                  type="password"
                  name="password"
                  required={!selectedUser}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-[#0b1329] border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  defaultChecked={selectedUser ? selectedUser.is_active : true}
                  className="rounded bg-[#0b1329] border-slate-800 text-cyan-500 focus:ring-0"
                />
                <label htmlFor="is_active" className="text-xs text-slate-300 font-medium">
                  Usuario Activo en el Sistema
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {mutation.isPending ? 'Guardando...' : 'Guardar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Eliminación */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#0f172a] border border-rose-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">¿Eliminar este Usuario?</h3>
                <p className="text-xs text-slate-400">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <div className="bg-[#070b14] border border-slate-800 rounded-xl p-3.5 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Usuario:</span>
                <span className="font-bold text-white font-mono">@{userToDelete.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nombre:</span>
                <span className="font-medium text-slate-200">
                  {userToDelete.first_name ? `${userToDelete.first_name} ${userToDelete.last_name || ''}` : (userToDelete.nombre || '—')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Código:</span>
                <span className="font-bold text-cyan-400 font-mono">{userToDelete.codigo_empleado || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Rol:</span>
                <span className="font-semibold text-slate-300 uppercase text-[10px]">
                  {userToDelete.es_admin || userToDelete.rol === 'admin' ? 'Administrador' : 'Técnico'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              El usuario será eliminado permanentemente del sistema de bitácora y no podrá iniciar sesión.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50"
              >
                {deleteMutation.isPending ? (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Eliminar Definitivamente</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
