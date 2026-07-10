import { Navigate } from 'react-router-dom';
import { useMobileOptional } from '../context/MobileContext';
import { useExperienceCenterOptional } from '../context/ExperienceCenterContext';
import { MobileHome } from '../components/mobile/MobileHome';
import { Header } from '../components/layout/Header';
import { PageLayout, PageHeader } from '../components/page';
import { DashboardWorkspace } from '../components/dashboard/DashboardWorkspace';

/**
 * PM-25 — Inicio redirige al home del centro activo.
 * El workspace clásico permanece accesible en /inicio-workspace.
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

  return (
    <>
      <Header title="Inicio" subtitle="Centro de trabajo" />
      <DashboardWorkspace />
    </>
  );
}

/** Workspace clásico (widgets) — acceso directo si se necesita */
export function WorkspaceHomePage() {
  return (
    <PageLayout>
      <PageHeader title="Inicio" subtitle="Centro de trabajo" />
      <DashboardWorkspace />
    </PageLayout>
  );
}
