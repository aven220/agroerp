import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { resolveRoutePermission } from '../../config/routePermissions';

export function PermissionGuard({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { hasPermission } = useAuth();
  const required = resolveRoutePermission(pathname);

  if (!required || hasPermission(required)) {
    return <>{children}</>;
  }

  return (
    <div className="page-forbidden" role="alert">
      <div className="alert alert-error">
        No tiene permiso para acceder a esta sección.
      </div>
      <p className="text-muted">
        Se requiere el permiso <code>{required}</code>.
      </p>
      <Link to="/" className="btn">
        Volver al inicio
      </Link>
    </div>
  );
}
