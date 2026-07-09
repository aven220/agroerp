import { useMobileOptional } from '../context/MobileContext';
import { MobileHome } from '../components/mobile/MobileHome';
import { Header } from '../components/layout/Header';
import { DashboardWorkspace } from '../components/dashboard/DashboardWorkspace';

export function DashboardPage() {
  const mobile = useMobileOptional();

  if (mobile?.isMobile) {
    return <MobileHome />;
  }

  return (
    <>
      <Header title="Inicio" subtitle="Centro de trabajo" />
      <DashboardWorkspace />
    </>
  );
}
