import { WorkspaceToolbar } from './WorkspaceToolbar';
import { DashboardGrid } from './DashboardGrid';

export function DashboardWorkspace() {
  return (
    <div className="ws-workspace">
      <WorkspaceToolbar />
      <DashboardGrid />
    </div>
  );
}
