import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BitacoraPage from './pages/BitacoraPage';
import HistorialPage from './pages/HistorialPage';
import ReportesPage from './pages/ReportesPage';
import SchemaEditorPage from './pages/SchemaEditorPage';
import EEMovilesPage from './pages/EEMovilesPage';
import GenesisPage from './pages/GenesisPage';
import BusaePage from './pages/BusaePage';
import UsuariosPage from './pages/UsuariosPage';
import InventarioPage from './pages/InventarioPage';
import ConfiguracionPage from './pages/ConfiguracionPage';
import AdminDashboard from './pages/AdminDashboard';
import AuditoriaPage from './pages/AuditoriaPage';
import InventarioEquiposPage from './pages/InventarioEquiposPage';
import UnidadesFueraServicioPage from './pages/UnidadesFueraServicioPage';
import MantenimientoPredictivoPage from './pages/MantenimientoPredictivoPage';
import CatalogoComponentesPage from './pages/CatalogoComponentesPage';
import ErrorBoundary from './components/ErrorBoundary';


const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    // Redirigir técnicos a Bitácora si intentan acceder a módulos de administración
    return <Navigate to="/bitacora" replace />;
  }

  return children;
};

function App() {
  return (
    <ErrorBoundary>
      <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* ── Módulos disponibles para TODOS los usuarios autenticados ── */}
        <Route index element={<DashboardPage />} />
        <Route path="bitacora" element={<BitacoraPage />} />
        <Route path="historial" element={<HistorialPage />} />

        {/* ── Módulos exclusivos de ADMINISTRADOR ── */}
        <Route
          path="ee-moviles"
          element={
            <ProtectedRoute requireAdmin>
              <EEMovilesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventario"
          element={
            <ProtectedRoute requireAdmin>
              <InventarioPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="genesis"
          element={
            <ProtectedRoute requireAdmin>
              <GenesisPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="busae"
          element={
            <ProtectedRoute requireAdmin>
              <BusaePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="reportes"
          element={
            <ProtectedRoute requireAdmin>
              <ReportesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="schema-editor"
          element={
            <ProtectedRoute requireAdmin>
              <SchemaEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="usuarios"
          element={
            <ProtectedRoute requireAdmin>
              <UsuariosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="configuracion"
          element={
            <ProtectedRoute requireAdmin>
              <ConfiguracionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="auditoria"
          element={
            <ProtectedRoute requireAdmin>
              <AuditoriaPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/control"
          element={
            <ProtectedRoute requireAdmin>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventario-equipos"
          element={
            <ProtectedRoute requireAdmin>
              <InventarioEquiposPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="fuera-servicio"
          element={
            <ProtectedRoute requireAdmin>
              <UnidadesFueraServicioPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="mantenimiento-predictivo"
          element={
            <ProtectedRoute requireAdmin>
              <MantenimientoPredictivoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="catalogo-componentes"
          element={
            <ProtectedRoute requireAdmin>
              <CatalogoComponentesPage />
            </ProtectedRoute>
          }
        />

      </Route>
    </Routes>
    </ErrorBoundary>
  );
}

export default App;
