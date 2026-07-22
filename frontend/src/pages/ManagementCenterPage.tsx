/**
 * PM-42 — Workspace de Gerencia (solo indicadores, sin CTAs operativos).
 */
import { EnterpriseWorkspace } from '../components/workspace/EnterpriseWorkspace';

export function ManagementCenterPage() {
  return <EnterpriseWorkspace forceRole="executive" />;
}
