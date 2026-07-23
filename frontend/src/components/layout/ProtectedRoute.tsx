import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AppLayout } from './AppLayout';
import { PageLoader } from '../ux/LoadingState';
import { ContextualHints } from '../smart-assistant/RecommendationCenter';
import { useSmartAssistantOptional } from '../../context/SmartAssistantProvider';
import { useAdaptiveWorkspaceOptional } from '../../context/AdaptiveWorkspaceProvider';
import { useUserPreferencesOptional } from '../../context/UserPreferencesContext';
import { AdaptiveWorkspaceBanner } from '../adaptive-workspace/AdaptiveToolbar';
import { PermissionGuard } from './PermissionGuard';

function PageWithHints() {
  const assistant = useSmartAssistantOptional();
  const adaptive = useAdaptiveWorkspaceOptional();
  const prefs = useUserPreferencesOptional();
  const focusMode = adaptive?.focusMode ?? false;
  const assistantEnabled = prefs?.assistantEnabled ?? false;
  const tipsEnabled = prefs?.tipsEnabled ?? false;

  return (
    <div className="erp-content-inner">
      {adaptive ? <AdaptiveWorkspaceBanner /> : null}
      {assistantEnabled && tipsEnabled && assistant && !focusMode ? <ContextualHints /> : null}
      <PermissionGuard>
        <Outlet />
      </PermissionGuard>
    </div>
  );
}

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader message="Iniciando AGROERP…" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppLayout>
      <PageWithHints />
    </AppLayout>
  );
}
