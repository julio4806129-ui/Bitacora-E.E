import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  Bus, 
  Lock, 
  User, 
  KeyRound, 
  ShieldCheck, 
  ArrowRight, 
  Radio, 
  Sparkles,
  Shield,
  Activity,
  CheckCircle2
} from 'lucide-react';

export default function LoginPage() {
  const [loginMode, setLoginMode] = useState('codigo'); // 'codigo' | 'credenciales'
  const [codigo, setCodigo] = useState('');
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginByCodigo } = useAuth();
  const navigate = useNavigate();

  const handleCodigoSubmit = async (e) => {
    e.preventDefault();
    if (!codigo.trim() || !pin.trim()) {
      setError('Por favor ingrese su código de empleado y PIN/contraseña.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      await loginByCodigo(codigo.trim(), pin.trim());
      navigate('/');
    } catch (err) {
      const msg = err?.response?.data?.error || '';
      setError(msg || 'Código o PIN/contraseña incorrectos. Verifique sus credenciales.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCredencialesSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor complete todos los campos requeridos.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      await login(username.trim(), password.trim());
      navigate('/');
    } catch (err) {
      setError('Credenciales no válidas. Verifique su usuario y contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col justify-center relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background Decorative Mesh Gradients */}
      <div className="absolute -top-48 -right-48 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-48 -left-48 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3.5 bg-white rounded-3xl shadow-2xl shadow-cyan-500/20 ring-4 ring-cyan-500/20 flex items-center justify-center">
            <img 
              src="/logo-mibus.png" 
              alt="MiBus Panamá" 
              className="h-16 w-16 object-contain" 
            />
          </div>
        </div>
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0b1329] border border-cyan-500/30 mb-3 shadow-inner">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-mono font-bold text-cyan-300 tracking-wider uppercase">
            Plataforma Enterprise v2.5
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          BITÁCORA E.E.
        </h1>
        <p className="mt-1 text-xs text-slate-400 font-medium">
          Equipamiento Embarcado & Telemetría Satelital de Flota · MiBus
        </p>
      </div>

      {/* Login Card */}
      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-[#0b1329]/95 backdrop-blur-2xl py-8 px-6 sm:px-9 shadow-2xl rounded-2xl border border-slate-800 ring-1 ring-white/10">
          
          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-[#070b14] p-1 mb-6 border border-slate-800">
            <button
              type="button"
              onClick={() => { setLoginMode('codigo'); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                loginMode === 'codigo'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Código Técnico
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('credenciales'); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                loginMode === 'credenciales'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Administración
            </button>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl mb-5 flex items-start gap-2.5 animate-fadeIn">
              <ShieldCheck className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-rose-300 leading-snug">{error}</p>
            </div>
          )}

          {loginMode === 'codigo' ? (
            <form className="space-y-4" onSubmit={handleCodigoSubmit}>
              <div>
                <label htmlFor="codigo" className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Código de Técnico Autorizado
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <KeyRound className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    id="codigo"
                    name="codigo"
                    type="text"
                    required
                    autoFocus
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 bg-[#070b14] border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 transition-all font-mono font-bold"
                    placeholder="Ej. TEC-001"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="pin" className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  PIN / Contraseña
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    id="pin"
                    name="pin"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 bg-[#070b14] border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 transition-all"
                    placeholder="Tu PIN o contraseña"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 focus:outline-none disabled:opacity-50 transition-all cursor-pointer mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Autenticando...</span>
                  </span>
                ) : (
                  <>
                    <span>Entrar a la Mesa de Bitácora</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleCredencialesSubmit}>
              <div>
                <label htmlFor="username" className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Usuario Administrador
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 bg-[#070b14] border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 transition-all"
                    placeholder="admin o usuario corporativo"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Contraseña de Acceso
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 bg-[#070b14] border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 transition-all"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 focus:outline-none disabled:opacity-50 transition-all cursor-pointer mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Verificando credenciales...</span>
                  </span>
                ) : (
                  <span>Iniciar Sesión Administrativa</span>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3 text-cyan-400" />
              Sesión Segura JWT
            </span>
            <span>MiBus Panamá · 2026</span>
          </div>

        </div>
      </div>
    </div>
  );
}
