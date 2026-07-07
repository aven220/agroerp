import { useNavigate } from 'react-router-dom';
import type { UreQuickAction } from '../types';

interface QuickActionsWidgetProps {
  actions: UreQuickAction[];
}

export function QuickActionsWidget({ actions }: QuickActionsWidgetProps) {
  const navigate = useNavigate();

  if (actions.length === 0) return null;

  function handleAction(action: UreQuickAction) {
    if (!action.href) return;
    if (action.action === 'scroll') {
      const anchor = action.href.replace(/^#/, '');
      document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (action.action === 'navigate') {
      navigate(action.href);
    }
  }

  return (
    <div className="ure-quick-actions">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className={`btn ${action.variant === 'primary' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => handleAction(action)}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
