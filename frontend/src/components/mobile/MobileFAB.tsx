import { useNavigate } from 'react-router-dom';
import { useMobile } from '../../context/MobileContext';
import { getQuickActionsForRole } from '../../config/widgetRegistry';
import { useNavigation } from '../../context/NavigationContext';

export function MobileFAB() {
  const { isMobile, setCaptureOpen } = useMobile();
  const { dashboardRole } = useNavigation();
  const navigate = useNavigate();
  const actions = getQuickActionsForRole(dashboardRole);
  const primary = actions[0];

  if (!isMobile || !primary) return null;

  return (
    <button
      type="button"
      className="mobile-fab"
      aria-label={primary.label}
      onClick={() => {
        if (primary.to.startsWith('#')) setCaptureOpen(true);
        else navigate(primary.to);
      }}
    >
      <span aria-hidden>{primary.icon}</span>
    </button>
  );
}
