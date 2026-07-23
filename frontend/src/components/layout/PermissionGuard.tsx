import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useExperienceCenterOptional } from '../../context/ExperienceCenterContext';
import { isPathAllowedForPackage } from '../../config/packageAccess';
import { resolveRoutePermission } from '../../config/routePermissions';

export function PermissionGuard({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { hasPermission } = useAuth();
  const experience = useExperienceCenterOptional();
  const packageId = experience?.packageId ?? 'coop-cafe-co';
  const enabledModules = experience?.enabledModules ?? [];

  if (!isPathAllowedForPackage(pathname, packageId, enabledModules)) {
    return (
      <div className="page-forbidden" role="alert">
        <div className="alert alert-error">
          Esta función no está incluida en el paquete contratado.
        </div>
        <p className="text-muted">
          El paquete de su empresa no incluye esta sección. Un administrador puede ajustar el alcance
          en{' '}
          <Link to="/implementacion/modulos">Implementación → Paquete</Link>.
        </p>
        <Link to="/" className="btn">
          Volver al inicio
        </Link>
      </div>
    );
  }

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
