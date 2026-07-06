import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AppLayout } from './AppLayout';
import { PageLoader } from '../ux/LoadingState';

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
      <div className="erp-content-inner">
        <Outlet />
      </div>
    </AppLayout>
  );
}
