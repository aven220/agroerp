import { useAuth } from '../context/AuthContext';
import { useMobileOptional } from '../context/MobileContext';
import { MobileHome } from '../components/mobile/MobileHome';
import { Header } from '../components/layout/Header';
import { DashboardWorkspace } from '../components/dashboard/DashboardWorkspace';
import { ROLE_LABELS } from '../config/widgetRegistry';
import { useWorkspace } from '../context/WorkspaceContext';

export function DashboardPage() {
  const { user } = useAuth();
  const { dashboardRole } = useWorkspace();
  const mobile = useMobileOptional();

  if (mobile?.isMobile) {
    return <MobileHome />;
  }

  return (
    <>
      <Header
        title="Inicio"
        subtitle={`Workspace · ${ROLE_LABELS[dashboardRole]} · ${user?.firstName ?? ''}`}
      />
      <DashboardWorkspace />
    </>
  );
}
