import { Navigate } from 'react-router-dom';
import { useMobileOptional } from '../context/MobileContext';
import { useExperienceCenterOptional } from '../context/ExperienceCenterContext';
import { MobileHome } from '../components/mobile/MobileHome';
import { SmartDashboard } from '../components/dashboard/SmartDashboard';

/**
 * PM-46 — Inicio redirige al home del centro activo.
 * Sin workspace legado ni dashboards puente.
 */
export function DashboardPage() {
  const mobile = useMobileOptional();
  const experience = useExperienceCenterOptional();

  if (mobile?.isMobile) {
    return <MobileHome />;
  }

  if (experience?.centerMeta?.homePath) {
    return <Navigate to={experience.centerMeta.homePath} replace />;
  }

  return <SmartDashboard />;
}

/** PM-46 — Pantalla puente eliminada: redirige a Inicio */
export function WorkspaceHomePage() {
  return <Navigate to="/operacion" replace />;
}
