import { useNavigate } from 'react-router-dom';
import { useMobile } from '../../context/MobileContext';
import { getQuickActionsForRole } from '../../config/widgetRegistry';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import { useAdaptiveWorkspaceOptional } from '../../context/AdaptiveWorkspaceProvider';

export function MobileFAB() {
  const { isMobile, setCaptureOpen } = useMobile();
  const { dashboardRole } = useNavigation();
  const { hasPermission } = useAuth();
  const adaptive = useAdaptiveWorkspaceOptional();
  const navigate = useNavigate();
  const actions = adaptive?.prefs.adaptiveEnabled
    ? adaptive.adaptiveQuickActions
    : getQuickActionsForRole(dashboardRole, hasPermission);
  const primary = actions[0];

  if (!isMobile || !primary) return null;

  return (
    <button
      type="button"
      className="mobile-fab"
      aria-label={primary.label}
      onClick={() => {
        if (primary.to.startsWith('#')) setCaptureOpen(true);
        else {
          adaptive?.recordQuickAction(primary.id);
          navigate(primary.to);
        }
      }}
    >
      <span aria-hidden>{primary.icon}</span>
    </button>
  );
}
