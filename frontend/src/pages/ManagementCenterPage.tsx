/**
 * PM-44 — Gerencia: Dashboard Inteligente (indicadores / riesgos).
 */
import { SmartDashboard } from '../components/dashboard/SmartDashboard';

export function ManagementCenterPage() {
  return <SmartDashboard forceRole="executive" />;
}
