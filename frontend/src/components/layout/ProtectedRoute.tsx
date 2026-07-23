import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AppLayout } from './AppLayout';
import { PageLoader } from '../ux/LoadingState';
import { PermissionGuard } from './PermissionGuard';

/**
 * PM-50 — Ruta protegida sin banners permanentes de tips/adaptación.
 * La ayuda se solicita desde Preferencias, Centro de ayuda o ⌘K.
 */
function PageContent() {
  return (
    <div className="erp-content-inner">
      <PermissionGuard>
        <Outlet />
      </PermissionGuard>
    </div>
  );
}

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader message="Iniciando AGROERP…" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppLayout>
      <PageContent />
    </AppLayout>
  );
}
