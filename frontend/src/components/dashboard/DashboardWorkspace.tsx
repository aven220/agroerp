import { DashboardWelcome } from './DashboardWelcome';
import { WorkspaceToolbar } from './WorkspaceToolbar';
import { DashboardGrid } from './DashboardGrid';

export function DashboardWorkspace() {
  return (
    <div className="ws-workspace">
      <DashboardWelcome />
      <WorkspaceToolbar />
      <DashboardGrid />
    </div>
  );
}
